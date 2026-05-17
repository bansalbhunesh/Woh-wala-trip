"""
LLM-as-judge quality tests for lore output.

Every test here uses GEval (Claude evaluating Claude's output).
These catch the subtle quality failures that schema checks miss:
generic writing, weak taglines, missing Hinglish, boring closing lines.
"""

import pytest
from deepeval import assert_test, evaluate
from deepeval.metrics import GEval, AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase, SingleTurnParams

from .conftest import lore_to_text, signals_to_context


# ─── Narrative specificity ────────────────────────────────────────────────────

def test_narrative_specificity_golden(claude_model, golden_lore, sample_signals):
    """Full narrative must reference specific events from THIS trip, not generic arcs."""
    narrative = golden_lore["season_recap"]["full_narrative"]
    context = signals_to_context(sample_signals)

    test_case = LLMTestCase(
        input=(
            "A group of 4 friends went to Kasol. Key signals: "
            "the planned trek was abandoned within 2 hours for a cafe, "
            "Priya uploaded 89/127 photos, Rohan proposed the cafe detour, "
            "3 AM rooftop confession session happened. "
            "Generate a specific trip narrative."
        ),
        actual_output=narrative,
        context=[context],
    )

    metric = GEval(
        name="Narrative Specificity",
        model=claude_model,
        criteria=(
            "Does the narrative reference SPECIFIC events, people, and moments from THIS trip "
            "(the trek abandonment, the 3 AM confessions, Priya's photography, Rohan's cafe detour) "
            "rather than generic travel blog language?"
        ),
        evaluation_steps=[
            "Check if at least 3 specific named events from the signals appear in the narrative",
            "Check if specific people (Rohan, Priya, Divya) are mentioned with trip-specific actions",
            "Verify no generic phrases like 'bonds formed' or 'memories made' appear",
            "Confirm the narrative could ONLY apply to this specific trip, not any trip to Kasol",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


def test_narrative_specificity_bad_lore_fails(claude_model, bad_lore, sample_signals):
    """Bad lore's generic narrative should score below threshold."""
    narrative = bad_lore["season_recap"]["full_narrative"]
    context = signals_to_context(sample_signals)

    test_case = LLMTestCase(
        input="Generate a specific trip narrative referencing actual events.",
        actual_output=narrative,
        context=[context],
    )

    metric = GEval(
        name="Narrative Specificity",
        model=claude_model,
        criteria=(
            "Does the narrative reference SPECIFIC events from THIS trip rather than generic travel language?"
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    metric.measure(test_case)
    # Bad lore should FAIL specificity check
    assert not metric.success, (
        f"Bad lore's generic narrative should fail specificity — scored {metric.score}"
    )


# ─── Hinglish voice authenticity ─────────────────────────────────────────────

def test_hinglish_voice_authenticity(claude_model, golden_lore):
    """Lore for Indian Gen-Z friend group must use natural Hinglish, not forced slang."""
    full_text = lore_to_text(golden_lore)

    test_case = LLMTestCase(
        input=(
            "Write lore for an Indian Gen-Z friend group trip with heavy Hinglish intensity. "
            "Should feel like a WhatsApp message from someone in the group, not a brand."
        ),
        actual_output=full_text,
    )

    metric = GEval(
        name="Hinglish Voice Authenticity",
        model=claude_model,
        criteria=(
            "Does the lore use natural, unforced Hinglish the way Indian Gen-Z actually talks "
            "at 2 AM? Should include yaar/bhai energy, internet-native phrases, and feel like "
            "it came from inside the group chat — not from a travel brand trying to be relatable."
        ),
        evaluation_steps=[
            "Check for natural Hinglish integration (not forced or tokenistic)",
            "Verify internet-native vocabulary appropriate for Indian Gen-Z (2024 slang)",
            "Confirm the voice reads as affectionate insider roast, not corporate copy",
            "Check that Hindi words are used in the right context, not just sprinkled randomly",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Tagline quotability ──────────────────────────────────────────────────────

def test_tagline_quotability(claude_model, golden_lore):
    """Tagline must be screenshot-worthy — the kind the group sends to each other."""
    tagline = golden_lore["tagline"]

    test_case = LLMTestCase(
        input="Write a tagline for a trip where the planned trek was abandoned for cafes.",
        actual_output=tagline,
    )

    metric = GEval(
        name="Tagline Quotability",
        model=claude_model,
        criteria=(
            "Is this tagline instantly quotable — the kind a WhatsApp group would screenshot and "
            "pin? It should be brutally honest, specific, and make the group feel simultaneously "
            "exposed and delighted. Max 20 words. No travel clichés."
        ),
        evaluation_steps=[
            "Check it is specific to THIS trip's defining event, not generic",
            "Verify it would provoke an immediate 'bro this is literally us' reaction",
            "Confirm it is under 25 words and punchy",
            "Check no forbidden travel blog phrases",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


def test_bad_tagline_fails(claude_model, bad_lore):
    """Generic 'An adventure awaits!' tagline should fail quotability check."""
    test_case = LLMTestCase(
        input="Write a tagline for a trip where the planned trek was abandoned for cafes.",
        actual_output=bad_lore["tagline"],
    )

    metric = GEval(
        name="Tagline Quotability",
        model=claude_model,
        criteria=(
            "Is this tagline instantly quotable — the kind a WhatsApp group would screenshot and pin? "
            "It should be brutally honest, specific, and make the group feel simultaneously exposed and delighted."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    metric.measure(test_case)
    assert not metric.success, f"Generic tagline should fail — scored {metric.score}"


# ─── Closing line cinematics ──────────────────────────────────────────────────

def test_closing_line_cinematic_impact(claude_model, golden_lore):
    """Closing line is the last frame before credits — must land with emotional weight."""
    closing = golden_lore["closing_line"]
    narrative = golden_lore["season_recap"]["full_narrative"]

    test_case = LLMTestCase(
        input="Write the cinematic closing line for the Kasol cafe-not-trek trip.",
        actual_output=closing,
        context=[narrative],
    )

    metric = GEval(
        name="Closing Line Impact",
        model=claude_model,
        criteria=(
            "Is this closing line genuinely cinematic — the kind that makes you feel something "
            "on re-read? It should feel like the last frame of a prestige TV episode: specific, "
            "bittersweet, rooted in what the trip was ACTUALLY about (not just a summary)."
        ),
        evaluation_steps=[
            "Check the line earns its brevity — every word does work",
            "Verify it doesn't just summarize the trip but captures its emotional truth",
            "Confirm it references something specific from the narrative, not a generic statement",
            "Check it could only belong to THIS trip",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Opening line impact ──────────────────────────────────────────────────────

def test_opening_line_makes_group_feel_seen(claude_model, golden_lore):
    """Opening line must make the group go 'bro how did it know'."""
    opening = golden_lore["opening_line"]

    test_case = LLMTestCase(
        input=(
            "Write an opening line for a group that planned a trek, had full intentions, "
            "and abandoned the plan within 2 hours."
        ),
        actual_output=opening,
    )

    metric = GEval(
        name="Opening Line Specificity",
        model=claude_model,
        criteria=(
            "Does this opening line immediately call out the group's specific energy in a way "
            "that would make them feel caught? Should provoke 'bro how did it know' — not a "
            "generic travel opener. Specific, not broad."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── WhatsApp caption human-ness ─────────────────────────────────────────────

def test_whatsapp_caption_feels_human(claude_model, golden_lore):
    """Caption must read as typed by an actual group member, not generated by an AI."""
    caption = golden_lore["whatsapp_caption"]

    test_case = LLMTestCase(
        input="Write the WhatsApp caption someone in the group would type when sharing this recap.",
        actual_output=caption,
    )

    metric = GEval(
        name="WhatsApp Caption Authenticity",
        model=claude_model,
        criteria=(
            "Does this read like an actual WhatsApp message typed by a 22-year-old Indian "
            "group member, not by an AI or a brand? Should have lowercase, Hinglish, group-specific "
            "references, and the casual chaos of a real group chat message."
        ),
        evaluation_steps=[
            "Check for lowercase / casual punctuation (not formal)",
            "Verify it sounds like one specific person's voice, not a brand",
            "Confirm it references something specific from the trip (not generic)",
            "Check it would actually cause chaos in the group chat if forwarded",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── What the trip was really about ──────────────────────────────────────────

def test_emotional_truth_depth(claude_model, golden_lore):
    """The 'what this trip was really about' field must be emotionally perceptive."""
    emotional_truth = golden_lore["what_this_trip_was_really_about"]
    full_text = lore_to_text(golden_lore)

    test_case = LLMTestCase(
        input=(
            "Reveal the emotional truth under the chaos — what was this trip REALLY about? "
            "The thing they won't say in the group chat but all feel."
        ),
        actual_output=emotional_truth,
        context=[full_text],
    )

    metric = GEval(
        name="Emotional Truth Depth",
        model=claude_model,
        criteria=(
            "Does this sentence reveal a genuine emotional insight about the group — "
            "something deeper than 'they had fun' or 'they bonded'? Should feel like something "
            "a therapist or a very perceptive friend would say about what the trip actually meant."
        ),
        evaluation_steps=[
            "Check it is specific to this group's dynamic, not generic",
            "Verify it goes beneath surface-level 'friendship' observations",
            "Confirm it would resonate with people who were actually on the trip",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Screenshot moment line ───────────────────────────────────────────────────

def test_screenshot_moment_devastating_accuracy(claude_model, golden_lore):
    """Screenshot line should make the group simultaneously embarrassed and proud."""
    screenshot_line = golden_lore["screenshot_moment_line"]

    test_case = LLMTestCase(
        input="Write the one sentence that will end up on someone's Instagram story from this trip.",
        actual_output=screenshot_line,
    )

    metric = GEval(
        name="Screenshot Moment Accuracy",
        model=claude_model,
        criteria=(
            "Is this the line that someone actually screenshots and sends to the group chat with "
            "'THIS'? It should have devastating accuracy — specific enough to expose the group's "
            "delusion while being simultaneously iconic. Not generic, not safe."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


# ─── Trip personality type ────────────────────────────────────────────────────

def test_trip_personality_type_internet_native(claude_model, golden_lore):
    """Personality type must be internet-native, specific, not a destination description."""
    personality = golden_lore["trip_personality_type"]

    test_case = LLMTestCase(
        input="Write a 5-8 word internet-native personality type for this trip.",
        actual_output=personality,
    )

    metric = GEval(
        name="Personality Type Originality",
        model=claude_model,
        criteria=(
            "Is this personality type genuinely internet-native and specific to THIS trip's defining "
            "dynamic — NOT a destination description, NOT a generic vibe label? "
            "Should feel like a niche subreddit name or a very specific TikTok micro-genre."
        ),
        evaluation_steps=[
            "Check it does NOT just describe the destination",
            "Verify it captures the SPECIFIC group dynamic, not just 'chaotic friends'",
            "Confirm it reads as internet-native (not a travel brochure)",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.6,
    )

    assert_test(test_case, [metric])


# ─── Full lore answer relevancy ───────────────────────────────────────────────

def test_lore_answers_the_brief(claude_model, golden_lore, sample_signals):
    """The whole lore must actually address the trip's signals and context."""
    full_text = lore_to_text(golden_lore)
    context = signals_to_context(sample_signals)

    test_case = LLMTestCase(
        input=(
            f"Generate lore for a 4-person trip to Kasol where the trek was abandoned for cafes, "
            f"Priya uploaded 89/127 photos, Rohan caused the cafe detour, there was a 3 AM rooftop "
            f"confession session, and Divya kept deploying Maggi at crisis moments."
        ),
        actual_output=full_text,
        retrieval_context=[context],
    )

    metric = AnswerRelevancyMetric(
        model=claude_model,
        threshold=0.7,
        include_reason=True,
    )

    assert_test(test_case, [metric])
