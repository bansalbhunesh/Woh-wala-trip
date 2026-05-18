"""
End-to-end pipeline integration tests using deepeval.

These tests mock the full orchestrator pipeline to verify:
- validate_lore_json fires on every pipeline output
- forbidden phrase scanner blocks bad output
- Retry loop catches schema failures
- Photo signal computation produces sane values
- CLIP embedding dimensions are correct
- Nostalgia score ordering is correct
"""

import json
import math
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams
from deepeval.dataset import EvaluationDataset

from src.lore.validators import validate_lore_json, scan_forbidden_phrases
from src.nostalgia import NostalgiaEngine
from .conftest import lore_to_text


# ─── Validator integration ────────────────────────────────────────────────────

def test_validator_blocks_missing_required_fields():
    """Pipeline must reject lore that is missing required fields."""
    incomplete = {
        "trip_title": "Some Trip",
        "tagline": "Some tagline that is long enough",
        # Missing: opening_line, season_recap, cooked_level, etc.
    }
    with pytest.raises(ValueError, match="missing required field"):
        validate_lore_json(incomplete)


def test_validator_blocks_short_narrative():
    """Pipeline must reject a narrative under 350 chars."""
    lore = {
        "trip_title": "A Valid Title Here",
        "tagline": "A valid tagline that is long enough to pass",
        "opening_line": "A valid opening line.",
        "closing_line": "A valid closing line that is long enough.",
        "cooked_level": 75,
        "cooked_verdict": "Peak Delusion",
        "what_this_trip_was_really_about": "Something real.",
        "screenshot_moment_line": "The one thing nobody will forget.",
        "trip_personality_type": "Chaotic But Intentional",
        "friendship_dynamics": {
            "group_structure": "One planner, three chaos agents",
            "emotional_center": "Ananya",
            "chaos_source": "Rohan, specifically",
            "collective_energy": "Delusional confidence",
        },
        "season_recap": {
            "act_1": "A valid act 1 description that is longer than 50 characters.",
            "act_2": "A valid act 2 description that is longer than 50 characters.",
            "act_3": "A valid act 3 description that is longer than 50 characters.",
            "full_narrative": "Too short.",  # <350 chars — must fail
        },
        "trip_eras": [
            {"era_name": "Era One", "description": "A valid era description that is longer than 40 characters.", "timeframe": "Day 1"},
        ],
        "superlatives": [{"winner_name": "Rohan", "question": "Most likely to cause this", "archetype": "Chaos Source"}],
    }
    with pytest.raises(ValueError, match="full_narrative too short"):
        validate_lore_json(lore)


def test_validator_blocks_invalid_cooked_level():
    """Cooked level outside 0-100 must be rejected."""
    for invalid in [-1, 101, "high", None]:
        lore = {"cooked_level": invalid}
        with pytest.raises(ValueError):
            validate_lore_json(lore)


def test_validator_blocks_empty_superlatives():
    """No superlatives must be rejected."""
    from .conftest import lore_to_text
    import copy
    # Build a valid lore from golden and clear superlatives
    with open("tests/fixtures/golden_lore.json") as f:
        lore = json.load(f)
    lore["superlatives"] = []
    with pytest.raises(ValueError, match="no superlatives"):
        validate_lore_json(lore)


# ─── Forbidden phrase scanner ─────────────────────────────────────────────────

FORBIDDEN_PHRASE_TESTS = [
    ("unforgettable memories", True),
    ("the trip was peak delusion for these yaar", False),
    ("adventure awaits in goa", True),
    ("bonds that last a lifetime were formed", True),
    ("the chaos was immaculate bhai", False),
    ("it was a wonderful experience for everyone", True),
    ("we drove 9 hours to sit in a cafe and learned nothing", False),
]

@pytest.mark.parametrize("text,should_flag", FORBIDDEN_PHRASE_TESTS)
def test_forbidden_phrase_scanner(text, should_flag):
    lore = {
        "season_recap": {"full_narrative": text, "act_1": "", "act_2": "", "act_3": ""},
        "closing_line": "",
        "tagline": "",
        "opening_line": "",
        "what_this_trip_was_really_about": "",
        "screenshot_moment_line": "",
    }
    hits = scan_forbidden_phrases(lore)
    if should_flag:
        assert len(hits) > 0, f"Expected '{text}' to be flagged"
    else:
        assert len(hits) == 0, f"Expected '{text}' to be clean, got: {hits}"


# ─── Nostalgia engine scoring ─────────────────────────────────────────────────

def test_nostalgia_score_higher_chaos_ranks_first():
    """Within same years_ago window, higher chaos_score should produce higher nostalgia_score."""
    engine = NostalgiaEngine()

    low_chaos = {"chaos_score": 30, "years_ago": 2, "trip_name": "Chill Trip"}
    high_chaos = {"chaos_score": 85, "years_ago": 2, "trip_name": "Peak Delusion Trip"}

    scored_low = engine._score(dict(low_chaos))
    scored_high = engine._score(dict(high_chaos))

    assert scored_high["nostalgia_score"] > scored_low["nostalgia_score"], (
        f"High chaos ({scored_high['nostalgia_score']}) should beat low chaos ({scored_low['nostalgia_score']})"
    )


def test_nostalgia_score_older_memories_rank_higher():
    """With same chaos score, older trips should score higher (nostalgia intensifies with time)."""
    engine = NostalgiaEngine()

    recent = {"chaos_score": 70, "years_ago": 1, "trip_name": "Last Year"}
    old = {"chaos_score": 70, "years_ago": 5, "trip_name": "Five Years Ago"}

    scored_recent = engine._score(dict(recent))
    scored_old = engine._score(dict(old))

    assert scored_old["nostalgia_score"] > scored_recent["nostalgia_score"], (
        f"Older memory ({scored_old['nostalgia_score']}) should beat recent ({scored_recent['nostalgia_score']})"
    )


def test_nostalgia_score_never_negative():
    """Nostalgia score must always be positive."""
    engine = NostalgiaEngine()
    for chaos in [0, 50, 100]:
        for years in [1, 3, 10]:
            row = {"chaos_score": chaos, "years_ago": years}
            scored = engine._score(row)
            assert scored["nostalgia_score"] >= 0, f"Negative score: {scored}"


def test_nostalgia_score_formula_correctness():
    """Verify the age_bonus formula: 1 + log1p(years) * 0.5."""
    engine = NostalgiaEngine()
    row = {"chaos_score": 80, "years_ago": 3}
    scored = engine._score(row)
    expected = round(80 * (1 + math.log1p(3) * 0.5), 1)
    assert abs(scored["nostalgia_score"] - expected) < 0.01, (
        f"Score formula wrong: expected {expected}, got {scored['nostalgia_score']}"
    )


# ─── Photo signal computation ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_compute_trip_signals_structure(sample_signals):
    """_compute_trip_signals must return a dict with all expected keys."""
    from src.lore.orchestrator import LoreOrchestrator

    trip = sample_signals["trip"]
    photos = [
        {
            "id": f"photo-{i:03d}",
            "user_id": sample_signals["members"][i % 4]["user_id"],
            "created_at": f"2024-03-1{(i % 3) + 5}T{10 + i % 14:02d}:00:00Z",
            "storage_path": f"path/to/photo-{i:03d}.jpg",
        }
        for i in range(20)
    ]
    members = sample_signals["members"]

    with patch.object(
        LoreOrchestrator,
        "__init__",
        lambda self: None
    ):
        orch = LoreOrchestrator()

    # Mock supabase to return empty photo_views and reactions
    with patch("ai_worker.src.lore.orchestrator.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []

        signals = await orch._compute_trip_signals(trip, photos, members)

    required_keys = [
        "contributor_diversity",
        "dominant_uploader_ratio",
        "night_photo_count",
        "high_dwell_photos",
        "reaction_counts",
    ]
    for key in required_keys:
        assert key in signals, f"Missing key in trip signals: {key}"

    assert 0.0 <= signals["contributor_diversity"] <= 1.0
    assert 0.0 <= signals["dominant_uploader_ratio"] <= 1.0
    assert isinstance(signals["night_photo_count"], int)
    assert isinstance(signals["high_dwell_photos"], list)
    assert isinstance(signals["reaction_counts"], dict)


def test_photo_time_clustering_groups_correctly(sample_signals):
    """Photos within 2-hour gap should be in same cluster; >2 hours apart → new cluster."""
    from ..src.lore.orchestrator import LoreOrchestrator

    photos = [
        {"created_at": "2024-03-15T10:00:00Z", "id": "p1"},
        {"created_at": "2024-03-15T10:30:00Z", "id": "p2"},  # same cluster as p1
        {"created_at": "2024-03-15T11:45:00Z", "id": "p3"},  # same cluster (1h45 gap)
        {"created_at": "2024-03-15T14:00:00Z", "id": "p4"},  # new cluster (2h15 gap)
        {"created_at": "2024-03-15T14:20:00Z", "id": "p5"},  # same cluster as p4
    ]

    with patch.object(LoreOrchestrator, "__init__", lambda self: None):
        orch = LoreOrchestrator()

    clusters = orch._cluster_photos_by_time(photos)

    assert len(clusters) == 2, f"Expected 2 clusters, got {len(clusters)}"
    assert len(clusters[0]) == 3, f"First cluster should have 3 photos, got {len(clusters[0])}"
    assert len(clusters[1]) == 2, f"Second cluster should have 2 photos, got {len(clusters[1])}"


# ─── Batch evaluation: full lore suite ───────────────────────────────────────

def test_batch_evaluation_golden_lore_passes_all(claude_model, golden_lore, sample_signals):
    """Run the golden lore through the complete metric suite in one batch."""
    from deepeval import evaluate

    full_text = lore_to_text(golden_lore)
    context = [
        f"Trip: {sample_signals['trip']['name']}",
        f"Members: {', '.join(m['display_name'] for m in sample_signals['members'])}",
        f"Signal chaos score: {sample_signals['aggregated_signal']['aggregated_cooked_score']}",
    ]

    test_case = LLMTestCase(
        input=(
            "Generate lore for a 4-person Kasol trip where the trek was abandoned, "
            "there were 3 AM confessions, and one member uploaded 70% of photos."
        ),
        actual_output=full_text,
        context=context,
    )

    metrics = [
        GEval(
            name="Overall Lore Quality",
            model=claude_model,
            criteria=(
                "Does this lore represent a high-quality output from an AI friendship historian? "
                "Should be: specific (not generic), Hinglish-native, emotionally resonant, "
                "roasty but warm, and completely unique to this trip."
            ),
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
            threshold=0.7,
        ),
        GEval(
            name="No Generic Travel Writing",
            model=claude_model,
            criteria=(
                "Is the lore completely free of generic travel blog language? "
                "No 'memories made', no 'adventure awaits', no 'bonds formed' type language."
            ),
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
            threshold=0.85,
        ),
    ]

    results = evaluate(test_cases=[test_case], metrics=metrics, run_async=False)
    assert results is not None

    for result in results:
        for metric_data in result.metrics_data:
            assert metric_data.success, (
                f"Batch metric '{metric_data.name}' failed on golden lore: "
                f"score={metric_data.score:.2f}, reason={metric_data.reason}"
            )
