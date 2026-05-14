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
]


def validate_lore_json(lore: dict):
    """Raise ValueError if lore doesn't meet quality bar."""
    if not isinstance(lore, dict):
        raise ValueError("lore must be a dict")
    
    required = ["trip_title", "tagline", "opening_line", "storyline", "trip_eras", 
                "chaos_score", "closing_line"]
    for field in required:
        if field not in lore:
            raise ValueError(f"missing required field: {field}")


def scan_forbidden_phrases(lore: dict) -> list[str]:
    """Return list of forbidden phrases detected. Empty list = clean."""
    text_to_scan = (
        lore.get("storyline", {}).get("full_narrative", "") + " " +
        lore.get("closing_line", "") + " " +
        lore.get("tagline", "") + " " +
        lore.get("opening_line", "")
    ).lower()
    
    return [phrase for phrase in FORBIDDEN_PHRASES if phrase in text_to_scan]
