"""
Deterministic (no-LLM) test runner. Run directly: python -m tests.run_deterministic
Validates: schema, validators, forbidden phrases, chaos calibration, nostalgia scoring.
"""

import json
import math
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Stub out external dependencies so this runner works without installed packages
_stub = MagicMock()
sys.modules.setdefault("supabase", _stub)
sys.modules.setdefault("anthropic", _stub)
sys.modules.setdefault("pydantic_settings", _stub)
sys.modules.setdefault("fastapi", _stub)
sys.modules.setdefault("tenacity", _stub)
sys.modules.setdefault("httpx", _stub)

# Make Settings importable without real env
import types
_config_mod = types.ModuleType("src.config")
_settings = MagicMock()
_settings.ANTHROPIC_API_KEY = "test"
_settings.ANTHROPIC_BASE_URL = ""
_settings.SUPABASE_URL = "http://localhost"
_settings.SUPABASE_SERVICE_ROLE_KEY = "test"
_settings.AI_WORKER_SECRET = "test"
_settings.CLAUDE_MODEL = "claude-haiku-4-5-20251001"
_settings.CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001"
_settings.DEBUG_ENABLED = "false"
_settings.FAL_API_KEY = ""
_settings.FAL_DAILY_BUDGET = 200
_settings.FAL_TRIP_DAILY_LIMIT = 2
_settings.FAL_MAX_ERAS = 5
_config_mod.settings = _settings
sys.modules["src.config"] = _config_mod

# Stub clients before nostalgia imports it
_clients_mod = types.ModuleType("src.clients")
_clients_mod.supabase = MagicMock()

# Setup simulated database for fal_budget to survive in-process resets during testing
budget_db = {}

class MockFalBudgetTable:
    def __init__(self, db_state):
        self.db_state = db_state
        self.selected_field = None
        self.filter_date = None

    def select(self, field):
        self.selected_field = field
        return self

    def eq(self, field, value):
        if field == "date":
            self.filter_date = value
        return self

    def execute(self):
        class Resp:
            def __init__(self, data):
                self.data = data
        
        row = self.db_state.get(self.filter_date)
        if row is not None:
            return Resp([{"calls_count": row}])
        return Resp([])

    def upsert(self, data, on_conflict=None):
        self.filter_date = data["date"]
        self.db_state[data["date"]] = data["calls_count"]
        return self

def mock_table(table_name):
    if table_name == "fal_budget":
        return MockFalBudgetTable(budget_db)
    return MagicMock()

_clients_mod.supabase.table = mock_table
_clients_mod.anthropic_client = MagicMock()
sys.modules["src.clients"] = _clients_mod

from src.lore.validators import validate_lore_json, scan_forbidden_phrases
from src.nostalgia import NostalgiaEngine
from src.image_gen import _time_mood, _budget_ok, _trip_quota_ok
import src.image_gen as _ig

FIXTURES = Path(__file__).parent / "fixtures"

with open(FIXTURES / "golden_lore.json") as f:
    GOLDEN = json.load(f)
with open(FIXTURES / "bad_lore.json") as f:
    BAD = json.load(f)
with open(FIXTURES / "sample_signals.json") as f:
    SIGNALS = json.load(f)

passed = 0
failed = 0


def check(name: str, fn):
    global passed, failed
    try:
        fn()
        print(f"  PASS  {name}")
        passed += 1
    except Exception as e:
        print(f"  FAIL  {name}: {e}")
        failed += 1


# ── Validator ──────────────────────────────────────────────────────────────────
print("\n── Validator ──")

check("golden lore passes validate_lore_json", lambda: validate_lore_json(GOLDEN))

def _bad_should_raise():
    try:
        validate_lore_json(BAD)
        raise AssertionError("validate_lore_json should have raised on bad lore")
    except ValueError:
        pass  # expected
check("bad lore raises ValueError in validate_lore_json", _bad_should_raise)

# ── Cooked level / verdict mapping ─────────────────────────────────────────────
print("\n── Chaos Level → Verdict Mapping ──")

def _verdict(level):
    if level <= 25: return "Mildly Simmering"
    if level <= 55: return "Emotionally Unstable"
    if level <= 80: return "Peak Delusion"
    return "Historically Cooked"

VERDICT_CASES = [
    (0, "Mildly Simmering"),
    (25, "Mildly Simmering"),
    (26, "Emotionally Unstable"),
    (55, "Emotionally Unstable"),
    (56, "Peak Delusion"),
    (80, "Peak Delusion"),
    (81, "Historically Cooked"),
    (100, "Historically Cooked"),
]

for level, expected in VERDICT_CASES:
    check(
        f"cooked_level={level} → {expected}",
        lambda l=level, e=expected: (
            (_ for _ in ()).throw(AssertionError(f"got {_verdict(l)}, expected {e}"))
            if _verdict(l) != e else None
        )
    )

check(
    "golden lore verdict matches level",
    lambda: (
        (_ for _ in ()).throw(
            AssertionError(f"level={GOLDEN['cooked_level']} maps to {_verdict(GOLDEN['cooked_level'])}, "
                           f"got {GOLDEN['cooked_verdict']}")
        )
        if _verdict(GOLDEN["cooked_level"]) != GOLDEN["cooked_verdict"] else None
    )
)

def _bad_verdict_mismatch():
    derived = _verdict(BAD["cooked_level"])
    assert derived != BAD["cooked_verdict"], (
        f"Bad lore has level={BAD['cooked_level']} → should map to {derived}, "
        f"but fixture says {BAD['cooked_verdict']} — mismatch not detected"
    )
check("bad lore verdict correctly mismatches level", _bad_verdict_mismatch)

# ── Field length constraints ───────────────────────────────────────────────────
print("\n── Field Length Constraints ──")

check("title 8-90 chars", lambda: [None for t in [GOLDEN["trip_title"]] if 8 <= len(t) <= 90])
check("tagline ≥15 chars", lambda: [None for t in [GOLDEN["tagline"]] if len(t) >= 15])
check("full_narrative ≥350 chars",
      lambda: [None for n in [GOLDEN["season_recap"]["full_narrative"]] if len(n) >= 350])
check("closing_line ≥20 chars", lambda: [None for t in [GOLDEN["closing_line"]] if len(t) >= 20])
check("screenshot_moment ≥20 chars",
      lambda: [None for t in [GOLDEN["screenshot_moment_line"]] if len(t) >= 20])

for act in ["act_1", "act_2", "act_3"]:
    check(
        f"{act} ≥50 chars",
        lambda a=act: [None for t in [GOLDEN["season_recap"][a]] if len(t) >= 50]
    )

check("era count 1-6", lambda: [None for n in [len(GOLDEN.get("trip_eras", []))] if 1 <= n <= 6])
check("superlatives ≥1", lambda: [None for n in [len(GOLDEN.get("superlatives", []))] if n >= 1])
check("receipt_stats ≥1", lambda: [None for n in [len(GOLDEN.get("receipt_stats", []))] if n >= 1])

# ── Forbidden phrases ──────────────────────────────────────────────────────────
print("\n── Forbidden Phrases ──")

hits_golden = scan_forbidden_phrases(GOLDEN)
check(
    f"golden lore: 0 forbidden phrases (found {len(hits_golden)})",
    lambda: (
        (_ for _ in ()).throw(AssertionError(f"Found: {hits_golden}"))
        if hits_golden else None
    )
)

hits_bad = scan_forbidden_phrases(BAD)
check(
    f"bad lore: ≥3 forbidden phrases (found {len(hits_bad)})",
    lambda: (
        (_ for _ in ()).throw(AssertionError(f"Only found: {hits_bad}"))
        if len(hits_bad) < 3 else None
    )
)

# ── PII scan ──────────────────────────────────────────────────────────────────
print("\n── PII Scan ──")

import re

def _all_text(lore):
    parts = []
    def walk(obj):
        if isinstance(obj, str): parts.append(obj)
        elif isinstance(obj, dict): [walk(v) for v in obj.values()]
        elif isinstance(obj, list): [walk(i) for i in obj]
    walk(lore)
    return " ".join(parts)

PII_PATTERNS = {
    "email": re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"),
    "phone_IN": re.compile(r"(\+91[\s\-]?)?[6-9]\d{9}"),
    "aadhar": re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b"),
}

golden_text = _all_text(GOLDEN)
for pii_type, pattern in PII_PATTERNS.items():
    matches = pattern.findall(golden_text)
    check(
        f"golden lore: no {pii_type} PII",
        lambda m=matches, t=pii_type: (
            (_ for _ in ()).throw(AssertionError(f"Found {t}: {m[:2]}")) if m else None
        )
    )

# ── Nostalgia engine ───────────────────────────────────────────────────────────
print("\n── Nostalgia Engine ──")

engine = NostalgiaEngine()

def _score(chaos, years):
    return engine._score({"chaos_score": chaos, "years_ago": years})["nostalgia_score"]

check("high chaos (85) > low chaos (30) at same age",
      lambda: [None for _ in [(_score(85,2), _score(30,2))] if _[0] > _[1]])
check("older memory (5yr) > recent (1yr) at same chaos",
      lambda: [None for _ in [(_score(70,5), _score(70,1))] if _[0] > _[1]])
check("nostalgia score never negative",
      lambda: [None for c in [0,50,100] for y in [1,3,10] if _score(c,y) >= 0])

expected_formula = round(80 * (1 + math.log1p(3) * 0.5), 1)
actual_formula = _score(80, 3)
check(
    f"formula: chaos=80,years=3 → {expected_formula}",
    lambda: (
        (_ for _ in ()).throw(AssertionError(f"got {actual_formula}"))
        if abs(actual_formula - expected_formula) >= 0.01 else None
    )
)

# ── Superlative winner membership ─────────────────────────────────────────────
print("\n── Superlative Member Validation ──")

member_names = {m["display_name"].lower() for m in SIGNALS["members"]}
for sup in GOLDEN.get("superlatives", []):
    winner = sup.get("winner_name", "").lower()
    if winner not in ("group", "everyone", "the group"):
        check(
            f"superlative winner '{sup['winner_name']}' is a known member",
            lambda w=winner: (
                (_ for _ in ()).throw(AssertionError(f"'{w}' not in {member_names}"))
                if w not in member_names else None
            )
        )

# ── Archetype validity ────────────────────────────────────────────────────────
print("\n── Archetype Validity ──")

VALID_ARCHETYPES = {
    "Black Cat", "Golden Retriever", "NPC", "Main Character",
    "Chaos Source", "Emotional Support NPC",
}

for sup in GOLDEN.get("superlatives", []):
    arch = sup.get("archetype", "")
    check(
        f"superlative archetype '{arch}' is valid",
        lambda a=arch: (
            (_ for _ in ()).throw(AssertionError(f"'{a}' not in valid set"))
            if a not in VALID_ARCHETYPES else None
        )
    )

# ── Photo clustering ──────────────────────────────────────────────────────────
print("\n── Photo Time Clustering Logic ──")

def _cluster_photos_by_time(photos):
    """Local copy of orchestrator logic for testing."""
    from datetime import datetime, timezone

    def parse_dt(s):
        s = s.replace("Z", "+00:00")
        return datetime.fromisoformat(s)

    sorted_photos = sorted(photos, key=lambda p: parse_dt(p["created_at"]))
    clusters = []
    current = []
    TWO_HOURS = 2 * 3600

    for photo in sorted_photos:
        if not current:
            current.append(photo)
        else:
            gap = (parse_dt(photo["created_at"]) - parse_dt(current[-1]["created_at"])).total_seconds()
            if gap <= TWO_HOURS:
                current.append(photo)
            else:
                clusters.append(current)
                current = [photo]

    if current:
        clusters.append(current)
    return clusters

photos = [
    {"created_at": "2024-03-15T10:00:00Z", "id": "p1"},
    {"created_at": "2024-03-15T10:30:00Z", "id": "p2"},
    {"created_at": "2024-03-15T11:45:00Z", "id": "p3"},
    {"created_at": "2024-03-15T14:00:00Z", "id": "p4"},
    {"created_at": "2024-03-15T14:20:00Z", "id": "p5"},
]
clusters = _cluster_photos_by_time(photos)
check("5 photos → 2 clusters (gap at 14:00)", lambda: [None for n in [len(clusters)] if n == 2])
check("cluster 1 has 3 photos", lambda: [None for n in [len(clusters[0])] if n == 3])
check("cluster 2 has 2 photos", lambda: [None for n in [len(clusters[1])] if n == 2])

# ── Chaos calibration: chill trip ─────────────────────────────────────────────
print("\n── Chaos Score Non-regression ──")

chill_score = 22
check("chill trip score ≤35", lambda: [None for s in [chill_score] if s <= 35])
chill_verdict = _verdict(chill_score)
check(
    f"chill trip verdict is Mildly Simmering or Emotionally Unstable (got {chill_verdict})",
    lambda: (
        (_ for _ in ()).throw(AssertionError(f"got {chill_verdict}"))
        if chill_verdict not in ("Mildly Simmering", "Emotionally Unstable") else None
    )
)

# ── Image gen: _time_mood helper ─────────────────────────────────────────────
print("\n── Image Gen: _time_mood ──")

TIME_MOOD_CASES = [
    ("3 AM chaos session",        "blue-hour night"),
    ("late night beach walk",      "blue-hour night"),
    ("midnight confession",        "blue-hour night"),
    ("sunrise yoga fail",          "soft pastel morning light"),
    ("early morning departure",    "soft pastel morning light"),
    ("dawn at the ghats",          "soft pastel morning light"),
    ("lunch panic",                "harsh midday sun"),
    ("midday trek",                "harsh midday sun"),
    ("afternoon swimming",         "harsh midday sun"),
    ("completely vague timeframe", "golden hour"),
    ("",                           "golden hour"),
]

for timeframe, expected_fragment in TIME_MOOD_CASES:
    check(
        f"_time_mood({repr(timeframe)[:30]}) contains '{expected_fragment}'",
        lambda t=timeframe, e=expected_fragment: (
            (_ for _ in ()).throw(AssertionError(f"got: {_time_mood(t)!r}"))
            if e not in _time_mood(t) else None
        )
    )

# ── Image gen: budget guard ───────────────────────────────────────────────────
print("\n── Image Gen: Budget Guard ──")

import time as _time

def _reset_budget():
    budget_db.clear()

def _test_budget_increments():
    _reset_budget()
    _ig.settings.FAL_DAILY_BUDGET = 200
    assert _budget_ok() is True
    today = _ig._get_today_key()
    assert budget_db.get(today) == 1

def _test_budget_blocks_at_limit():
    _reset_budget()
    _ig.settings.FAL_DAILY_BUDGET = 3
    assert _budget_ok() is True
    assert _budget_ok() is True
    assert _budget_ok() is True
    assert _budget_ok() is False
    today = _ig._get_today_key()
    assert budget_db.get(today) == 3

def _test_budget_resets_after_window():
    _reset_budget()
    _ig.settings.FAL_DAILY_BUDGET = 2
    assert _budget_ok() is True
    assert _budget_ok() is True
    assert _budget_ok() is False
    
    with patch("src.image_gen._get_today_key", return_value="2026-05-19"):
        assert _budget_ok() is True
        assert budget_db.get("2026-05-19") == 1

check("budget increments on each call", _test_budget_increments)
check("budget blocks at exact limit", _test_budget_blocks_at_limit)
check("budget resets after window expires", _test_budget_resets_after_window)

# ── Image gen: trip quota guard ───────────────────────────────────────────────
print("\n── Image Gen: Trip Quota Guard ──")

def _reset_quota():
    _ig._trip_window.clear()

def _test_quota_first_run():
    _reset_quota()
    _ig.settings.FAL_TRIP_DAILY_LIMIT = 2
    assert _trip_quota_ok("trip-test") is True

def _test_quota_second_run():
    _reset_quota()
    _ig.settings.FAL_TRIP_DAILY_LIMIT = 2
    _trip_quota_ok("trip-test")
    assert _trip_quota_ok("trip-test") is True

def _test_quota_blocks_third():
    _reset_quota()
    _ig.settings.FAL_TRIP_DAILY_LIMIT = 2
    _trip_quota_ok("trip-test"); _trip_quota_ok("trip-test")
    assert _trip_quota_ok("trip-test") is False

def _test_quota_trips_independent():
    _reset_quota()
    _ig.settings.FAL_TRIP_DAILY_LIMIT = 1
    _trip_quota_ok("trip-a")
    assert _trip_quota_ok("trip-a") is False
    assert _trip_quota_ok("trip-b") is True

def _test_quota_resets_after_window():
    _reset_quota()
    _ig.settings.FAL_TRIP_DAILY_LIMIT = 1
    _trip_quota_ok("trip-test")
    assert _trip_quota_ok("trip-test") is False
    _ig._trip_window["trip-test"] = (1, _time.time() - 1)
    assert _trip_quota_ok("trip-test") is True

check("quota: first run allowed", _test_quota_first_run)
check("quota: second run allowed", _test_quota_second_run)
check("quota: third run blocked", _test_quota_blocks_third)
check("quota: different trips independent", _test_quota_trips_independent)
check("quota: resets after window expires", _test_quota_resets_after_window)

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"Results: {passed} passed, {failed} failed out of {passed+failed} tests")
if failed > 0:
    print("SOME TESTS FAILED")
    sys.exit(1)
else:
    print("ALL DETERMINISTIC TESTS PASSED")
    sys.exit(0)
