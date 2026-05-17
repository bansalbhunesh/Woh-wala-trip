"""
Signal faithfulness tests.

The lore must be grounded in the photo signals that were extracted.
A lore that invents events not present in the signal data is hallucinating.
These tests catch: invented names, wrong chaos scores, fabricated moments,
and claims that contradict the raw signal evidence.
"""

import json
import pytest
from deepeval import assert_test
from deepeval.metrics import FaithfulnessMetric, HallucinationMetric, GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from .conftest import lore_to_text, signals_to_context


# ─── Lore is faithful to signal context ──────────────────────────────────────

def test_lore_faithful_to_signals(claude_model, golden_lore, sample_signals):
    """Every specific claim in the lore must be traceable to the signal data."""
    full_text = lore_to_text(golden_lore)
    context = signals_to_context(sample_signals)
    sig = sample_signals["aggregated_signal"]

    retrieval_context = [
        context,
        f"Recurring behaviors observed: {', '.join(sig.get('recurring_behaviors_merged', []))}",
        f"Identity trends: MVP={sig['identity_trends']['mvp_candidate']}, "
        f"Villain={sig['identity_trends']['villain_candidate']}, "
        f"Main character={sig['identity_trends']['main_character_candidate']}",
        f"Peak chaos moment described as: {sig.get('peak_cooked_moment', '')}",
        f"Photographer dynamic: {sig.get('photographer_dynamic', '')}",
        f"Food obsession: {sig.get('food_obsession_level', '')}",
    ]

    test_case = LLMTestCase(
        input=(
            "Generate lore grounded in the photo signal analysis. "
            "Every specific claim must be supported by the evidence."
        ),
        actual_output=full_text,
        retrieval_context=retrieval_context,
    )

    metric = FaithfulnessMetric(
        model=claude_model,
        threshold=0.7,
        include_reason=True,
    )

    assert_test(test_case, [metric])


# ─── No hallucinated events ───────────────────────────────────────────────────

def test_no_hallucinated_specific_claims(claude_model, golden_lore, sample_signals):
    """Lore must not invent specific events not present in the signals."""
    full_text = lore_to_text(golden_lore)
    sig = sample_signals["aggregated_signal"]

    context = [
        signals_to_context(sample_signals),
        f"Peak chaos moment: {sig.get('peak_cooked_moment', '')}",
        f"Recurring behaviors: {json.dumps(sig.get('recurring_behaviors_merged', []))}",
        f"Trip members: {', '.join(m['display_name'] for m in sample_signals['members'])}",
    ]

    test_case = LLMTestCase(
        input="Write trip lore that is entirely grounded in the signal evidence.",
        actual_output=full_text,
        context=context,
    )

    metric = HallucinationMetric(
        model=claude_model,
        threshold=0.85,
        include_reason=True,
    )

    assert_test(test_case, [metric])


# ─── Chaos score calibration vs signal ───────────────────────────────────────

def test_chaos_score_justified_by_signals(claude_model, golden_lore, sample_signals):
    """The cooked_level must be justifiable from the photo signal evidence."""
    level = golden_lore["cooked_level"]
    explanation = golden_lore.get("cooked_explanation", "")
    context = signals_to_context(sample_signals)
    sig = sample_signals["aggregated_signal"]

    test_case = LLMTestCase(
        input=(
            f"Photo signals suggest chaos score of {sig['aggregated_cooked_score']}/100. "
            f"Is a final score of {level}/100 justified?"
        ),
        actual_output=f"Cooked level: {level}/100. Explanation: {explanation}",
        context=[context],
        expected_output=f"Score around {sig['aggregated_cooked_score']} is justified by the signal evidence.",
    )

    metric = GEval(
        name="Chaos Score Signal Alignment",
        model=claude_model,
        criteria=(
            "Is the cooked_level consistent with the photo signal evidence? "
            "The score should match the aggregated_cooked_score from signals "
            "(within ±15 points) and the explanation must cite specific signal evidence."
        ),
        evaluation_steps=[
            f"Check that {level}/100 is within ±15 of the signal score ({sig['aggregated_cooked_score']})",
            "Verify the explanation cites at least one specific signal-derived fact",
            "Confirm the score is not arbitrary — there's a clear evidentiary basis",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Member names come from actual data ──────────────────────────────────────

def test_member_names_in_lore_match_trip_data(golden_lore, sample_signals):
    """Lore must reference only members who are actually on the trip."""
    member_names = {m["display_name"].lower() for m in sample_signals["members"]}
    full_text = lore_to_text(golden_lore).lower()

    # Extract names mentioned in the lore
    # We check that all names prominently mentioned ARE in the member list
    invented_names_found = []
    # Common names in the lore - check against member list
    import re
    # Find capitalized names (rough heuristic — proper nouns in the lore)
    potential_names = re.findall(r'\b([A-Z][a-z]{2,})\b', lore_to_text(golden_lore))
    non_member_names = []
    for name in potential_names:
        name_lower = name.lower()
        # Skip common English words
        skip = {"this", "that", "the", "and", "but", "was", "for", "had",
                 "they", "their", "trek", "cafe", "day", "trip", "hour",
                 "kasol", "group", "hostel", "parvati", "valley", "delhi",
                 "maggi", "reel", "instagram", "whatsapp", "act", "era"}
        if name_lower not in skip and len(name) > 3:
            if name_lower not in member_names:
                non_member_names.append(name)

    # Allow at most 3 non-member proper nouns (places, brands, etc.)
    assert len(non_member_names) <= 5, (
        f"Lore mentions potentially invented names not in member list: {set(non_member_names)}"
    )


# ─── Superlative winners are real members ────────────────────────────────────

def test_superlative_winners_are_members(golden_lore, sample_signals):
    """Every superlative winner must be in the actual member list."""
    member_names = {m["display_name"].lower() for m in sample_signals["members"]}
    for sup in golden_lore.get("superlatives", []):
        winner = sup.get("winner_name", "").lower()
        # Allow "group" as a collective winner
        if winner not in ("group", "everyone", "the group"):
            assert winner in member_names, (
                f"Superlative winner '{winner}' is not in trip members: {member_names}"
            )


# ─── MVP/Villain/Main character from signals ─────────────────────────────────

def test_trip_awards_align_with_signal_identity_trends(claude_model, golden_lore, sample_signals):
    """trip_lore_awards must credit/blame people identified in signal identity_trends."""
    awards = golden_lore.get("trip_lore_awards", {})
    trends = sample_signals["aggregated_signal"]["identity_trends"]

    awards_text = (
        f"MVP: {awards.get('trip_mvp', '')}\n"
        f"Villain: {awards.get('trip_villain', '')}\n"
        f"Core memory: {awards.get('core_memory', '')}"
    )

    test_case = LLMTestCase(
        input=(
            f"Assign awards based on signal analysis: "
            f"MVP candidate={trends['mvp_candidate']}, "
            f"Villain candidate={trends['villain_candidate']}, "
            f"Main character={trends['main_character_candidate']}"
        ),
        actual_output=awards_text,
        context=[
            f"Signal identity trends: {json.dumps(trends)}",
            f"Social dynamic: {sample_signals['aggregated_signal']['social_dynamic']}",
        ],
    )

    metric = GEval(
        name="Awards Signal Alignment",
        model=claude_model,
        criteria=(
            "Are the trip awards consistent with the signal-identified candidates? "
            "The MVP should match or plausibly correspond to the signal MVP candidate, "
            "and the villain should align with the signal villain candidate."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Receipt stats grounded in signal numbers ────────────────────────────────

def test_receipt_stats_grounded_in_data(claude_model, golden_lore, sample_signals):
    """Stats that claim specific numbers should be traceable to real signal values."""
    stats = golden_lore.get("receipt_stats", [])
    stats_text = "\n".join(
        f"{s['label']}: {s['value']} {s.get('unit', '')}" for s in stats
    )
    sig = sample_signals["aggregated_signal"]

    context = [
        f"Total photos: {sig['total_photos']}",
        f"Duration: {sig['duration_days']} days",
        f"Member count: {len(sample_signals['members'])}",
        f"Food ratio: {sig['food_ratio_avg']:.0%}",
        f"Late night ratio: {sig['late_night_ratio_avg']:.0%}",
        f"Peak chaos moment: {sig.get('peak_cooked_moment', '')}",
    ]

    test_case = LLMTestCase(
        input="Generate receipt stats based on the real trip data.",
        actual_output=stats_text,
        context=context,
    )

    metric = GEval(
        name="Stats Grounded In Data",
        model=claude_model,
        criteria=(
            "Are the stats plausibly derived from the real trip data? "
            "Numbers should be consistent with the actual metrics (photo count, duration, ratios). "
            "Creative extrapolation is fine; impossible numbers are not."
        ),
        evaluation_steps=[
            "Check that photo-count stats are plausible given total_photos=127",
            "Verify duration-based stats fit within 3 days",
            "Confirm made-up stats (like confession count) are reasonable given a 4-person group",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])
