FORBIDDEN_PHRASES = [
    "unforgettable memories",
    "magical experience",
    "bonds that last a lifetime",
    "adventure awaits",
    "once in a lifetime",
    "creating memories",
    "trip of a lifetime",
    "wonderful experience",
    "amazing memories",
    "cherish forever",
    "beautiful memories",
    "truly special",
]


def validate_lore_json(lore: dict):
    """Raise ValueError if lore doesn't meet quality bar."""
    if not isinstance(lore, dict):
        raise ValueError("lore must be a dict")

    required = ["trip_title", "tagline", "opening_line", "season_recap",
                "cooked_level", "cooked_verdict", "closing_line"]
    for field in required:
        if field not in lore:
            raise ValueError(f"missing required field: {field}")

    if not (5 <= len(lore["trip_title"]) <= 80):
        raise ValueError(f"trip_title length out of range: {len(lore['trip_title'])}")

    narrative = lore.get("season_recap", {}).get("full_narrative", "")
    if len(narrative) < 150:
        raise ValueError(f"narrative too short: {len(narrative)} chars")

    level = lore.get("cooked_level")
    if not isinstance(level, (int, float)) or not (0 <= level <= 100):
        raise ValueError(f"invalid cooked_level: {level}")

    eras = lore.get("trip_eras", [])
    if not (1 <= len(eras) <= 5):
        raise ValueError(f"era count must be 1-5, got {len(eras)}")


def scan_forbidden_phrases(lore: dict) -> list[str]:
    """Return list of forbidden phrases detected. Empty list = clean."""
    text_to_scan = " ".join([
        lore.get("season_recap", {}).get("full_narrative", ""),
        lore.get("closing_line", ""),
        lore.get("tagline", ""),
        lore.get("opening_line", ""),
        lore.get("what_this_trip_was_really_about", ""),
    ]).lower()

    return [p for p in FORBIDDEN_PHRASES if p in text_to_scan]
