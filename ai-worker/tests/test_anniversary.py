"""
Anniversary email + missing person card tests.

The anniversary email is the highest-stakes output — it lands in someone's
inbox one year later and must be emotionally resonant, not generic marketing.
Missing person cards must be warm + specific without being cruel.
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval, AnswerRelevancyMetric, ToxicityMetric
from deepeval.test_case import LLMTestCase, SingleTurnParams


# ─── Anniversary email fixtures ───────────────────────────────────────────────

GOOD_ANNIVERSARY_SUBJECT = (
    "One year ago, Priya was historically cooked in Kasol 🔥"
)

GOOD_ANNIVERSARY_HTML_TEXT = """
One year ago you and your crew created friendship mythology.

THREE DAYS OF PEAK DELUSION IN KASOL

"Bhai we planned a trek. We ended up doing chai therapy at 3 AM for 72 hours instead."

83 / 100 — Peak Delusion

One year ago, in Kasol, your group drove 9 hours to not do the one thing you drove 9 hours for.
The Parvati Valley was right there. You were in four different cafes.

The 3 AM rooftop session where Rohan admitted the trek was an elaborate act of self-deception
lives in the collective memory now.

RELIVE THE STORY →
"""

BAD_ANNIVERSARY_HTML_TEXT = """
Happy 1 Year Anniversary!

One year ago, you went on an amazing trip and created wonderful memories that will last a lifetime!
It was truly a heartwarming experience and the bonds you formed are unbreakable.

We hope you're doing well and thinking about your next adventure!

CLICK HERE
"""


# ─── Subject line quality ─────────────────────────────────────────────────────

def test_anniversary_subject_line_specific(claude_model):
    """Subject line must be trip-specific and curiosity-gap — not generic 'Your Trip Anniversary'."""
    test_case = LLMTestCase(
        input=(
            "Write an anniversary email subject for: user=Priya, trip=Kasol, "
            "cooked_verdict='historically cooked', year_ago=1"
        ),
        actual_output=GOOD_ANNIVERSARY_SUBJECT,
    )

    metric = GEval(
        name="Anniversary Subject Line Quality",
        model=claude_model,
        criteria=(
            "Is this subject line specific enough to make Priya immediately know which trip "
            "it's about? It should create genuine curiosity and feel personal — not like "
            "a generic email newsletter. Should reference the person's name AND the trip verdict."
        ),
        evaluation_steps=[
            "Check subject includes the user's name (Priya)",
            "Check it references the trip-specific verdict/state",
            "Verify it would stand out in an inbox (not 'One Year Ago Today...')",
            "Confirm it creates curiosity that makes the person want to open it",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


# ─── Email body specificity ───────────────────────────────────────────────────

def test_anniversary_body_references_trip_lore(claude_model):
    """Email body must reference the actual lore — not generic anniversary copy."""
    test_case = LLMTestCase(
        input=(
            "Write a 1-year anniversary email for Priya's Kasol trip with: "
            "tagline='Bhai we planned a trek', cooked_level=83, "
            "trip_title='Three Days of Peak Delusion in Kasol', "
            "core_memory='3 AM rooftop confession about the fake trek plan'"
        ),
        actual_output=GOOD_ANNIVERSARY_HTML_TEXT,
    )

    metric = GEval(
        name="Anniversary Email Specificity",
        model=claude_model,
        criteria=(
            "Does the email body reference specific lore from the trip — not generic "
            "'you created memories' copy? Should quote the tagline, reference specific "
            "events (3 AM session, cafe vs trek), and make Priya feel like someone "
            "actually remembers what happened."
        ),
        evaluation_steps=[
            "Check the tagline is quoted directly",
            "Verify a specific event from the lore is mentioned",
            "Confirm the chaos score is displayed prominently",
            "Check no generic travel anniversary phrases appear",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    assert_test(test_case, [metric])


def test_bad_anniversary_body_fails_specificity(claude_model):
    """Generic anniversary copy must fail specificity check."""
    test_case = LLMTestCase(
        input="Write a 1-year anniversary email for the Kasol trip.",
        actual_output=BAD_ANNIVERSARY_HTML_TEXT,
    )

    metric = GEval(
        name="Anniversary Email Specificity",
        model=claude_model,
        criteria=(
            "Does the email body reference specific lore from the trip — not generic "
            "'you created memories' copy?"
        ),
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )

    metric.measure(test_case)
    assert not metric.success, (
        f"Generic anniversary copy should fail specificity — scored {metric.score:.2f}"
    )


# ─── Anniversary email not toxic ─────────────────────────────────────────────

def test_anniversary_email_not_toxic(claude_model):
    """Anniversary email that roasts must stay within affectionate bounds."""
    test_case = LLMTestCase(
        input="Write an anniversary email that roasts the Kasol trip.",
        actual_output=GOOD_ANNIVERSARY_HTML_TEXT,
    )

    assert_test(test_case, [ToxicityMetric(model=claude_model, threshold=0.9)])


# ─── Anniversary forbidden phrases ───────────────────────────────────────────

ANNIVERSARY_FORBIDDEN = [
    "unforgettable memories",
    "bonds that last",
    "adventure awaits",
    "magical experience",
    "truly special",
    "heartwarming",
    "wonderful memories",
    "cherish forever",
]

def test_anniversary_no_forbidden_phrases():
    """Anniversary email must not fall back to travel-brand language."""
    email_text = GOOD_ANNIVERSARY_HTML_TEXT.lower()
    hits = [p for p in ANNIVERSARY_FORBIDDEN if p in email_text]
    assert not hits, f"Anniversary email contains forbidden phrases: {hits}"


def test_bad_anniversary_has_forbidden_phrases():
    """Bad anniversary email must be detected as containing forbidden phrases."""
    email_text = BAD_ANNIVERSARY_HTML_TEXT.lower()
    hits = [p for p in ANNIVERSARY_FORBIDDEN if p in email_text]
    assert len(hits) >= 2, (
        f"Expected at least 2 forbidden phrases in bad email, got {hits}"
    )


# ─── Missing person card tests ────────────────────────────────────────────────

GOOD_MISSING_PERSON = {
    "role_title": "The Ghost Who Watched From A Distance",
    "what_they_missed": (
        "The 3 AM rooftop session where Rohan admitted the whole trekking hostel booking "
        "was an elaborate act of self-deception. Also Priya's productive crying + brownie combo on Day 2."
    ),
    "what_they_escaped": (
        "Nine hours in a car with Rohan explaining why the cafe had better 'views' than the actual trek."
    ),
    "what_the_group_needed_from_them": (
        "Someone to say 'guys we're not actually doing the trek are we' out loud at 9:30 AM on Day 1."
    ),
    "message_to_them": (
        "Yaar you missed the most unhinged 72 hours of our collective lives. "
        "Also you escaped the 9-hour drive back. The math on this one is complicated."
    ),
    "archetype": "The Lucky Escape",
}

BAD_MISSING_PERSON = {
    "role_title": "The One Who Was Missing",
    "what_they_missed": "All the fun and memories.",
    "what_they_escaped": "Nothing, it was great.",
    "what_the_group_needed_from_them": "Their presence.",
    "message_to_them": "We missed you! You would have loved it. Hope you're well!",
    "archetype": "The Missing Piece",
}


def test_missing_person_card_warm_not_cruel(claude_model):
    """Missing person card must be affectionately warm, not dismissive or cruel."""
    card_text = "\n".join(f"{k}: {v}" for k, v in GOOD_MISSING_PERSON.items())

    test_case = LLMTestCase(
        input="Write a missing person card for someone who couldn't make the Kasol trip.",
        actual_output=card_text,
    )

    assert_test(test_case, [ToxicityMetric(model=claude_model, threshold=0.9)])


def test_missing_person_card_specific(claude_model):
    """Missing person card must reference actual trip events, not generic platitudes."""
    card_text = "\n".join(f"{k}: {v}" for k, v in GOOD_MISSING_PERSON.items())

    test_case = LLMTestCase(
        input=(
            "Write a missing person card for someone who missed: the trek abandonment, "
            "Priya's Day 2 crisis, the 3 AM rooftop confessions, and a 9-hour drive."
        ),
        actual_output=card_text,
    )

    metric = GEval(
        name="Missing Person Card Specificity",
        model=claude_model,
        criteria=(
            "Does the card reference specific events the person missed (and escaped)? "
            "Should be warm + roasty: they're sad they missed AND lucky they escaped. "
            "Not 'we missed you' — more 'here's the specific chaos you witnessed from afar'."
        ),
        evaluation_steps=[
            "Check that specific events are named (not just 'the trip')",
            "Verify what_they_escaped is funny AND specific to this trip's actual events",
            "Confirm message_to_them is in a real conversational Hinglish voice",
        ],
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    assert_test(test_case, [metric])


def test_bad_missing_person_card_fails(claude_model):
    """Generic missing person card should fail specificity."""
    card_text = "\n".join(f"{k}: {v}" for k, v in BAD_MISSING_PERSON.items())

    test_case = LLMTestCase(
        input="Write a specific missing person card referencing actual trip events.",
        actual_output=card_text,
    )

    metric = GEval(
        name="Missing Person Card Specificity",
        model=claude_model,
        criteria="Does the card reference specific events the person missed?",
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    metric.measure(test_case)
    assert not metric.success, (
        f"Generic missing person card should fail — scored {metric.score:.2f}"
    )


# ─── Answer relevancy ─────────────────────────────────────────────────────────

def test_anniversary_email_answers_brief(claude_model):
    """Email must actually address: user name, trip title, chaos score, specific lore."""
    test_case = LLMTestCase(
        input=(
            "Send a 1-year anniversary email to Priya about the Kasol trip. "
            "Include: trip title, chaos score=83, tagline, and the 3 AM confession moment."
        ),
        actual_output=GOOD_ANNIVERSARY_HTML_TEXT,
    )

    metric = AnswerRelevancyMetric(
        model=claude_model,
        threshold=0.7,
        include_reason=True,
    )

    assert_test(test_case, [metric])
