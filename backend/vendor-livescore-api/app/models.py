import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return dt.datetime.utcnow()


class Match(Base):
    """One football match, keyed by varzesh3's own match id (stable across snapshots)."""
    __tablename__ = "matches"

    match_id = Column(String, primary_key=True)          # varzesh3 numeric id, as string
    league_title = Column(String, nullable=True)          # e.g. "لیگ قهرمانان اروپا"
    league_url = Column(String, nullable=True)
    match_url = Column(String, nullable=True)
    live_watch_url = Column(String, nullable=True)     # anten.ir link for this match

    home_team = Column(String, nullable=True)
    away_team = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)

    kickoff_time_text = Column(String, nullable=True)     # e.g. "17:30" (site-local display)
    kickoff_date_text = Column(String, nullable=True)      # e.g. "27 تیر 1405"
    kickoff_datetime = Column(DateTime, nullable=True)      # best-effort combined datetime
                                                              # (Tehran local, naive) derived
                                                              # from kickoff_time_text; used only
                                                              # to trigger the 10-min-pre-kickoff
                                                              # lineup fetch. May be wrong across
                                                              # a midnight rollover -- see README.

    status_text = Column(String, nullable=True)            # e.g. "نتیجه نهایی", "پایان نیمه"
    minute_text = Column(String, nullable=True)            # e.g. "61'", "45+'", "90+'"
    is_live = Column(Boolean, default=False)

    # --- lineup / formation / coaches (fetched once, ~10 min before kickoff) ---
    host_formation = Column(String, nullable=True)          # e.g. "4-3-2-1"
    away_formation = Column(String, nullable=True)
    host_coach = Column(String, nullable=True)
    away_coach = Column(String, nullable=True)
    lineup_fetched_at = Column(DateTime, nullable=True)     # set once fetched; never re-fetched

    # --- match statistics (fetched once at half-time, once at full-time) ---
    halftime_stats_fetched_at = Column(DateTime, nullable=True)
    fulltime_stats_fetched_at = Column(DateTime, nullable=True)

    first_seen_at = Column(DateTime, default=utcnow)
    last_seen_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    events = relationship("MatchEvent", back_populates="match", cascade="all, delete-orphan")
    lineup_players = relationship("LineupPlayer", back_populates="match", cascade="all, delete-orphan")
    statistics = relationship("MatchStatistic", back_populates="match", cascade="all, delete-orphan")


class MatchEvent(Base):
    """A single in-match event: goal, card, or substitution."""
    __tablename__ = "match_events"
    __table_args__ = (
        UniqueConstraint(
            "match_id", "minute_text", "event_type", "player_name", "team_side",
            name="uix_event_identity",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), nullable=False)

    minute_text = Column(String, nullable=True)   # e.g. "33'"
    event_type = Column(String, nullable=False)   # goal | own_goal | penalty_goal | yellow_card
                                                    # | red_card | substitution
                                                    # (varzesh3 has no distinct "second yellow"
                                                    # icon -- infer it client-side from two
                                                    # yellow_card rows for the same player)
    team_side = Column(String, nullable=True)      # "host" | "guest" | None if unknown
    player_name = Column(String, nullable=True)    # scorer / carded player / player coming ON
    extra_name = Column(String, nullable=True)     # assist provider, or player coming OFF
    score_after = Column(String, nullable=True)    # e.g. "2-1" if shown next to the event

    captured_at = Column(DateTime, default=utcnow)

    match = relationship("Match", back_populates="events")


class LineupPlayer(Base):
    """One player in a match's starting XI or substitutes bench."""
    __tablename__ = "lineup_players"
    __table_args__ = (
        UniqueConstraint(
            "match_id", "team_side", "is_starting", "jersey_number", "player_name",
            name="uix_lineup_identity",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), nullable=False)

    team_side = Column(String, nullable=False)     # "host" | "away"
    is_starting = Column(Boolean, nullable=False)   # True = starting XI, False = bench
    jersey_number = Column(Integer, nullable=True)
    player_name = Column(String, nullable=False)

    match = relationship("Match", back_populates="lineup_players")


class MatchStatistic(Base):
    """One stat row (e.g. total shots) captured at a given phase of the match."""
    __tablename__ = "match_statistics"
    __table_args__ = (
        UniqueConstraint("match_id", "phase", "stat_label", name="uix_stat_identity"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), nullable=False)

    phase = Column(String, nullable=False)          # "halftime" | "fulltime"
    stat_label = Column(String, nullable=False)      # e.g. "مجموع شوت ها" (as shown on the site)
    home_value = Column(String, nullable=True)       # kept as text -- possession is "%58" style
    away_value = Column(String, nullable=True)
    captured_at = Column(DateTime, default=utcnow)

    match = relationship("Match", back_populates="statistics")


class Snapshot(Base):
    """One scrape cycle's bookkeeping row."""
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    taken_at = Column(DateTime, default=utcnow)
    num_football_matches = Column(Integer, default=0)
    num_events_captured = Column(Integer, default=0)
    html_path = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    error = Column(String, nullable=True)


class RuntimeConfig(Base):
    """Single-row table holding the mutable run-time settings (interval, running flag)."""
    __tablename__ = "runtime_config"

    id = Column(Integer, primary_key=True, default=1)
    is_running = Column(Boolean, default=False)
    interval_seconds = Column(Integer, default=30)
    recheck_seconds = Column(Integer, default=30)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
