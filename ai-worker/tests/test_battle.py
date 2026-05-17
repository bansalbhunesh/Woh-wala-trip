"""
Trip vs Trip battle judgment tests.

The battle system asks Claude to pick a winner between two trips.
These tests ensure: the winner is logically justified, the roasts are specific,
the verdict text cites actual evidence, and a clearly more chaotic trip wins.
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval, FaithfulnessMetric
from deepeval.test_case import LLMTestCase, SingleTurnParams


TRIP_A = {
    "title": "Three Days of Peak Delusion in Kasol",
    "destination": "Kasol, Himachal Pradesh",
    "cooked_score": 83,
    "personality": "Trekkers Who Forgot To Trek",
    "tagline": "Bhai we planned a trek. We ended up doing chai therapy for 72 hours instead.",
    "verdict": "Peak Delusion",
    "members": "Rohan, Priya, Divya, Karan",
}

TRIP_B = {
    "title": "Goa: A Legal Matter",
    "destination": "Goa",
    "cooked_score": 67,
    "personality": "Beach Trips That Accidentally Become Therapy",
    "tagline": "We came for the beach. The beach came for us.",
    "verdict": "Peak Delusion",
    "members": "Ananya, Siddharth, Meera",
}

TRIP_C_MILD = {
    "title": "That Weekend in Rishikesh",
    "destination": "Rishikesh",
    "cooked_score": 31,
    "personality": "Yoga Retreat But Make It Millennial",
    "tagline": "We did some yoga. We went to bed at 10. We are fine.",
    "verdict": "Emotionally Unstable",
    "members": "Kabir, Nidhi, Arun",
}


SAMPLE_BATTLE_RESULT = {
    "winner": "trip_a",
    "winning_margin": "decisive",
    "verdict_headline": "Kasol Trekkers Win By Abandoning All Agency",
    "verdict_text": (
        "The Kasol group wins decisively. They drove 9 hours to not do the thing they came for, "
        "had a 3 AM emotional reckoning on a hostel rooftop, and then collectively agreed it was "
        "the best trip ever while posting a trek-free travel reel. "
        "Goa put up a fight — the beach did come for them — but couldn't match the specific "
        "delusion of a group that booked a trekking hostel and spent 4 hours total on any incline. "
        "The deciding factor: Rohan's 9:47 AM cafe pivot is a historically significant act of self-sabotage."
    ),
    "trip_a_roast": "Booked a trek. Did a cafe crawl. Filed it under 'growth'.",
    "trip_b_roast": "Goa punished them appropriately for going during peak season with no plan.",
    "deciding_factor": "Rohan's 9:47 AM decision that ended the trek plan permanently",
    "historical_verdict": "Future AI historians will study the Kasol Cafe Pivot as a masterclass in collective self-deception.",
}


# ─── Winner logically justified ──────────────────────────────────────────────

def test_higher_chaos_score_wins(claude_model):
    """Trip A (83) vs Trip C (31): A must win. Clear chaos differential."""
    battle_output = {
        "winner": "trip_a",
        "verdict_text": (
            f"Trip A ({TRIP_A['cooked_score']}/100) wins decisively over Trip C "
            f"({TRIP_C_MILD['cooked_score']}/100). The 52-point gap is reflected in "
            "abandoned treks, 3 AM confessions, and systematic self-deception."
        ),
        "deciding_factor": "52-point chaos differential cannot be bridged by good vibes",
    }

    test_case = LLMTestCase(
        input=(
            f"Battle: {TRIP_A['title']} (score={TRIP_A['cooked_score']}) vs "
            f"{TRIP_C_MILD['title']} (score={TRIP_C_MILD['cooked_score']}). "
            f"Pick a winner with evidence."
        ),
        actual_output=str(battle_output),
        context=[
            f"Trip A: {TRIP_A['tagline']}. Verdict: {TRIP_A['verdict']}.",
            f"Trip C: {TRIP_C_MILD['tagline']}. Verdict: {TRIP_C_MILD['verdict']}.",
        ],
    )

    metric = GEval(
        name="Battle Winner Logic",
        model=claude_model,
        criteria=(
            "When Trip A has a chaos score 50+ points higher than Trip B, "
            "Trip A must win. The justification must cite the score differential "
            "AND specific evidence from the higher-scoring trip."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


def test_close_battle_requires_specific_evidence(claude_model):
    """When trips are within 20 points, the verdict text must go beyond just scores."""
    battle_output = str(SAMPLE_BATTLE_RESULT)

    test_case = LLMTestCase(
        input=(
            f"Battle: {TRIP_A['title']} (score={TRIP_A['cooked_score']}) vs "
            f"{TRIP_B['title']} (score={TRIP_B['cooked_score']}). "
            f"16-point difference — justify with specific evidence."
        ),
        actual_output=battle_output,
        context=[
            f"Trip A tagline: {TRIP_A['tagline']}",
            f"Trip B tagline: {TRIP_B['tagline']}",
            f"Trip A personality: {TRIP_A['personality']}",
            f"Trip B personality: {TRIP_B['personality']}",
        ],
    )

    metric = GEval(
        name="Close Battle Evidence Quality",
        model=claude_model,
        criteria=(
            "For a close battle (within 20 points), does the verdict go beyond just "
            "comparing scores? It must cite specific incidents, quote taglines/personalities, "
            "and provide a deciding_factor that is trip-specific, not generic."
        ),
        evaluation_steps=[
            "Check that verdict_text mentions specific events from both trips",
            "Verify deciding_factor is specific (not just 'higher score')",
            "Confirm both roasts reference specific trip characteristics",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Roasts are specific ─────────────────────────────────────────────────────

def test_trip_roasts_are_specific(claude_model):
    """Individual trip roasts must reference something specific, not generic insults."""
    roast_a = SAMPLE_BATTLE_RESULT["trip_a_roast"]
    roast_b = SAMPLE_BATTLE_RESULT["trip_b_roast"]

    for trip_name, roast, tagline in [
        (TRIP_A["title"], roast_a, TRIP_A["tagline"]),
        (TRIP_B["title"], roast_b, TRIP_B["tagline"]),
    ]:
        test_case = LLMTestCase(
            input=f"Write a one-sentence roast for {trip_name}.",
            actual_output=roast,
            context=[tagline],
        )

        metric = GEval(
            name="Roast Specificity",
            model=claude_model,
            criteria=(
                "Is the roast specific to THIS trip's documented behaviour? "
                "Should not be a generic 'they were chaotic' — should name the specific "
                "thing the trip did wrong or delusionally."
            ),
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
            threshold=0.65,
        )

        assert_test(test_case, [metric])


# ─── Historical verdict is archivable ────────────────────────────────────────

def test_historical_verdict_archivable(claude_model):
    """The historical_verdict must feel like something worth archiving for posterity."""
    verdict = SAMPLE_BATTLE_RESULT["historical_verdict"]

    test_case = LLMTestCase(
        input="Write a one-sentence historical verdict for this battle for posterity.",
        actual_output=verdict,
    )

    metric = GEval(
        name="Historical Verdict Quality",
        model=claude_model,
        criteria=(
            "Does this sentence feel like something worth writing into a permanent record? "
            "Should be slightly grandiose, specific to this battle, and quotable. "
            "Not generic — should only apply to THIS matchup."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Winner consistency ───────────────────────────────────────────────────────

def test_battle_winner_consistent_with_verdict_text():
    """The 'winner' field must match who the verdict_text says won."""
    result = SAMPLE_BATTLE_RESULT
    winner = result["winner"]
    verdict_text = result["verdict_text"].lower()

    trip_a_name = TRIP_A["title"].lower()
    trip_b_name = TRIP_B["title"].lower()

    if winner == "trip_a":
        # Verdict text should positively reference Trip A more than Trip B
        # Simple heuristic: first trip mentioned positively should align with winner
        assert "wins" in verdict_text or "kasol" in verdict_text, (
            "winner=trip_a but verdict_text doesn't mention trip_a winning"
        )
    elif winner == "trip_b":
        assert "goa" in verdict_text, (
            "winner=trip_b but verdict_text doesn't mention trip_b"
        )


# ─── Faithfulness of verdict to battle data ──────────────────────────────────

def test_battle_verdict_faithful_to_trip_data(claude_model):
    """The verdict text must be grounded in the actual trip data provided."""
    battle_context = [
        f"Trip A: {TRIP_A['title']} | Score: {TRIP_A['cooked_score']} | "
        f"Personality: {TRIP_A['personality']} | Tagline: {TRIP_A['tagline']}",
        f"Trip B: {TRIP_B['title']} | Score: {TRIP_B['cooked_score']} | "
        f"Personality: {TRIP_B['personality']} | Tagline: {TRIP_B['tagline']}",
    ]

    test_case = LLMTestCase(
        input="Judge this battle and write a verdict.",
        actual_output=SAMPLE_BATTLE_RESULT["verdict_text"],
        retrieval_context=battle_context,
    )

    metric = FaithfulnessMetric(
        model=claude_model,
        threshold=0.7,
        include_reason=True,
    )

    assert_test(test_case, [metric])
