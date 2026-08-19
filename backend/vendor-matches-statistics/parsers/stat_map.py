"""
Maps the Farsi labels used on a team's "team-statistic" page to stable,
English snake_case keys so the database doesn't depend on Farsi text.

If football360.ir adds a stat we haven't seen before, the parser will still
store it (auto-generating a slug key from the Farsi text) and log a warning
so you know to add a proper mapping here.
"""

KNOWN_STAT_LABELS = {
    "گل زده": "goals_scored",
    "میانگین گل زده در هر بازی": "avg_goals_scored_per_match",
    "گل خورده": "goals_conceded",
    "میانگین گل خورده در هر بازی": "avg_goals_conceded_per_match",
    "کلین‌شیت": "clean_sheets",
    "میانگین درصد مالکیت توپ": "avg_possession_percent",
    "برد": "wins",
    "درصد برد": "win_percent",
    "مساوی": "draws",
    "درصد مساوی": "draw_percent",
    "باخت": "losses",
    "درصد باخت": "loss_percent",
    "شوت": "shots",
    "شوت در چارچوب": "shots_on_target",
    "میانگین شوت در هر بازی": "avg_shots_per_match",
    "پنالتی گل کرده": "penalties_scored",
    "پنالتی از دست داده": "penalties_missed",
    "بازی‌های بدون گل زده": "scoreless_matches",
    "درصد بازی‌های بدون گل زده": "scoreless_match_percent",
    "تکل": "tackles",
    "میانگین تکل در هر بازی": "avg_tackles_per_match",
    "خطا": "fouls",
    "میانگین خطا در هر بازی": "avg_fouls_per_match",
    "کارت زرد": "yellow_cards",
    "میانگین کارت زرد در هر بازی": "avg_yellow_cards_per_match",
    "کارت قرمز": "red_cards",
    "میانگین کارت قرمز در هر بازی": "avg_red_cards_per_match",
    "کرنر": "corners",
    "میانگین کرنر در هر بازی": "avg_corners_per_match",
    "آفساید": "offsides",
    "میانگین آفساید در هر بازی": "avg_offsides_per_match",
}


def label_to_key(label: str) -> str:
    """Return the stable key for a Farsi stat label, or a fallback slug."""
    label = label.strip()
    if label in KNOWN_STAT_LABELS:
        return KNOWN_STAT_LABELS[label]
    # Fallback: deterministic slug from the raw text so re-scrapes are stable
    # even for stats we don't have a translation for yet.
    from persian_utils import fa_to_en_digits
    import re
    import unicodedata

    ascii_ish = unicodedata.normalize("NFKD", fa_to_en_digits(label))
    slug = re.sub(r"[^\w]+", "_", ascii_ish, flags=re.UNICODE).strip("_").lower()
    return f"unmapped_{slug}" if slug else "unmapped_stat"
