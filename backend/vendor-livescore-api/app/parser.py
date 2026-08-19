import datetime as dt
import re
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from . import models

TEHRAN_TZ = ZoneInfo("Asia/Tehran")


def _compute_kickoff_datetime(kickoff_time_text: Optional[str]) -> Optional[dt.datetime]:
    """Best-effort: combine a displayed "HH:MM" kickoff time with today's date
    in Tehran time. This is what lets the scheduler know when a match is ~10
    minutes from kickoff.

    Known limitation: the livescore page doesn't give us a full date, only the
    time, so this assumes the match is "today". If a match's kickoff time,
    combined with today's date, would already be more than 3 hours in the
    past, we assume it actually meant tomorrow (handles matches just after
    local midnight still being listed against "today" in some views).
    """
    if not kickoff_time_text:
        return None
    m = re.match(r"^(\d{1,2}):(\d{2})$", kickoff_time_text.strip())
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2))
    now = dt.datetime.now(TEHRAN_TZ)
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if (now - candidate) > dt.timedelta(hours=3):
        candidate = candidate + dt.timedelta(days=1)
    return candidate.astimezone(dt.timezone.utc).replace(tzinfo=None)


def _split_event_names(event_type: str, names: list) -> tuple[Optional[str], Optional[str]]:
    """Turn the raw list of nearby text fragments into (player_name, extra_name).

    For goals: names[0] is usually the scorer, an optional assist name may follow.
    For substitutions: two names appear -- player coming ON and player coming OFF.
    For cards: just the carded player's name.
    """
    names = [n for n in names if n]
    if not names:
        return None, None
    if len(names) == 1:
        return names[0], None
    return names[0], names[1]


def persist_matches(db: Session, scraped_matches: list) -> tuple[int, int]:
    """Upsert matches and insert any new events. Returns (num_matches, num_new_events)."""
    num_events = 0

    for m in scraped_matches:
        match_id = m["match_id"]
        row = db.get(models.Match, match_id)
        if row is None:
            row = models.Match(match_id=match_id)
            db.add(row)

        row.league_title = m.get("league_title") or row.league_title
        row.league_url = m.get("league_url") or row.league_url
        row.match_url = m.get("match_url") or row.match_url
        row.live_watch_url = m.get("anten_url") or row.live_watch_url
        row.home_team = m.get("home_team") or row.home_team
        row.away_team = m.get("away_team") or row.away_team
        row.home_score = m.get("home_score") if m.get("home_score") is not None else row.home_score
        row.away_score = m.get("away_score") if m.get("away_score") is not None else row.away_score
        row.kickoff_time_text = m.get("kickoff_time_text") or row.kickoff_time_text
        if row.kickoff_datetime is None:
            row.kickoff_datetime = _compute_kickoff_datetime(row.kickoff_time_text)
        row.status_text = m.get("status_text") or row.status_text
        row.minute_text = m.get("minute_text") or row.minute_text
        row.is_live = bool(m.get("is_live"))

        db.flush()  # ensure row.match_id is available for the FK below

        for ev in m.get("events", []):
            player_name, extra_name = _split_event_names(ev["event_type"], ev.get("names", []))
            minute_text = ev.get("minute_text")
            event_type = ev["event_type"]

            # Check-then-insert (rather than insert-and-catch-IntegrityError) so a
            # duplicate never forces a rollback of the whole batch's pending changes.
            exists = (
                db.query(models.MatchEvent.id)
                .filter_by(
                    match_id=match_id,
                    minute_text=minute_text,
                    event_type=event_type,
                    player_name=player_name,
                    team_side=None,
                )
                .first()
            )
            if exists:
                continue

            event = models.MatchEvent(
                match_id=match_id,
                minute_text=minute_text,
                event_type=event_type,
                team_side=None,  # left for future refinement; side isn't reliably
                                  # inferable from icon position alone on this markup
                player_name=player_name,
                extra_name=extra_name,
                score_after=None,
            )
            db.add(event)
            db.flush()
            num_events += 1

    db.commit()
    return len(scraped_matches), num_events


def persist_lineup(db: Session, match_id: str, lineup: Optional[dict]) -> bool:
    """Store formations/coaches on the Match row and replace its lineup player
    rows. Returns False (and stores nothing) if `lineup` is None -- meaning the
    detail page didn't have a lineup section yet (not announced for this
    match), which the caller should treat as "try again later", not an error.
    """
    if not lineup:
        return False

    row = db.get(models.Match, match_id)
    if row is None:
        return False

    row.host_formation = lineup.get("host_formation")
    row.away_formation = lineup.get("away_formation")
    row.host_coach = lineup.get("host_coach")
    row.away_coach = lineup.get("away_coach")
    row.lineup_fetched_at = models.utcnow()

    # Replace any existing lineup rows for this match (simplest correct
    # behavior for a value that's only ever fetched once per match anyway).
    db.query(models.LineupPlayer).filter_by(match_id=match_id).delete()

    def add_players(players, team_side, is_starting):
        for p in players or []:
            db.add(models.LineupPlayer(
                match_id=match_id,
                team_side=team_side,
                is_starting=is_starting,
                jersey_number=p.get("jersey_number"),
                player_name=p.get("player_name"),
            ))

    add_players(lineup.get("host_starters"), "host", True)
    add_players(lineup.get("away_starters"), "away", True)
    add_players(lineup.get("host_bench"), "host", False)
    add_players(lineup.get("away_bench"), "away", False)

    db.commit()
    return True


def persist_stats(db: Session, match_id: str, phase: str, stats: Optional[list]) -> int:
    """Store one phase's worth of match statistics ("halftime" or "fulltime").
    Returns the number of stat rows stored; 0 (storing nothing) if `stats` is
    None/empty, meaning that match doesn't have a statistics section on its
    detail page yet -- normal for lower-profile matches/leagues, not an error.
    """
    if not stats:
        return 0

    row = db.get(models.Match, match_id)
    if row is None:
        return 0

    count = 0
    for s in stats:
        existing = (
            db.query(models.MatchStatistic)
            .filter_by(match_id=match_id, phase=phase, stat_label=s["stat_label"])
            .first()
        )
        if existing:
            existing.home_value = s.get("home_value")
            existing.away_value = s.get("away_value")
        else:
            db.add(models.MatchStatistic(
                match_id=match_id,
                phase=phase,
                stat_label=s["stat_label"],
                home_value=s.get("home_value"),
                away_value=s.get("away_value"),
            ))
        count += 1

    if phase == "halftime":
        row.halftime_stats_fetched_at = models.utcnow()
    elif phase == "fulltime":
        row.fulltime_stats_fetched_at = models.utcnow()

    db.commit()
    return count
