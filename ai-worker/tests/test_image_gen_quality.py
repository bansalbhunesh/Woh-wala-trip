"""
Quality tests for image generation prompts.

Uses GEval (Claude-as-judge) to verify that the prompts produced by
image_gen.py are cinematically appropriate and preserve all safety constraints.
No fal.ai calls are made — only the prompt text is evaluated.
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams


# ─── Trip cover prompt quality ────────────────────────────────────────────────

COVER_PROMPT_PEAK_DELUSION = (
    "Cinematic travel poster. Goa, India. "
    "chaotic beach-side impulsive friend group. "
    "vivid saturated colors, surreal neon-tinged dusk, cinematic excess. "
    "Analog film grain, vintage photography, warm saturated tones. "
    "Environmental atmosphere — streets, lights, food stalls, landscapes, architecture. "
    "No people. No faces. No text. No logos. "
    "Wes Anderson meets Bollywood production design. High-resolution editorial."
)

COVER_PROMPT_MILDLY_SIMMERING = (
    "Cinematic travel poster. Shimla, India. "
    "quiet introspective late-night tea kind of trip. "
    "golden hour warm tones, gentle soft bokeh, playful outdoor light. "
    "Analog film grain, vintage photography, warm saturated tones. "
    "Environmental atmosphere — streets, lights, food stalls, landscapes, architecture. "
    "No people. No faces. No text. No logos. "
    "Wes Anderson meets Bollywood production design. High-resolution editorial."
)


@pytest.mark.llm
@pytest.mark.image_gen
def test_cover_prompt_cinematic_quality(claude_model):
    """Cover prompts must produce cinematically distinct atmosphere descriptions per verdict."""
    test_case = LLMTestCase(
        input="Rate this image generation prompt for a cinematic Indian travel poster.",
        actual_output=COVER_PROMPT_PEAK_DELUSION,
    )

    metric = GEval(
        name="Cover Prompt Cinematic Quality",
        model=claude_model,
        criteria=(
            "Is this image generation prompt cinematically specific and evocative? "
            "It should: (1) reference a real Indian destination, (2) name a clear visual mood "
            "(color palette, lighting style), (3) reference a recognizable cinematic aesthetic, "
            "(4) explicitly prohibit people/faces/text. "
            "Generic prompts like 'beautiful travel photo' should fail."
        ),
        evaluation_steps=[
            "Check for specific destination + country",
            "Verify a named color palette or lighting style is present",
            "Confirm cinematic references (director, film style, or photography style)",
            "Verify all four safety constraints: No people, No faces, No text, No logos",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.75,
    )

    assert_test(test_case, [metric])


@pytest.mark.llm
@pytest.mark.image_gen
def test_cover_prompts_are_mood_distinct(claude_model):
    """Peak Delusion and Mildly Simmering covers must describe visually different moods."""
    test_case = LLMTestCase(
        input=(
            "These are two image generation prompts for trip covers with different 'cooked' verdicts. "
            "Do they describe visually distinct moods?"
        ),
        actual_output=(
            f"PROMPT A (Peak Delusion):\n{COVER_PROMPT_PEAK_DELUSION}\n\n"
            f"PROMPT B (Mildly Simmering):\n{COVER_PROMPT_MILDLY_SIMMERING}"
        ),
    )

    metric = GEval(
        name="Cover Mood Distinctiveness",
        model=claude_model,
        criteria=(
            "Do the two prompts describe visually DISTINCT atmospheres appropriate to their "
            "respective emotional intensity levels? Peak Delusion should feel maximalist and saturated; "
            "Mildly Simmering should feel soft and warm. They must not describe the same visual style."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Character portrait prompt quality ───────────────────────────────────────

PORTRAIT_HIGH_CHAOS = (
    "Character art card. 'The Chaos Architect'. Indian trip archetype portrait. "
    "vivid reds and electric oranges, chaotic layered composition, motion energy. electric chaotic energy. "
    "Symbolic objects, textures, and atmosphere representing this person. "
    "Abstract artistic representation. No faces. No text. "
    "Analog film grain. Square format. Rich color depth."
)

PORTRAIT_LOW_CHAOS = (
    "Character art card. 'The Quiet Anchor'. Indian trip archetype portrait. "
    "soft muted earth tones, gentle worn textures, comfortable calm browns. calm composed energy. "
    "Symbolic objects, textures, and atmosphere representing this person. "
    "Abstract artistic representation. No faces. No text. "
    "Analog film grain. Square format. Rich color depth."
)


@pytest.mark.llm
@pytest.mark.image_gen
def test_portrait_prompt_archetype_specificity(claude_model):
    """Portrait prompts must encode archetype identity through visual language, not faces."""
    test_case = LLMTestCase(
        input="Rate this character portrait prompt for an Indian trip archetype card (no faces allowed).",
        actual_output=PORTRAIT_HIGH_CHAOS,
    )

    metric = GEval(
        name="Portrait Archetype Specificity",
        model=claude_model,
        criteria=(
            "Does this portrait prompt create a DISTINCT visual identity for the character "
            "WITHOUT requesting faces? It should: (1) specify a unique color palette for THIS archetype, "
            "(2) describe an energy level (electric, calm, etc.), (3) say 'No faces', "
            "(4) use 'Abstract artistic representation' or equivalent. "
            "Generic 'person standing in front of mountains' type prompts should fail."
        ),
        evaluation_steps=[
            "Verify no request for faces or photo-realistic portraits",
            "Check that the color palette/mood is archetype-specific, not generic",
            "Confirm energy descriptor matches the archetype energy",
            "Verify square format is specified",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.75,
    )

    assert_test(test_case, [metric])


@pytest.mark.llm
@pytest.mark.image_gen
def test_portrait_energy_scales_with_chaos(claude_model):
    """High-chaos and low-chaos portraits must describe visually different energies."""
    test_case = LLMTestCase(
        input=(
            "Compare these two portrait prompts. One is for a high-chaos character (8+/10), "
            "one for a low-chaos character (3/10). Do they correctly encode different energies?"
        ),
        actual_output=(
            f"HIGH CHAOS (rating 9/10):\n{PORTRAIT_HIGH_CHAOS}\n\n"
            f"LOW CHAOS (rating 3/10):\n{PORTRAIT_LOW_CHAOS}"
        ),
    )

    metric = GEval(
        name="Portrait Energy Scaling",
        model=claude_model,
        criteria=(
            "Do the two prompts encode clearly different energy levels appropriate to their chaos ratings? "
            "High-chaos should have vivid, electric, chaotic visual language. "
            "Low-chaos should have calm, muted, composed visual language. "
            "They must not use the same descriptors."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.75,
    )

    assert_test(test_case, [metric])


# ─── Era thumbnail prompt quality ─────────────────────────────────────────────

ERA_THUMB_NIGHT = (
    "Documentary scene thumbnail. Chapter: 'The 3 AM Pact'. Goa. "
    "blue-hour night, ambient street lights, moody darkness, neon spill. "
    "Scene: Everyone gathered on the rooftop making promises nobody would keep. "
    "Candid travel photography. Environmental storytelling. "
    "No people visible. No text. No logos. "
    "16:9 cinematic frame. Film grain. Atmospheric color grade."
)

ERA_THUMB_MORNING = (
    "Documentary scene thumbnail. Chapter: 'The Betrayal of Alarm Clocks'. Manali. "
    "soft pastel morning light, hazy mist, quiet atmosphere. "
    "Scene: The campsite at dawn before the chaos began, everything still and silent. "
    "Candid travel photography. Environmental storytelling. "
    "No people visible. No text. No logos. "
    "16:9 cinematic frame. Film grain. Atmospheric color grade."
)


@pytest.mark.llm
@pytest.mark.image_gen
def test_era_thumbnail_documentary_quality(claude_model):
    """Era thumbnail prompts must read as documentary scene setups, not generic travel photos."""
    test_case = LLMTestCase(
        input="Rate this image generation prompt for a documentary-style chapter thumbnail.",
        actual_output=ERA_THUMB_NIGHT,
    )

    metric = GEval(
        name="Era Thumbnail Documentary Quality",
        model=claude_model,
        criteria=(
            "Does this thumbnail prompt evoke a specific documentary scene rather than a generic travel photo? "
            "It should: (1) reference the chapter name, (2) describe a scene/moment (not just a landscape), "
            "(3) specify a time-of-day appropriate mood, (4) say 'No people visible', "
            "(5) specify 16:9 cinematic frame. "
            "Prompts that could describe ANY location without the chapter context should fail."
        ),
        evaluation_steps=[
            "Check chapter name is present",
            "Verify a scene or moment description is included (not just atmosphere)",
            "Confirm mood matches time of day",
            "Verify 16:9 format and 'No people visible' constraints",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


@pytest.mark.llm
@pytest.mark.image_gen
def test_era_thumbnail_time_moods_distinct(claude_model):
    """Night and morning era thumbnails must describe atmospherically different scenes."""
    test_case = LLMTestCase(
        input="Compare these two era thumbnail prompts. Do they capture distinct times of day?",
        actual_output=(
            f"NIGHT CHAPTER:\n{ERA_THUMB_NIGHT}\n\n"
            f"MORNING CHAPTER:\n{ERA_THUMB_MORNING}"
        ),
    )

    metric = GEval(
        name="Era Time-of-Day Distinction",
        model=claude_model,
        criteria=(
            "Do the two prompts clearly depict different times of day through their lighting and atmosphere? "
            "Night should reference darkness, artificial light, or moonlight. "
            "Morning should reference soft light, mist, or dawn quality. "
            "They must not have overlapping lighting descriptors."
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.8,
    )

    assert_test(test_case, [metric])
