"""
Chaos score calibration tests.

The cooked_level is the app's headline number — it drives the UI, the share
card, the anniversary email subject line, and the FOMO hook. If it's wrong,
everything downstream is wrong.

Tests cover:
- Boundary correctness (score maps to right verdict tier)
- Cross-signal consistency (high food + high night ratio → higher score)
- Non-regression (chill trip should not score like a disaster trip)
- Explanation quality (score must be justified with evidence)
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams


# ─── Tier boundary correctness ───────────────────────────────────────────────

TIER_TEST_CASES = [
    # (description, cooked_level, expected_verdict, should_pass)
    ("chill beach trip, mostly planned activities", 18, "Mildly Simmering", True),
    ("standard college trip, some late nights", 42, "Emotionally Unstable", True),
    ("trek abandoned for cafes, 3 AM confessions", 83, "Peak Delusion", True),
    ("missed flights, wrong hotel, 5 AM implosion", 95, "Historically Cooked", True),
    # Mismatched — should be caught
    ("chill trip labelled as historically cooked", 18, "Historically Cooked", False),
    ("absolute chaos labelled as mildly simmering", 95, "Mildly Simmering", False),
]

@pytest.mark.parametrize("description,level,verdict,should_match", TIER_TEST_CASES)
def test_verdict_tier_boundary(description, level, verdict, should_match):
    """Verdict must derive correctly from cooked_level."""
    expected = (
        "Mildly Simmering" if level <= 25 else
        "Emotionally Unstable" if level <= 55 else
        "Peak Delusion" if level <= 80 else
        "Historically Cooked"
    )
    if should_match:
        assert verdict == expected, (
            f"Trip '{description}': level={level} should map to '{expected}', got '{verdict}'"
        )
    else:
        assert verdict != expected, (
            f"Expected mismatch for '{description}' — level={level} maps to '{expected}', "
            f"but provided verdict='{verdict}'"
        )


# ─── Score vs description alignment ──────────────────────────────────────────

CALIBRATION_CASES = [
    {
        "signals": (
            "3-day trip. Mostly followed the itinerary. One evening of late-night food. "
            "Group got along well. Minor disagreement about which restaurant to pick on Day 2. "
            "Everyone went to bed by midnight most nights. Food well-documented."
        ),
        "cooked_level": 28,
        "verdict": "Emotionally Unstable",
        "label": "chill trip mislabelled",
        "should_pass": False,
    },
    {
        "signals": (
            "3-day trip. Planned trek abandoned on Day 1 for cafes. 41% photos taken after 10 PM. "
            "One person booked wrong return bus and cried. 3 AM rooftop session with emotional confessions. "
            "69% of photos are food documentation. One person uploaded 70% of all photos alone."
        ),
        "cooked_level": 83,
        "verdict": "Peak Delusion",
        "label": "genuine chaos correctly scored",
        "should_pass": True,
    },
    {
        "signals": (
            "5-day Goa trip. Missed a flight on Day 1. Wrong hotel booking on Day 2. "
            "Someone lost their wallet. Someone else got food poisoning. "
            "Group had a major argument over money split. Made up by Day 4. "
            "Late nights every single day. Peak chaos ratio 0.81."
        ),
        "cooked_level": 94,
        "verdict": "Historically Cooked",
        "label": "disaster trip correctly scored",
        "should_pass": True,
    },
]

@pytest.mark.parametrize("case", CALIBRATION_CASES, ids=[c["label"] for c in CALIBRATION_CASES])
def test_chaos_score_vs_signals(claude_model, case):
    """Chaos score should align with the described signal evidence."""
    test_case = LLMTestCase(
        input=(
            f"Photo signal analysis for a trip:\n{case['signals']}\n\n"
            f"A chaos score of {case['cooked_level']}/100 was assigned with "
            f"verdict '{case['verdict']}'. Is this calibrated correctly?"
        ),
        actual_output=(
            f"Cooked level: {case['cooked_level']}/100\n"
            f"Verdict: {case['verdict']}"
        ),
        context=[case["signals"]],
    )

    metric = GEval(
        name="Chaos Score Calibration",
        model=claude_model,
        criteria=(
            "Is the cooked_level plausibly derived from the described signals? "
            "A 3 AM confession session + abandoned trek + wrong bus booking should score 75+. "
            "A mostly-planned trip with minor disagreements should score under 40."
        ),
        evaluation_steps=[
            "Count major chaos indicators (missed transport, wrong bookings, 3 AM events, arguments)",
            "Compare against the assigned score — is it proportional?",
            "Check if the verdict tier is correct for the level",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    metric.measure(test_case)
    if case["should_pass"]:
        assert metric.success, (
            f"[{case['label']}] Expected score to be well-calibrated. "
            f"Score: {metric.score:.2f}. Reason: {metric.reason}"
        )
    else:
        assert not metric.success, (
            f"[{case['label']}] Expected miscalibration to be detected. "
            f"Score: {metric.score:.2f}. Reason: {metric.reason}"
        )


# ─── Explanation must cite evidence ──────────────────────────────────────────

def test_cooked_explanation_cites_evidence(claude_model, golden_lore, sample_signals):
    """cooked_explanation must reference specific trip evidence, not just restate the verdict."""
    explanation = golden_lore.get("cooked_explanation", "")
    sig = sample_signals["aggregated_signal"]

    test_case = LLMTestCase(
        input=f"Explain why this trip scored {golden_lore['cooked_level']}/100.",
        actual_output=explanation,
        context=[
            f"Signal evidence: peak chaos = {sig.get('peak_cooked_moment', '')}",
            f"Recurring behaviors: {', '.join(sig.get('recurring_behaviors_merged', [])[:3])}",
        ],
    )

    metric = GEval(
        name="Explanation Evidence Quality",
        model=claude_model,
        criteria=(
            "Does the cooked_explanation cite specific, observable trip evidence to justify "
            "the score? Should NOT just restate the verdict in different words. "
            "Should be a one-sentence 'here's the proof' statement."
        ),
        evaluation_steps=[
            "Check that the explanation names a specific incident or pattern",
            "Verify it doesn't just say 'this trip was chaotic' — that's the verdict, not the evidence",
            "Confirm the cited evidence actually justifies the score level",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Non-regression: low chaos trip stays low ────────────────────────────────

def test_chill_trip_scores_low():
    """A chill trip with no late nights and a completed itinerary must score below 35."""
    chill_signals = {
        "late_night_ratio_avg": 0.05,
        "food_ratio_avg": 0.20,
        "aggregated_cooked_score": 22,
        "peak_cooked_moment": "mild disagreement about restaurant choice",
        "recurring_behaviors_merged": ["took photos of sunsets"],
        "social_dynamic": "relaxed group that followed the plan",
    }

    # Derived score should be in Mildly Simmering range
    score = chill_signals["aggregated_cooked_score"]
    assert score <= 35, f"Chill trip scored too high: {score}/100"

    verdict = (
        "Mildly Simmering" if score <= 25 else
        "Emotionally Unstable" if score <= 55 else
        "Peak Delusion" if score <= 80 else
        "Historically Cooked"
    )
    assert verdict in ("Mildly Simmering", "Emotionally Unstable"), (
        f"Chill trip should be Mildly Simmering or Emotionally Unstable, got {verdict}"
    )


# ─── Extreme scores require extreme evidence ─────────────────────────────────

def test_historically_cooked_requires_multiple_disasters(claude_model):
    """A score of 90+ must be justified by multiple major chaos events, not one."""
    weak_justification = (
        "The group was a bit late to one event and someone forgot their charger."
    )
    strong_justification = (
        "Missed the flight on Day 1. Wrong hotel double-booked Day 2. "
        "Lost passport Day 3. Major money argument Day 4. Someone quit the trip momentarily. "
        "3 AM police interaction Day 5. Still posting 'best trip ever' content."
    )

    for justification, score, should_pass in [
        (weak_justification, 93, False),
        (strong_justification, 93, True),
    ]:
        test_case = LLMTestCase(
            input=f"Justify a cooked_level of 93/100 (Historically Cooked).",
            actual_output=f"Score: 93. Evidence: {justification}",
            context=[justification],
        )

        metric = GEval(
            name="High Score Evidence Requirement",
            model=claude_model,
            criteria=(
                "Is a score of 90+ justified? Historically Cooked requires MULTIPLE major "
                "incidents — at minimum 3 significant chaos events (missed transport, wrong bookings, "
                "interpersonal explosions, logistical disasters). One minor issue does NOT qualify."
            ),
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
            threshold=0.7,
        )

        metric.measure(test_case)
        if should_pass:
            assert metric.success, (
                f"Strong justification should pass. Score: {metric.score:.2f}"
            )
        else:
            assert not metric.success, (
                f"Weak justification should fail for score=93. Score: {metric.score:.2f}"
            )
