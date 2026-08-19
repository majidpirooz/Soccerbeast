"""
Browser automation for varzesh3.com/livescore.

Design notes (why it's built this way):

- We keep ONE persistent browser context alive for the whole life of the service
  instead of launching a fresh browser per cycle. Repeatedly spinning up brand-new
  browser fingerprints/IPs-from-the-same-box looks far more automated than a single
  long-lived "user" who happens to reload a tab every N seconds.
- We reload the same tab on an interval rather than opening new tabs/pages.
- We interact with the page like a user would: click the dropdown arrows, wait for
  their content to actually render, small randomized delays between clicks.
- Extraction is done via page.evaluate() (JS run inside the page), keyed off stable
  signals -- href patterns (/football/match/{id}/...), and icon <img alt="..."> /
  src filenames (goal.svg, subtitute.svg, yellow-card.svg, angle-down-accent.svg).
  We deliberately do NOT key off the hashed utility class names (e.g. "v378zum5"),
  because those are generated per-build and will change whenever the site redeploys.
"""

import asyncio
import random
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from . import config

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# JS extractor: walks the DOM in document order, keeps track of the most recent
# league header seen, and for every football match link builds a structured record
# (plus any expanded event rows found inside that match's row container).
EXTRACT_JS = r"""
() => {
  function textOf(el) {
    return (el && el.textContent || "").trim();
  }

  // Find the smallest ancestor of `anchor` that also contains the row's
  // expand/collapse toggle icon (angle-down-accent.svg) -- that's a stable
  // signature for "this is the whole match row", independent of hashed classes.
  function findRowContainer(anchor) {
    let el = anchor.parentElement;
    for (let i = 0; i < 8 && el; i++) {
      const hasToggle = el.querySelector('img[src*="angle-down"]');
      const anchorsInside = el.querySelectorAll('a[href*="/football/match/"]').length;
      if (hasToggle && anchorsInside === 1) return el;
      el = el.parentElement;
    }
    // fallback: a few levels up is usually enough even without a toggle
    // (matches that haven't started have no toggle at all)
    return anchor.parentElement && anchor.parentElement.parentElement
      ? anchor.parentElement.parentElement
      : anchor.parentElement;
  }

  function isExpanded(row) {
    // Once expanded, event rows containing goal/sub/card icons appear inside.
    return !!row.querySelector(
      'img[src*="goal.svg"], img[src*="subtitute.svg"], img[src*="yellow-card"], ' +
      'img[src*="red-card"], img[alt*="کارت"], img[alt="تعویض"]'
    );
  }

  function parseScoreFromRow(row) {
    // Score digits sit in small spans right after each team name, separated by "-".
    // We grab the two numeric-ish spans nearest the team block; if match hasn't
    // started they'll be empty.
    const scoreBlocks = row.querySelectorAll('div');
    let home = null, away = null;
    // Look for a container with a "-" text node between two spans of digits.
    const candidates = Array.from(row.querySelectorAll('div')).filter(d => {
      const t = textOf(d);
      return /^\d*\s*-\s*\d*$/.test(t) && t.includes('-');
    });
    if (candidates.length) {
      const t = textOf(candidates[0]);
      const parts = t.split('-').map(s => s.trim());
      home = parts[0] === '' ? null : parseInt(parts[0], 10);
      away = parts[1] === '' ? null : parseInt(parts[1], 10);
    }
    return [home, away];
  }

  function extractEvents(row) {
    const events = [];
    // Every event line has exactly one status/type icon among these.
    const iconSelectors = [
      ['goal', 'img[src*="goal.svg"]:not([alt*="خودی"]):not([alt*="پنالتی"])'],
      ['own_goal', 'img[alt*="خودی"]'],
      ['penalty_goal', 'img[alt*="پنالتی"][src*="goal"]'],
      ['yellow_card', 'img[src*="yellow-card"], img[alt="کارت زرد"]'],
      ['red_card', 'img[src*="red-card"], img[alt="کارت قرمز"]'],
      ['substitution', 'img[src*="subtitute.svg"], img[alt="تعویض"]'],
    ];
    // Note: varzesh3 has no distinct icon/alt for "second yellow -> red". A second
    // yellow just appears as a second ordinary yellow_card event for the same
    // player. Consumers should infer that by grouping yellow_card events per
    // (match_id, player_name) rather than expecting a dedicated event_type here.

    const seenIcons = new Set();
    for (const [eventType, sel] of iconSelectors) {
      const icons = row.querySelectorAll(sel);
      icons.forEach(icon => {
        if (seenIcons.has(icon)) return;
        seenIcons.add(icon);

        // Walk up to the line container that holds both the minute badge and
        // the icon+names, then read text/spans from there.
        let line = icon.parentElement;
        for (let i = 0; i < 4 && line; i++) {
          const minuteMatch = textOf(line).match(/(\d+(?:\+\d+)?)'/);
          if (minuteMatch) break;
          line = line.parentElement;
        }
        if (!line) line = icon.closest('div');

        const minuteMatch = textOf(line).match(/(\d+(?:\+\d+)?)'/);
        const minuteText = minuteMatch ? (minuteMatch[1] + "'") : null;

        // Names: spans of plain text near the icon, excluding the minute badge
        // and score digits. This is heuristic -- Persian/Latin player names both
        // appear as plain <span> text with no nested <img>.
        const nameSpans = Array.from(line.querySelectorAll('span'))
          .filter(s => s.children.length === 0)
          .map(s => textOf(s))
          .filter(t => t && !/^\d+(\+\d+)?'$/.test(t) && !/^\d+$/.test(t) && t !== '-');

        events.push({
          event_type: eventType,
          minute_text: minuteText,
          names: nameSpans.slice(0, 3),
        });
      });
    }
    return events;
  }

  const results = [];
  let currentLeagueTitle = null;
  let currentLeagueUrl = null;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const seenMatchIds = new Set();

  const leagueHeaderLinks = Array.from(
    document.querySelectorAll('a[href*="/football/league/"]')
  );
  const matchAnchors = Array.from(
    document.querySelectorAll('a[href*="/football/match/"]')
  );

  // Merge league headers + match anchors, sorted by DOM order, so we can assign
  // "current league" to each match as we sweep through.
  const allNodes = leagueHeaderLinks.map(a => ({ type: 'league', el: a }))
    .concat(matchAnchors.map(a => ({ type: 'match', el: a })));

  allNodes.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  for (const node of allNodes) {
    if (node.type === 'league') {
      currentLeagueTitle = textOf(node.el);
      currentLeagueUrl = node.el.href;
      continue;
    }

    const anchor = node.el;
    const href = anchor.getAttribute('href') || '';
    const idMatch = href.match(/\/football\/match\/(\d+)\//);
    if (!idMatch) continue;
    const matchId = idMatch[1];
    if (seenMatchIds.has(matchId)) continue;
    seenMatchIds.add(matchId);

    const row = findRowContainer(anchor);
    const [homeScore, awayScore] = parseScoreFromRow(row);

    // Team names: alt text of the two team crest <img> elements inside the anchor.
    const crestImgs = anchor.querySelectorAll('img[alt]');
    const teamNames = Array.from(crestImgs).map(i => i.getAttribute('alt')).filter(Boolean);
    const homeTeam = teamNames[0] || null;
    const awayTeam = teamNames[1] || null;

    // Time / status: look for a <time> element and a live/status badge near it.
    const timeEl = row.querySelector('time');
    const kickoffTimeText = timeEl ? textOf(timeEl) : null;

    let statusText = null;
    let minuteText = null;
    let isLive = false;
    const liveIcon = row.querySelector('img[src*="live.svg"]');
    const fulltimeIcon = row.querySelector('img[src*="full-time"]');
    if (liveIcon) {
      isLive = true;
      const wrap = liveIcon.parentElement;
      const t = textOf(wrap);
      const m = t.match(/(\d+(?:\+\d*)?')/);
      if (m) {
        // A real running minute (e.g. "61'") -- match is actively being played.
        minuteText = m[1];
        statusText = null;
      } else {
        // No minute digits -- this is a special in-between state (e.g. half-time
        // break, which shows literal text like "پایان نیمه" next to the same
        // live icon instead of a counting minute). Surface that real text
        // rather than a made-up placeholder, so callers can match on it.
        statusText = t || null;
        minuteText = null;
      }
    } else if (fulltimeIcon) {
      statusText = textOf(fulltimeIcon.parentElement) || 'نتیجه نهایی';
    }

    const expanded = isExpanded(row);
    const events = expanded ? extractEvents(row) : [];

    // Per-match "highlights / live watch" link to anten.ir, present on nearly
    // every row regardless of dropdown state.
    const antenAnchor = row.querySelector('a[href*="anten.ir"]');
    const antenUrl = antenAnchor ? antenAnchor.getAttribute('href') : null;

    results.push({
      match_id: matchId,
      match_url: href,
      anten_url: antenUrl,
      league_title: currentLeagueTitle,
      league_url: currentLeagueUrl,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore,
      kickoff_time_text: kickoffTimeText,
      status_text: statusText,
      minute_text: minuteText,
      is_live: isLive,
      dropdown_expanded: expanded,
      events: events,
    });
  }

  return results;
}
"""

# Toggle icon selector used both to find un-expanded rows and to click them.
TOGGLE_SELECTOR = 'img[src*="angle-down-accent"]'


@dataclass
class ScrapeResult:
    matches: list = field(default_factory=list)
    html: Optional[str] = None
    duration_seconds: float = 0.0


# Extractor for the individual match detail page (/football/match/{id}/{slug}).
# Pulls starting lineup, bench, formations, coaches, and match statistics.
# Deliberately returns null/[] for any section that isn't present on the page --
# not every match has lineups announced yet, or has stats populated, so the
# caller (and the API) must treat missing sections as normal, not an error.
DETAIL_EXTRACT_JS = r"""
() => {
  function textOf(el) { return (el && el.textContent || "").trim(); }

  // Every labelled section on this page follows the same shape: an <h2> whose
  // own wrapper div is followed by a sibling div holding the section's content.
  function sectionContainer(headingText) {
    const h2 = Array.from(document.querySelectorAll('h2'))
      .find(h => textOf(h) === headingText);
    if (!h2 || !h2.parentElement) return null;
    return h2.parentElement.nextElementSibling;
  }

  function parsePlayerSpans(container) {
    // "22. مک انف" -> {jersey_number: 22, player_name: "مک انف"}
    if (!container) return [];
    const spans = Array.from(
      container.querySelectorAll('span')
    ).filter(s => s.children.length === 0);
    const out = [];
    for (const s of spans) {
      const t = textOf(s).replace(/\s+/g, ' ');
      const m = t.match(/^(\d+)\.\s*(.+)$/);
      if (m) out.push({ jersey_number: parseInt(m[1], 10), player_name: m[2].trim() });
    }
    return out;
  }

  function parseFormationsAndTeamOrder(container) {
    // Formation appears as a plain digit-dash span (e.g. "4-3-2-1") inside the
    // same anchor/span block as the team name, once per team, in host-then-away
    // document order (this page lists host first everywhere else too).
    if (!container) return [];
    const spans = Array.from(container.querySelectorAll('span'))
      .filter(s => s.children.length === 0);
    return spans
      .map(s => textOf(s))
      .filter(t => /^\d(-\d)+$/.test(t));
  }

  // ---- lineup / bench / formations / coaches ----
  let lineup = null;
  const startingContainer = sectionContainer('ترکیب اصلی');
  const benchContainer = sectionContainer('بازیکنان ذخیره');

  if (startingContainer) {
    const formations = parseFormationsAndTeamOrder(startingContainer);
    const hostFormation = formations[0] || null;
    const awayFormation = formations[1] || null;

    const allStarters = parsePlayerSpans(startingContainer);
    // Split the flat 22-player list using each team's own formation
    // (outfield digits sum + 1 GK = that team's player count).
    function countFromFormation(f) {
      if (!f) return null;
      const nums = f.split('-').map(n => parseInt(n, 10));
      return nums.reduce((a, b) => a + b, 0) + 1;
    }
    const hostCount = countFromFormation(hostFormation);
    let hostStarters, awayStarters;
    if (hostCount && allStarters.length >= hostCount) {
      hostStarters = allStarters.slice(0, hostCount);
      awayStarters = allStarters.slice(hostCount);
    } else {
      // fallback if formation parsing didn't line up: even split
      const half = Math.ceil(allStarters.length / 2);
      hostStarters = allStarters.slice(0, half);
      awayStarters = allStarters.slice(half);
    }

    const benchPlayers = parsePlayerSpans(benchContainer);
    // Bench IS split per team via team-link anchors, unlike the starting XI.
    let hostBench = [], awayBench = [];
    if (benchContainer) {
      const teamAnchors = Array.from(
        benchContainer.querySelectorAll('a[href*="/football/team/"]')
      );
      if (teamAnchors.length >= 2) {
        // players between anchor[0] and anchor[1] -> host bench; after anchor[1] -> away bench
        const allBenchSpans = Array.from(benchContainer.querySelectorAll('span'))
          .filter(s => s.children.length === 0);
        // Re-derive using position relative to anchors via compareDocumentPosition.
        const isAfter = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        for (const p of benchPlayers) {
          hostBench.push(p);   // will be corrected below if we can split cleanly
        }
        // Simple split: find the flat span list order and cut where the 2nd team anchor appears
        const flatMatches = [];
        const walker = document.createTreeWalker(benchContainer, NodeFilter.SHOW_ELEMENT);
        let node, afterSecondAnchor = false, secondAnchorSeen = false;
        while ((node = walker.nextNode())) {
          if (node === teamAnchors[1]) { secondAnchorSeen = true; }
          if (node.tagName === 'SPAN' && node.children.length === 0) {
            const t = textOf(node).match(/^(\d+)\.\s*(.+)$/);
            if (t) {
              flatMatches.push({
                jersey_number: parseInt(t[1], 10),
                player_name: t[2].trim(),
                afterSecond: secondAnchorSeen,
              });
            }
          }
        }
        hostBench = flatMatches.filter(p => !p.afterSecond)
          .map(({ jersey_number, player_name }) => ({ jersey_number, player_name }));
        awayBench = flatMatches.filter(p => p.afterSecond)
          .map(({ jersey_number, player_name }) => ({ jersey_number, player_name }));
      }
    }

    // Coaches: the block of exactly two single-name entries sitting right
    // before the bench heading. The site mislabels both with the same
    // alt="میزبان" icon (a real bug on their end), so we use document order
    // (first = host, second = away) instead of trusting that attribute.
    let hostCoach = null, awayCoach = null;
    const benchHeadingWrapper = Array.from(document.querySelectorAll('h2'))
      .find(h => textOf(h) === 'بازیکنان ذخیره');
    if (benchHeadingWrapper && benchHeadingWrapper.parentElement) {
      const coachContainer = benchHeadingWrapper.parentElement.previousElementSibling;
      if (coachContainer) {
        const nameDivs = Array.from(coachContainer.children).filter(d => {
          const t = textOf(d);
          return t && !/^\d+\.\s/.test(t);
        });
        if (nameDivs.length >= 2) {
          hostCoach = textOf(nameDivs[0]) || null;
          awayCoach = textOf(nameDivs[1]) || null;
        }
      }
    }

    lineup = {
      host_formation: hostFormation,
      away_formation: awayFormation,
      host_coach: hostCoach,
      away_coach: awayCoach,
      host_starters: hostStarters,
      away_starters: awayStarters,
      host_bench: hostBench,
      away_bench: awayBench,
    };
  }

  // ---- statistics ----
  // Known stat labels as shown by the site. Add to this list if the site
  // introduces a new stat type -- rows with labels not in this list are
  // simply skipped rather than causing an error.
  const KNOWN_STAT_LABELS = [
    'مالکیت توپ', 'مجموع شوت ها', 'شوت در چارچوب', 'شوت خارج از چارچوب',
    'شوت  بلوکه‌ شده', 'شوت بلوکه‌ شده', 'ضربه آزاد', 'کارت زرد', 'کارت قرمز',
    'کرنر', 'آفساید', 'فاول',
  ];

  let stats = null;
  const statsContainer = sectionContainer('آمار بازی');
  if (statsContainer) {
    stats = [];
    const allTextEls = Array.from(statsContainer.querySelectorAll('div, span'));
    for (const label of KNOWN_STAT_LABELS) {
      const labelEl = allTextEls.find(el => textOf(el) === label && el.children.length === 0);
      if (!labelEl) continue;

      // climb to a row-ish ancestor that also contains the two value elements
      let row = labelEl.parentElement;
      for (let i = 0; i < 3 && row; i++) {
        const pctSpans = Array.from(row.querySelectorAll('div, span'))
          .map(textOf).filter(t => /^%\d+$/.test(t));
        const numSpans = Array.from(row.querySelectorAll('span'))
          .filter(s => s.children.length === 0)
          .map(s => textOf(s))
          .filter(t => /^\d+$/.test(t));

        if (pctSpans.length >= 2) {
          stats.push({ stat_label: label, home_value: pctSpans[0], away_value: pctSpans[1] });
          break;
        }
        if (numSpans.length >= 2) {
          stats.push({ stat_label: label, home_value: numSpans[0], away_value: numSpans[1] });
          break;
        }
        row = row.parentElement;
      }
    }
  }

  return { lineup, stats };
}
"""


class LiveScoreBrowser:
    """Owns a single persistent Playwright browser/context for the service's lifetime.

    Two tabs are kept open on this one context/session/IP: `_page` reloads the
    livescore list every cycle, and `_detail_page` is used separately (and much
    less often) to visit individual match pages for lineups/stats, so those
    visits never block or slow down the regular 30s cycle.
    """

    def __init__(self):
        self._pw = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._detail_page: Optional[Page] = None
        self._lock = asyncio.Lock()
        self._detail_lock = asyncio.Lock()

    async def start(self):
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=config.HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self._context = await self._browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1366, "height": 900},
            locale="fa-IR",
            timezone_id="Asia/Tehran",
        )
        self._page = await self._context.new_page()
        self._detail_page = await self._context.new_page()

    async def stop(self):
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    async def _expand_all_football_dropdowns(self, page: Page, max_rounds: int = 6):
        """Click every closed football-match dropdown; repeat a few rounds since
        clicking one can shift layout / reveal previously-offscreen rows."""
        for _ in range(max_rounds):
            toggles = await page.query_selector_all(TOGGLE_SELECTOR)
            clicked_any = False
            for toggle in toggles:
                try:
                    # Skip if this row is already expanded (goal/sub/card icon present
                    # as a sibling further down) -- cheap DOM check via evaluate.
                    already_open = await toggle.evaluate(
                        """(el) => {
                            let row = el;
                            for (let i = 0; i < 8 && row; i++) {
                                if (row.querySelector(
                                    'img[src*="goal.svg"], img[src*="subtitute.svg"], '
                                    + 'img[src*="yellow-card"], img[src*="red-card"]'
                                )) return true;
                                row = row.parentElement;
                            }
                            return false;
                        }"""
                    )
                    if already_open:
                        continue
                    await toggle.scroll_into_view_if_needed()
                    await toggle.click(timeout=3000)
                    clicked_any = True
                    # human-ish pacing, and give the click's XHR time to resolve
                    await asyncio.sleep(random.uniform(0.15, 0.4))
                except Exception:
                    continue
            if not clicked_any:
                break
            # let any triggered network settle before the next round
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass

    async def run_cycle(self, save_html: bool = False) -> ScrapeResult:
        async with self._lock:
            start = time.monotonic()
            page = self._page
            await page.goto(config.TARGET_URL, wait_until="networkidle", timeout=45000)
            await self._expand_all_football_dropdowns(page)
            matches = await page.evaluate(EXTRACT_JS)
            html = await page.content() if save_html else None
            duration = time.monotonic() - start
            return ScrapeResult(matches=matches, html=html, duration_seconds=duration)

    async def fetch_match_detail(self, match_url: str) -> dict:
        """Visit one match's own page and extract lineup/stats. Uses the
        dedicated `_detail_page` tab so it never blocks the main 30s cycle.
        Returns {"lineup": {...} | None, "stats": [...] | None} -- both sides
        may legitimately be None/empty if that match doesn't have the data yet
        (lineup not announced, stats not populated), which is normal, not an error.
        """
        if match_url.startswith("/"):
            match_url = "https://www.varzesh3.com" + match_url

        async with self._detail_lock:
            page = self._detail_page
            await page.goto(match_url, wait_until="networkidle", timeout=45000)
            # small pause since some of this content can render just after
            # the network goes idle (client-side hydration)
            await asyncio.sleep(random.uniform(0.5, 1.2))
            result = await page.evaluate(DETAIL_EXTRACT_JS)
            return result


def save_html_snapshot(html: str) -> str:
    Path(config.RAW_HTML_DIR).mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    path = Path(config.RAW_HTML_DIR) / f"livescore-{ts}.html"
    path.write_text(html, encoding="utf-8")
    return str(path)
