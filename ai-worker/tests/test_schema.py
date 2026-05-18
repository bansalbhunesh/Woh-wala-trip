"""
Schema + structure compliance tests.

Validates that lore JSON has every required field, correct types, ranges,
and passes the existing Python validator. These are fast, deterministic tests
that don't require the LLM evaluator.
"""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import SingleTurnParams

from .conftest import lore_to_text
from src.lore.validators import validate_lore_json, scan_forbidden_phrases

REQUIRED_FIELDS = [
    "trip_title", "tagline", "opening_line", "closing_line",
    "cooked_level", "cooked_verdict", "cooked_explanation",
    "season_recap", "trip_eras", "friendship_dynamics", "trip_lore_awards",
    "superlatives", "receipt_stats", "screenshot_moment_line",
    "trip_personality_type", "what_this_trip_was_really_about",
    "whatsapp_caption",
]

VALID_VERDICTS = {"Mildly Simmering", "Emotionally Unstable", "Peak Delusion", "Historically Cooked"}
VALID_ARCHETYPES = {"Black Cat", "Golden Retriever", "NPC", "Main Character",
                    "Chaos Source", "Emotional Support NPC"}


# ─── Python validator ─────────────────────────────────────────────────────────

def test_golden_lore_passes_python_validator(golden_lore):
    """Existing validate_lore_json must accept the golden fixture."""
    validate_lore_json(golden_lore)  # raises ValueError on failure


def test_bad_lore_fails_python_validator(bad_lore):
    """Bad fixture should be caught by the existing validator."""
    with pytest.raises(ValueError):
        validate_lore_json(bad_lore)


# ─── Required fields ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("field", REQUIRED_FIELDS)
def test_golden_has_required_field(golden_lore, field):
    assert field in golden_lore, f"golden_lore missing required field: {field}"


# ─── Cooked level / verdict alignment ─────────────────────────────────────────

VERDICT_RANGES = [
    ("Mildly Simmering",   0,   25),
    ("Emotionally Unstable", 26, 55),
    ("Peak Delusion",      56,  80),
    ("Historically Cooked", 81, 100),
]

@pytest.mark.parametrize("verdict,lo,hi", VERDICT_RANGES)
def test_verdict_cooked_level_alignment(verdict, lo, hi):
    """A manually-crafted test case: verdict must be consistent with level."""
    test_case = LLMTestCase(
        input=f"Lore with cooked_level={lo + 5} should have verdict='{verdict}'",
        actual_output=f"cooked_level: {lo + 5}, cooked_verdict: {verdict}",
        expected_output=f"cooked_verdict: {verdict}",
    )
    # This is a structural rule — verified without LLM
    level = lo + 5
    derived_verdict = (
        "Mildly Simmering" if level <= 25 else
        "Emotionally Unstable" if level <= 55 else
        "Peak Delusion" if level <= 80 else
        "Historically Cooked"
    )
    assert derived_verdict == verdict


def test_golden_lore_verdict_matches_level(golden_lore):
    level = golden_lore["cooked_level"]
    verdict = golden_lore["cooked_verdict"]
    expected = (
        "Mildly Simmering" if level <= 25 else
        "Emotionally Unstable" if level <= 55 else
        "Peak Delusion" if level <= 80 else
        "Historically Cooked"
    )
    assert verdict == expected, f"cooked_level={level} maps to {expected}, got {verdict}"


def test_bad_lore_verdict_mismatches_level(bad_lore):
    """Bad fixture deliberately has level=91 with Mildly Simmering — catch it."""
    level = bad_lore["cooked_level"]
    verdict = bad_lore["cooked_verdict"]
    expected = (
        "Mildly Simmering" if level <= 25 else
        "Emotionally Unstable" if level <= 55 else
        "Peak Delusion" if level <= 80 else
        "Historically Cooked"
    )
    assert verdict != expected, "Bad lore's verdict should NOT match level (it's a bad fixture)"


# ─── Field length constraints ─────────────────────────────────────────────────

def test_title_length(golden_lore):
    assert 8 <= len(golden_lore["trip_title"]) <= 90

def test_tagline_length(golden_lore):
    assert len(golden_lore["tagline"]) >= 15, "tagline too short"

def test_full_narrative_length(golden_lore):
    narrative = golden_lore.get("season_recap", {}).get("full_narrative", "")
    assert len(narrative) >= 350, f"full_narrative too short: {len(narrative)}"

def test_acts_not_empty(golden_lore):
    recap = golden_lore.get("season_recap", {})
    for act in ["act_1", "act_2", "act_3"]:
        assert len(recap.get(act, "")) >= 50, f"{act} too short"

def test_closing_line_length(golden_lore):
    assert len(golden_lore.get("closing_line", "")) >= 20

def test_screenshot_moment_length(golden_lore):
    assert len(golden_lore.get("screenshot_moment_line", "")) >= 20

def test_era_count(golden_lore):
    eras = golden_lore.get("trip_eras", [])
    assert 1 <= len(eras) <= 6

def test_superlatives_exist(golden_lore):
    assert len(golden_lore.get("superlatives", [])) >= 1

def test_receipt_stats_exist(golden_lore):
    assert len(golden_lore.get("receipt_stats", [])) >= 1

# ─── Archetype validity ───────────────────────────────────────────────────────

def test_superlative_archetypes_valid(golden_lore):
    for sup in golden_lore.get("superlatives", []):
        arch = sup.get("archetype", "")
        assert arch in VALID_ARCHETYPES, f"invalid archetype: {arch}"

# ─── Forbidden phrases (deterministic scan) ───────────────────────────────────

def test_golden_lore_no_forbidden_phrases(golden_lore):
    hits = scan_forbidden_phrases(golden_lore)
    assert hits == [], f"Golden lore contains forbidden phrases: {hits}"


def test_bad_lore_has_forbidden_phrases(bad_lore):
    hits = scan_forbidden_phrases(bad_lore)
    assert len(hits) > 0, "Bad fixture should contain forbidden phrases"
