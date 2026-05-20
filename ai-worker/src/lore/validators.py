FORBIDDEN_PHRASES = [
    # Generic travel blog
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
    "making memories",
    "memories to last",
    "journey of a lifetime",
    "breathtaking views",
    "breathtaking experience",
    "picturesque",
    "wanderlust",
    "bucket list",
    "life-changing",
    "heartwarming",
    "so much fun",
    "had a blast",
    "great time was had",
    "good vibes only",
    "living our best lives",
    "blessed",
    "grateful for",
    "the best trip ever",
    "10/10 would recommend",
    # Generic relationship platitudes
    "stronger than ever",
    "unbreakable bond",
    "friendship goals",
    "squad goals",
    "memories that will last",
    "laughter and love",
    # Generic character labels (too sanitized)
    "everyone had a role",
    "each person contributed",
    # Prompt injection / AI self-referential output
    "as an ai",
    "i am an ai",
    "i cannot",
    "i'm unable",
    "language model",
    "large language model",
    "ai assistant",
    "i don't have access to",
    "i was not trained",
    "chatgpt",
    "gpt-4",
    "claude",
    # Tourist-board clichés specific to Indian travel
    "incredible india",
    "god's own country",
    "the group had an amazing time",
    "memories that will last forever",
]


def validate_lore_json(lore: dict):
    """Raise ValueError if lore doesn't meet quality bar."""
    if not isinstance(lore, dict):
        raise ValueError("lore must be a dict")

    required = [
        "trip_title", "tagline", "opening_line", "season_recap",
        "cooked_level", "cooked_verdict", "closing_line",
        "what_this_trip_was_really_about", "screenshot_moment_line",
        "trip_personality_type", "friendship_dynamics",
    ]
    for field in required:
        if field not in lore:
            raise ValueError(f"missing required field: {field}")

    # Title quality
    title = lore["trip_title"]
    if not (8 <= len(title) <= 90):
        raise ValueError(f"trip_title length out of range: {len(title)}")

    # Tagline quality — must be specific
    tagline = lore.get("tagline", "")
    if len(tagline) < 15:
        raise ValueError(f"tagline too generic/short: {len(tagline)} chars")

    # Full narrative quality bar — must be substantial and specific
    narrative = lore.get("season_recap", {}).get("full_narrative", "")
    if len(narrative) < 350:
        raise ValueError(f"full_narrative too short: {len(narrative)} chars — needs to be substantial")

    # Acts must be trip-specific, not generic
    recap = lore.get("season_recap", {})
    for act in ["act_1", "act_2", "act_3"]:
        act_text = recap.get(act, "")
        if len(act_text) < 50:
            raise ValueError(f"{act} too short: {len(act_text)} chars")
        # Catch the hardcoded placeholder outputs
        generic_acts = [
            "everyone pretending to be normal before the chaos started",
            "the collective emotional downfall",
            "the trauma-bonding phase",
        ]
        if act_text.strip().lower() in generic_acts:
            raise ValueError(f"{act} is the hardcoded placeholder — generate specific content")

    # Cooked level sanity
    level = lore.get("cooked_level")
    if not isinstance(level, (int, float)) or not (0 <= level <= 100):
        raise ValueError(f"invalid cooked_level: {level}")

    # Era count and quality
    eras = lore.get("trip_eras", [])
    if not (1 <= len(eras) <= 6):
        raise ValueError(f"era count must be 1-6, got {len(eras)}")
    for i, era in enumerate(eras):
        if not era.get("era_name") or len(era.get("era_name", "")) < 3:
            raise ValueError(f"era {i} has empty/short era_name")
        if not era.get("description") or len(era.get("description", "")) < 40:
            raise ValueError(f"era {i} description too short")

    # Superlatives — should have at least one
    superlatives = lore.get("superlatives", [])
    if len(superlatives) == 0:
        raise ValueError("no superlatives generated")

    # Closing line quality
    closing = lore.get("closing_line", "")
    if len(closing) < 20:
        raise ValueError(f"closing_line too short: {len(closing)}")

    # Screenshot moment must be punchy
    screenshot = lore.get("screenshot_moment_line", "")
    if len(screenshot) < 20:
        raise ValueError(f"screenshot_moment_line too short")

    # Opening line — first thing the group reads; must be specific, not generic
    opening = lore.get("opening_line", "")
    if len(opening) < 30:
        raise ValueError(f"opening_line too short: {len(opening)} chars")
    _generic_openers = [
        "you and your friends",
        "this group of friends",
        "a group that",
        "the trip began",
        "once upon a time",
        "it all started",
    ]
    if any(phrase in opening.lower() for phrase in _generic_openers):
        raise ValueError(f"opening_line is generic: {opening[:60]!r}")

    # Receipt stats — must not be placeholder garbage
    stats = lore.get("receipt_stats", [])
    _generic_stat_labels = {"fun had", "memories made", "adventures completed", "smiles shared", "good vibes"}
    for stat in stats:
        label = stat.get("label", "").lower().strip()
        if label in _generic_stat_labels:
            raise ValueError(f"Generic receipt stat detected: {stat.get('label')!r}")

    # Whatsapp caption — the literal line a member will paste into their group chat.
    # Reject template-y openings that scream "this is from a marketing app".
    caption = lore.get("whatsapp_caption", "")
    if caption:
        cl = caption.lower().strip()
        _caption_red_flags = [
            "check this out",
            "you guys",
            "you all",
            "made memories",
            "look what we",
            "look at this",
            "amazing trip",
            "best trip ever",
        ]
        for flag in _caption_red_flags:
            if flag in cl:
                raise ValueError(f"whatsapp_caption contains generic phrasing: {flag!r}")
        # Length sanity — prompt says max 25 words.
        if len(caption.split()) > 35:
            raise ValueError(f"whatsapp_caption too long: {len(caption.split())} words")

    # Screenshot moment — must reference SOMETHING. Reject the hedged generic.
    screenshot_line = lore.get("screenshot_moment_line", "").lower()
    if screenshot_line:
        _hedge_words = ["sometimes", "often", "usually", "most of the time", "every now and then"]
        for hedge in _hedge_words:
            if hedge in screenshot_line:
                raise ValueError(
                    f"screenshot_moment_line uses hedge word {hedge!r} — must be declarative present tense"
                )

    # Dead archetype labels — the prompt now forbids these in any field. Defend at
    # the validator layer too, because schema-followers love resurrecting them.
    _dead_archetypes = {
        "black cat", "golden retriever", "main character",
        "chaos source", "emotional support npc",
    }
    # Plain "NPC" is too short to safely substring-match (matches "NPCs in the chat"),
    # but the case-exact label as a standalone word is checked below.
    def _archetype_text(value):
        if isinstance(value, str):
            return value.lower().strip()
        return ""
    for sup in lore.get("superlatives", []) or []:
        arch = _archetype_text(sup.get("archetype"))
        if arch in _dead_archetypes or arch == "npc":
            raise ValueError(
                f"superlative.archetype uses dead platform label {arch!r} — must be specific"
            )
    # Character roles (rendered inline by the trip room) — same rule.
    for role in lore.get("character_roles", []) or []:
        arch = _archetype_text(role.get("archetype"))
        if arch in _dead_archetypes or arch == "npc":
            raise ValueError(
                f"character_role.archetype uses dead platform label {arch!r} — must be specific"
            )

    # Group anthem — must have at least a title and reason if present
    anthem = lore.get("group_anthem")
    if anthem is not None:
        if not isinstance(anthem, dict):
            raise ValueError("group_anthem must be a dict")
        if not anthem.get("title"):
            raise ValueError("group_anthem.title is missing or empty")
        if not anthem.get("reason"):
            raise ValueError("group_anthem.reason is missing or empty")


def scan_forbidden_phrases(lore: dict) -> list[str]:
    """Return list of forbidden phrases detected. Empty list = clean."""
    recap = lore.get("season_recap") or {}
    anthem = lore.get("group_anthem") or {}
    dynamics = lore.get("friendship_dynamics") or {}
    awards = lore.get("trip_lore_awards") or {}

    text_to_scan = " ".join([
        # Core narrative fields
        recap.get("full_narrative", ""),
        recap.get("act_1", ""),
        recap.get("act_2", ""),
        recap.get("act_3", ""),
        lore.get("closing_line", ""),
        lore.get("opening_line", ""),
        lore.get("what_this_trip_was_really_about", ""),
        # Share-card fields — these are the most likely to regress
        lore.get("tagline", ""),
        lore.get("screenshot_moment_line", ""),
        lore.get("whatsapp_caption", ""),
        lore.get("trip_title", ""),
        lore.get("trip_personality_type", ""),
        lore.get("cooked_explanation", ""),
        # Group dynamics
        dynamics.get("group_structure", ""),
        dynamics.get("collective_energy", ""),
        awards.get("core_memory", ""),
        # Anthem
        anthem.get("reason", ""),
    ]).lower()

    return [p for p in FORBIDDEN_PHRASES if p in text_to_scan]
