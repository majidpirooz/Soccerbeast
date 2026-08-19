import logging

from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import config, models
from .database import init_db, SessionLocal
from .scheduler import scheduler

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Live Score API", version="1.0.0")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_api_key(x_api_key: str = Header(default="")):
    if x_api_key != config.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")


@app.on_event("startup")
async def on_startup():
    init_db()


@app.on_event("shutdown")
async def on_shutdown():
    await scheduler.stop()
    await scheduler.browser.stop()


# ---------------------------------------------------------------------------
# Control endpoints -- start/stop/configure the scraping loop
# ---------------------------------------------------------------------------

class StartRequest(BaseModel):
    interval_seconds: int | None = None
    recheck_seconds: int | None = None


@app.post("/control/start", dependencies=[Depends(require_api_key)])
async def start(req: StartRequest):
    await scheduler.start(req.interval_seconds, req.recheck_seconds)
    return scheduler.status()


@app.post("/control/stop", dependencies=[Depends(require_api_key)])
async def stop():
    await scheduler.stop()
    return scheduler.status()


@app.get("/control/status", dependencies=[Depends(require_api_key)])
async def status():
    return scheduler.status()


class ConfigRequest(BaseModel):
    interval_seconds: int | None = None
    recheck_seconds: int | None = None


@app.put("/control/config", dependencies=[Depends(require_api_key)])
async def update_config(req: ConfigRequest):
    if req.interval_seconds is not None:
        scheduler.interval_seconds = max(req.interval_seconds, config.MIN_INTERVAL_SECONDS)
    if req.recheck_seconds is not None:
        scheduler.recheck_seconds = max(req.recheck_seconds, config.MIN_INTERVAL_SECONDS)
    return scheduler.status()


# ---------------------------------------------------------------------------
# Data endpoints -- what your website actually consumes
# ---------------------------------------------------------------------------

def _match_to_dict(m: models.Match, include_events: bool = False) -> dict:
    d = {
        "match_id": m.match_id,
        "league_title": m.league_title,
        "league_url": m.league_url,
        "match_url": m.match_url,
        "live_watch_url": m.live_watch_url,
        "home_team": m.home_team,
        "away_team": m.away_team,
        "home_score": m.home_score,
        "away_score": m.away_score,
        "kickoff_time_text": m.kickoff_time_text,
        "status_text": m.status_text,
        "minute_text": m.minute_text,
        "is_live": m.is_live,
        "last_seen_at": m.last_seen_at.isoformat() if m.last_seen_at else None,
    }
    if include_events:
        d["events"] = [
            {
                "minute_text": e.minute_text,
                "event_type": e.event_type,
                "team_side": e.team_side,
                "player_name": e.player_name,
                "extra_name": e.extra_name,
            }
            for e in sorted(m.events, key=lambda e: (e.minute_text or ""))
        ]

        # Lineup: null fields/empty lists simply mean "not fetched yet" (kickoff
        # more than 10 min away) or "not announced yet" -- not an error state.
        starters = [p for p in m.lineup_players if p.is_starting]
        bench = [p for p in m.lineup_players if not p.is_starting]
        d["lineup"] = {
            "fetched_at": m.lineup_fetched_at.isoformat() if m.lineup_fetched_at else None,
            "host_formation": m.host_formation,
            "away_formation": m.away_formation,
            "host_coach": m.host_coach,
            "away_coach": m.away_coach,
            "host_starters": [
                {"jersey_number": p.jersey_number, "player_name": p.player_name}
                for p in starters if p.team_side == "host"
            ],
            "away_starters": [
                {"jersey_number": p.jersey_number, "player_name": p.player_name}
                for p in starters if p.team_side == "away"
            ],
            "host_bench": [
                {"jersey_number": p.jersey_number, "player_name": p.player_name}
                for p in bench if p.team_side == "host"
            ],
            "away_bench": [
                {"jersey_number": p.jersey_number, "player_name": p.player_name}
                for p in bench if p.team_side == "away"
            ],
        }

        # Statistics: grouped by phase; either phase may be an empty list if
        # that phase hasn't happened yet or the match doesn't have stats.
        d["statistics"] = {
            "halftime": [
                {"stat_label": s.stat_label, "home_value": s.home_value, "away_value": s.away_value}
                for s in m.statistics if s.phase == "halftime"
            ],
            "fulltime": [
                {"stat_label": s.stat_label, "home_value": s.home_value, "away_value": s.away_value}
                for s in m.statistics if s.phase == "fulltime"
            ],
        }
    return d


@app.get("/matches", dependencies=[Depends(require_api_key)])
def list_matches(live_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(models.Match)
    if live_only:
        q = q.filter(models.Match.is_live.is_(True))
    matches = q.order_by(models.Match.last_seen_at.desc()).all()
    return [_match_to_dict(m) for m in matches]


@app.get("/matches/{match_id}", dependencies=[Depends(require_api_key)])
def get_match(match_id: str, db: Session = Depends(get_db)):
    m = db.get(models.Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return _match_to_dict(m, include_events=True)


@app.get("/snapshots/latest", dependencies=[Depends(require_api_key)])
def latest_snapshot(db: Session = Depends(get_db)):
    snap = db.query(models.Snapshot).order_by(models.Snapshot.taken_at.desc()).first()
    if not snap:
        raise HTTPException(status_code=404, detail="No snapshots yet")
    return {
        "taken_at": snap.taken_at.isoformat(),
        "num_football_matches": snap.num_football_matches,
        "num_events_captured": snap.num_events_captured,
        "duration_seconds": snap.duration_seconds,
        "error": snap.error,
    }
