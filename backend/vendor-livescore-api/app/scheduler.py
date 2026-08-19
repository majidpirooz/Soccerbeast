import asyncio
import datetime as dt
import logging
import random
import time

from . import config, models
from .database import SessionLocal
from .parser import persist_matches, persist_lineup, persist_stats
from .scraper import LiveScoreBrowser, save_html_snapshot

log = logging.getLogger("livescore.scheduler")


class Scheduler:
    def __init__(self):
        self.browser = LiveScoreBrowser()
        self._task: asyncio.Task | None = None
        self._detail_task: asyncio.Task | None = None
        self._running = False
        self.interval_seconds = config.DEFAULT_INTERVAL_SECONDS
        self.recheck_seconds = config.DEFAULT_RECHECK_SECONDS
        self.last_run_at: float | None = None
        self.last_error: str | None = None
        self.total_cycles = 0
        self.last_detail_error: str | None = None

    async def _ensure_browser_started(self):
        if self.browser._browser is None:
            await self.browser.start()

    async def start(self, interval_seconds: int | None = None, recheck_seconds: int | None = None):
        if interval_seconds is not None:
            self.interval_seconds = max(interval_seconds, config.MIN_INTERVAL_SECONDS)
        if recheck_seconds is not None:
            self.recheck_seconds = max(recheck_seconds, config.MIN_INTERVAL_SECONDS)

        if self._running:
            return  # already running; interval change above still applies

        await self._ensure_browser_started()
        self._running = True
        self._task = asyncio.create_task(self._loop())
        self._detail_task = asyncio.create_task(self._detail_loop())
        log.info("Scheduler started: interval=%ss", self.interval_seconds)

    async def stop(self):
        self._running = False
        for task_attr in ("_task", "_detail_task"):
            task = getattr(self, task_attr)
            if task:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
                setattr(self, task_attr, None)
        log.info("Scheduler stopped")

    def status(self) -> dict:
        return {
            "running": self._running,
            "interval_seconds": self.interval_seconds,
            "recheck_seconds": self.recheck_seconds,
            "last_run_at": self.last_run_at,
            "last_error": self.last_error,
            "total_cycles": self.total_cycles,
            "last_detail_error": self.last_detail_error,
        }

    async def _loop(self):
        # The "recheck for closed dropdowns" requirement is naturally satisfied
        # because every full cycle re-expands *all* currently-closed dropdowns
        # (new matches that appeared, or ones that reset) before saving. We still
        # honor recheck_seconds as the effective cadence when it's shorter than
        # interval_seconds, e.g. if the caller wants faster dropdown-only checks.
        effective_interval = min(self.interval_seconds, self.recheck_seconds)

        while self._running:
            cycle_start = time.monotonic()
            db = SessionLocal()
            try:
                result = await self.browser.run_cycle(save_html=config.SAVE_RAW_HTML)
                num_matches, num_events = persist_matches(db, result.matches)

                html_path = None
                if config.SAVE_RAW_HTML and result.html:
                    html_path = save_html_snapshot(result.html)

                db.add(models.Snapshot(
                    num_football_matches=num_matches,
                    num_events_captured=num_events,
                    html_path=html_path,
                    duration_seconds=result.duration_seconds,
                ))
                db.commit()

                self.last_error = None
                self.total_cycles += 1
                self.last_run_at = time.time()
                log.info(
                    "Cycle done: %d matches, %d new events, %.1fs",
                    num_matches, num_events, result.duration_seconds,
                )
            except Exception as exc:  # keep the loop alive across transient failures
                db.rollback()
                self.last_error = str(exc)
                log.exception("Scrape cycle failed")
                db.add(models.Snapshot(error=str(exc)))
                db.commit()
            finally:
                db.close()

            elapsed = time.monotonic() - cycle_start
            # small jitter so the reload cadence isn't perfectly robotic
            sleep_for = max(0.0, effective_interval - elapsed) + random.uniform(0, 2.0)
            try:
                await asyncio.sleep(sleep_for)
            except asyncio.CancelledError:
                break

    async def _detail_loop(self):
        """Independently checks for matches that need a one-off lineup or
        statistics fetch, and performs those visits on the dedicated detail
        tab. Each match only ever gets 0-3 such visits total in its lifetime
        (lineup, halftime stats, fulltime stats), never on a recurring basis,
        which is why this can run its own light-touch cadence separate from
        the main 30s livescore cycle.
        """
        while self._running:
            db = SessionLocal()
            try:
                now = dt.datetime.utcnow()
                lineup_cutoff = now + dt.timedelta(minutes=config.LINEUP_MINUTES_BEFORE_KICKOFF)

                # 1) Lineups: kickoff is known, within the trigger window, not
                # already fetched, and not some stale match from long ago.
                needing_lineup = (
                    db.query(models.Match)
                    .filter(models.Match.lineup_fetched_at.is_(None))
                    .filter(models.Match.kickoff_datetime.isnot(None))
                    .filter(models.Match.kickoff_datetime <= lineup_cutoff)
                    .filter(models.Match.kickoff_datetime >= now - dt.timedelta(hours=2))
                    .all()
                )
                for match in needing_lineup:
                    await self._fetch_and_store(db, match, want_lineup=True)

                # 2) Half-time stats: status text signals half-time and we
                # haven't captured this phase yet.
                needing_halftime = (
                    db.query(models.Match)
                    .filter(models.Match.halftime_stats_fetched_at.is_(None))
                    .filter(models.Match.status_text.isnot(None))
                    .filter(models.Match.status_text.contains("نیمه"))
                    .all()
                )
                for match in needing_halftime:
                    await self._fetch_and_store(db, match, want_stats_phase="halftime")

                # 3) Full-time stats: match is finished and we haven't
                # captured this phase yet.
                needing_fulltime = (
                    db.query(models.Match)
                    .filter(models.Match.fulltime_stats_fetched_at.is_(None))
                    .filter(models.Match.status_text == "نتیجه نهایی")
                    .all()
                )
                for match in needing_fulltime:
                    await self._fetch_and_store(db, match, want_stats_phase="fulltime")

                self.last_detail_error = None
            except Exception as exc:
                self.last_detail_error = str(exc)
                log.exception("Detail loop pass failed")
            finally:
                db.close()

            try:
                await asyncio.sleep(config.DETAIL_CHECK_INTERVAL_SECONDS + random.uniform(0, 3.0))
            except asyncio.CancelledError:
                break

    async def _fetch_and_store(
        self, db, match: "models.Match", want_lineup: bool = False, want_stats_phase: str | None = None,
    ):
        if not match.match_url:
            return
        try:
            detail = await self.browser.fetch_match_detail(match.match_url)
        except Exception:
            log.exception("Detail fetch failed for match %s", match.match_id)
            return

        if want_lineup:
            persist_lineup(db, match.match_id, detail.get("lineup"))
            # Note: if the lineup section genuinely isn't there yet (announced
            # late), lineup_fetched_at stays None and we'll simply try again
            # on the next detail_loop pass -- no permanent failure state.

        if want_stats_phase:
            persist_stats(db, match.match_id, want_stats_phase, detail.get("stats"))
            # Same reasoning: if stats aren't populated yet, the corresponding
            # *_fetched_at stays None and we retry next pass rather than
            # silently giving up on that match's stats forever.

        # small human-ish pacing between consecutive detail-page visits within
        # the same pass, so a burst of simultaneous triggers doesn't look like
        # a scraping run
        await asyncio.sleep(random.uniform(1.0, 3.0))


scheduler = Scheduler()
