"""
Shared test infrastructure for Yaarlore lore pipeline evaluation.

Uses deepeval with a custom Claude evaluator so evaluation itself uses the
same model + proxy the app uses. All API keys are loaded from ai-worker/.env.
"""

import json
import os
import asyncio
from pathlib import Path
from typing import Optional

import pytest
from dotenv import load_dotenv

# ─── Load ai-worker env (must happen before importing anything that reads env) ─
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path, override=True)

# ─── deepeval imports ────────────────────────────────────────────────────────
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase
from deepeval.dataset import EvaluationDataset


# ─────────────────────────────────────────────────────────────────────────────
# Custom Claude evaluator — uses Anthropic SDK directly, respects the proxy
# config already set up in the worker (ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY)
# ─────────────────────────────────────────────────────────────────────────────
class ClaudeEvaluator(DeepEvalBaseLLM):
    """deepeval-compatible wrapper around Anthropic Claude via the project's proxy."""

    MODEL = os.getenv("CLAUDE_HAIKU_MODEL", "claude-haiku-4-5-20251001")

    def load_model(self):
        import anthropic

        base = os.getenv("ANTHROPIC_BASE_URL", "").rstrip("/").removesuffix("/v1") or None
        self._client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            base_url=base,
        )
        return self._client

    def generate(self, prompt: str, schema=None) -> str:
        client = self.load_model()
        resp = client.messages.create(
            model=self.MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    async def a_generate(self, prompt: str, schema=None) -> str:
        return await asyncio.to_thread(self.generate, prompt, schema)

    def get_model_name(self) -> str:
        return self.MODEL


# ─── Singleton evaluator ──────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def claude_model():
    return ClaudeEvaluator()


# ─── Fixture data ─────────────────────────────────────────────────────────────
FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def golden_lore() -> dict:
    with open(FIXTURES / "golden_lore.json") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def bad_lore() -> dict:
    with open(FIXTURES / "bad_lore.json") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def sample_signals() -> dict:
    with open(FIXTURES / "sample_signals.json") as f:
        return json.load(f)


# ─── Helper: lore → flat text for evaluation ──────────────────────────────────
def lore_to_text(lore: dict) -> str:
    parts = [
        f"TRIP TITLE: {lore.get('trip_title', '')}",
        f"TAGLINE: {lore.get('tagline', '')}",
        f"OPENING LINE: {lore.get('opening_line', '')}",
        f"COOKED LEVEL: {lore.get('cooked_level', '')} / 100",
        f"COOKED VERDICT: {lore.get('cooked_verdict', '')}",
        f"COOKED EXPLANATION: {lore.get('cooked_explanation', '')}",
        f"TRIP PERSONALITY: {lore.get('trip_personality_type', '')}",
        f"WHAT IT WAS REALLY ABOUT: {lore.get('what_this_trip_was_really_about', '')}",
        f"SCREENSHOT MOMENT: {lore.get('screenshot_moment_line', '')}",
        f"CLOSING LINE: {lore.get('closing_line', '')}",
        f"WHATSAPP CAPTION: {lore.get('whatsapp_caption', '')}",
    ]
    recap = lore.get("season_recap", {})
    if recap:
        parts += [
            f"ACT 1: {recap.get('act_1', '')}",
            f"ACT 2: {recap.get('act_2', '')}",
            f"ACT 3: {recap.get('act_3', '')}",
            f"FULL NARRATIVE: {recap.get('full_narrative', '')}",
        ]
    dynamics = lore.get("friendship_dynamics", {})
    if dynamics:
        parts += [
            f"GROUP STRUCTURE: {dynamics.get('group_structure', '')}",
            f"CHAOS SOURCE: {dynamics.get('chaos_source', '')}",
            f"EMOTIONAL CENTER: {dynamics.get('emotional_center', '')}",
            f"COLLECTIVE ENERGY: {dynamics.get('collective_energy', '')}",
        ]
    awards = lore.get("trip_lore_awards", {})
    if awards:
        parts += [
            f"TRIP MVP: {awards.get('trip_mvp', '')}",
            f"TRIP VILLAIN: {awards.get('trip_villain', '')}",
            f"CORE MEMORY: {awards.get('core_memory', '')}",
        ]
    for s in lore.get("superlatives", []):
        parts.append(f"SUPERLATIVE — {s.get('winner_name', '')}: {s.get('question', '')} — {s.get('reason', '')}")
    return "\n".join(parts)


# ─── Helper: signals → prompt context ─────────────────────────────────────────
def signals_to_context(signals: dict) -> str:
    sig = signals.get("aggregated_signal", {})
    return (
        f"Trip: {signals['trip']['name']} ({signals['trip']['destination']})\n"
        f"Duration: {signals['trip']['trip_start_date']} to {signals['trip']['trip_end_date']}\n"
        f"Members: {', '.join(m['display_name'] for m in signals['members'])}\n"
        f"Signal chaos score: {sig.get('aggregated_cooked_score')}/100\n"
        f"Social dynamic: {sig.get('social_dynamic', '')}\n"
        f"Dominant behavior: {sig.get('emotional_arc_summary', '')}\n"
        f"Peak chaos moment: {sig.get('peak_cooked_moment', '')}\n"
        f"Recurring behaviors: {', '.join(sig.get('recurring_behaviors_merged', []))}\n"
        f"Lead angle: {sig.get('lore_writing_hints', {}).get('lead_with', '')}\n"
        f"Things to avoid: {sig.get('lore_writing_hints', {}).get('avoid', '')}\n"
    )
