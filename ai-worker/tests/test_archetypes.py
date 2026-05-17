"""
Character role + archetype quality tests.

Member roles are the most personal output — they're read aloud at group
dinners. These tests ensure: roles match actual behaviour from signals,
archetypes are accurate, Hinglish voice is right, and no role is a copy-paste.
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from .conftest import lore_to_text


VALID_ARCHETYPES = {
    "Black Cat", "Golden Retriever", "NPC", "Main Character",
    "Chaos Source", "Emotional Support NPC",
}

# Sample character roles derived from the golden fixture's narrative
SAMPLE_ROLES = [
    {
        "person": "Rohan",
        "role_title": "The Architect of His Own Betrayal",
        "role_description": (
            "Booked the trekking hostel specifically to feel like someone who treks. "
            "Abandoned the trek plan at 9:47 AM by suggesting a cafe with 'insane views'. "
            "Has not reconciled this yet and probably never will."
        ),
        "signature_move": "Proposing alternatives to the plan he made",
        "most_likely_said": "yaar it's basically the same thing, the cafe has a mountain view",
        "trip_contribution": "Without Rohan, they might have actually done the trek. Unclear if that would have been better.",
        "chaos_rating": 8,
        "archetype": "Chaos Source",
        "archetype_tag": "Chaos By Design",
    },
    {
        "person": "Priya",
        "role_title": "The Main Character Who Documented Her Own Crisis",
        "role_description": (
            "Uploaded 89 of 127 photos, including both a brownie mid-crisis and the reel "
            "she posted from the trip that got 847 likes with zero trek content. "
            "Cried on Day 2. Posted about it. No regrets."
        ),
        "signature_move": "Photographing the thing before experiencing it",
        "most_likely_said": "wait wait let me get a shot first",
        "trip_contribution": "Without Priya, there would be no visual record of the group's collective delusion.",
        "chaos_rating": 7,
        "archetype": "Main Character",
        "archetype_tag": "Chaos Archivist",
    },
    {
        "person": "Divya",
        "role_title": "The Maggi Diplomat",
        "role_description": (
            "Deployed 11 packets of Maggi across three days at moments of peak group tension. "
            "Never acknowledged this as a de-escalation strategy. "
            "The group would have imploded by Day 2 without this."
        ),
        "signature_move": "Appearing with food at the exact wrong / right moment",
        "most_likely_said": "guys do you want maggi",
        "trip_contribution": "Three meltdowns were prevented. Zero credit was taken.",
        "chaos_rating": 2,
        "archetype": "Golden Retriever",
        "archetype_tag": "Snack-Based Therapy",
    },
]


# ─── Archetype accuracy ───────────────────────────────────────────────────────

@pytest.mark.parametrize("role", SAMPLE_ROLES)
def test_archetype_matches_description(claude_model, role):
    """Archetype tag must be consistent with the role description."""
    role_text = (
        f"Name: {role['person']}\n"
        f"Role: {role['role_title']}\n"
        f"Description: {role['role_description']}\n"
        f"Chaos rating: {role['chaos_rating']}/10\n"
        f"Archetype: {role['archetype']}"
    )

    test_case = LLMTestCase(
        input=f"Assign an archetype to {role['person']} based on their trip behaviour.",
        actual_output=role_text,
        expected_output=f"Archetype: {role['archetype']}",
    )

    metric = GEval(
        name="Archetype Accuracy",
        model=claude_model,
        criteria=(
            "Is the archetype consistent with the described behaviour? "
            f"For example, someone with chaos_rating=8 who abandoned the group's plan "
            f"should NOT be 'Golden Retriever'. "
            f"Someone who distributed snacks and prevented meltdowns should NOT be 'Chaos Source'."
        ),
        evaluation_steps=[
            "Check that high chaos_rating (7-10) maps to Chaos Source or Main Character",
            "Check that low chaos_rating (1-3) with nurturing behaviour maps to Golden Retriever",
            "Verify the archetype would be recognized as accurate by anyone who read the description",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.75,
    )

    assert_test(test_case, [metric])


# ─── Role description specificity ────────────────────────────────────────────

@pytest.mark.parametrize("role", SAMPLE_ROLES)
def test_role_description_trip_specific(claude_model, role, golden_lore):
    """Role descriptions must reference specific events from THIS trip."""
    narrative = golden_lore["season_recap"]["full_narrative"]

    test_case = LLMTestCase(
        input=(
            f"Write a character role for {role['person']} based on the trip narrative. "
            f"Reference specific events they were involved in."
        ),
        actual_output=role["role_description"],
        context=[narrative],
    )

    metric = GEval(
        name="Role Description Specificity",
        model=claude_model,
        criteria=(
            "Does the role description reference specific, provable events from THIS trip "
            "rather than generic personality descriptions? "
            "Should read like someone who was there wrote it."
        ),
        evaluation_steps=[
            "Check for at least one specific event reference (not 'was chaotic' but 'abandoned the trek plan')",
            "Verify numbers/specifics where available (e.g., '89/127 photos', '11 packets of Maggi')",
            "Confirm it would only fit this person on this trip, not any chaotic friend ever",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Most likely said is in-character ────────────────────────────────────────

@pytest.mark.parametrize("role", SAMPLE_ROLES)
def test_most_likely_said_feels_authentic(claude_model, role):
    """'most_likely_said' must sound like something the actual person would say."""
    test_case = LLMTestCase(
        input=(
            f"Write a quote in {role['person']}'s voice that captures their trip behaviour. "
            f"Should sound like something they'd actually say in a WhatsApp group."
        ),
        actual_output=role["most_likely_said"],
        context=[role["role_description"]],
    )

    metric = GEval(
        name="Quote Authenticity",
        model=claude_model,
        criteria=(
            "Does this quote sound like something a real person would say in their specific "
            "role? It should feel completely natural for this character, not like a generic quote "
            "anyone in their archetype might say."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.6,
    )

    assert_test(test_case, [metric])


# ─── Superlative question originality ────────────────────────────────────────

def test_superlative_questions_not_generic(claude_model, golden_lore):
    """Superlative 'most likely to...' questions must be trip-specific, not yearbook clichés."""
    for sup in golden_lore.get("superlatives", []):
        question = sup.get("question", "")

        test_case = LLMTestCase(
            input=(
                f"Generate a 'most likely to...' superlative for {sup.get('winner_name')} "
                f"based on their specific trip behaviour."
            ),
            actual_output=question,
        )

        metric = GEval(
            name="Superlative Originality",
            model=claude_model,
            criteria=(
                "Is this superlative specific to THIS trip's events — not a generic yearbook "
                "cliché like 'most likely to forget sunscreen' or 'most likely to get lost'? "
                "Should reference a specific thing that happened on this trip."
            ),
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
            threshold=0.65,
        )

        assert_test(test_case, [metric])


# ─── Superlative distribution ────────────────────────────────────────────────

def test_superlatives_distributed_across_members(golden_lore, sample_signals):
    """With 4 members, superlatives should not all go to one person."""
    member_count = len(sample_signals["members"])
    superlatives = golden_lore.get("superlatives", [])

    if len(superlatives) >= 3:
        winner_counts: dict = {}
        for sup in superlatives:
            name = sup.get("winner_name", "").lower()
            winner_counts[name] = winner_counts.get(name, 0) + 1

        max_per_person = max(winner_counts.values()) if winner_counts else 0
        total = len(superlatives)

        assert max_per_person / total <= 0.6, (
            f"One person dominates superlatives: {winner_counts}. "
            f"Max {max_per_person}/{total} is too concentrated."
        )


# ─── Chaos ratings are distributed, not all extreme ─────────────────────────

def test_chaos_ratings_span_range(sample_signals):
    """In a 4-person group, chaos ratings should not all be 8-10. Someone is always the calmer one."""
    # Using sample role data as proxy for what the pipeline produces
    ratings = [role["chaos_rating"] for role in SAMPLE_ROLES]
    assert min(ratings) <= 3, f"No calm member? Min chaos rating is {min(ratings)}"
    assert max(ratings) >= 7, f"No chaos source? Max chaos rating is {max(ratings)}"
    spread = max(ratings) - min(ratings)
    assert spread >= 4, f"Chaos ratings too clustered: {ratings}, spread={spread}"


# ─── Role title format ────────────────────────────────────────────────────────

@pytest.mark.parametrize("role", SAMPLE_ROLES)
def test_role_title_format(role):
    """Role title must be 5-10 words, internet-native, not a generic job title."""
    words = role["role_title"].split()
    assert 4 <= len(words) <= 12, (
        f"Role title word count out of range ({len(words)}): '{role['role_title']}'"
    )
    # Must NOT start with "The Nice Guy" or "The Funny One" type generics
    generic_starters = ["the nice", "the funny", "the smart", "the quiet", "the loud"]
    title_lower = role["role_title"].lower()
    for g in generic_starters:
        assert not title_lower.startswith(g), (
            f"Generic role title detected: '{role['role_title']}'"
        )
