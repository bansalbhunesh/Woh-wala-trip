"""
Unit tests for image_gen.py abuse guards and idempotency logic.

All tests are pure Python — no fal.ai calls, no Supabase calls, no Claude calls.
Mocks isolate the guard and idempotency logic from all I/O.

Fast markers: run with: pytest -m "fast"
"""

import time
import threading
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import src.image_gen as ig


# ─── Budget guard ─────────────────────────────────────────────────────────────

class TestBudgetGuard:
    def setup_method(self):
        self.budget_db = {}
        
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
                return MockFalBudgetTable(self.budget_db)
            return MagicMock()

        self.original_table = ig.supabase.table
        ig.supabase.table = mock_table

    def teardown_method(self):
        ig.supabase.table = self.original_table

    @pytest.mark.fast
    def test_first_call_within_budget(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_DAILY_BUDGET = 200
            assert ig._budget_ok() is True
            today = ig._get_today_key()
            assert self.budget_db.get(today) == 1

    @pytest.mark.fast
    def test_budget_exhausted_returns_false(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_DAILY_BUDGET = 3
            assert ig._budget_ok() is True
            assert ig._budget_ok() is True
            assert ig._budget_ok() is True
            result = ig._budget_ok()
        assert result is False
        today = ig._get_today_key()
        assert self.budget_db.get(today) == 3

    @pytest.mark.fast
    def test_budget_counter_resets_after_window_expires(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_DAILY_BUDGET = 2
            assert ig._budget_ok() is True
            assert ig._budget_ok() is True
            assert ig._budget_ok() is False

            # Expire the 24h window
            with patch.object(ig, '_get_today_key', return_value="2026-05-19"):
                assert ig._budget_ok() is True
                assert self.budget_db.get("2026-05-19") == 1

    @pytest.mark.fast
    def test_budget_guard_is_thread_safe(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_DAILY_BUDGET = 50
            results = []

            def call_budget():
                results.append(ig._budget_ok())

            threads = [threading.Thread(target=call_budget) for _ in range(60)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

        approved = sum(1 for r in results if r is True)
        denied = sum(1 for r in results if r is False)
        assert approved == 50
        assert denied == 10
        today = ig._get_today_key()
        assert self.budget_db.get(today) == 50

    @pytest.mark.fast
    def test_budget_low_warning_logged(self, caplog):
        import logging
        with patch.object(ig, 'settings') as s:
            s.FAL_DAILY_BUDGET = 12
            # Use 3 calls → 9 remaining → still above threshold
            for _ in range(3):
                ig._budget_ok()
            with caplog.at_level(logging.WARNING, logger="wwt.image_gen"):
                ig._budget_ok()  # 4th → 8 remaining → warning fires
        assert any("budget low" in r.message for r in caplog.records)


# ─── Trip quota guard ──────────────────────────────────────────────────────────

class TestTripQuotaGuard:
    def setup_method(self):
        ig._trip_window.clear()

    @pytest.mark.fast
    def test_first_run_allowed(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_TRIP_DAILY_LIMIT = 2
            assert ig._trip_quota_ok("trip-abc") is True

    @pytest.mark.fast
    def test_second_run_allowed(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_TRIP_DAILY_LIMIT = 2
            ig._trip_quota_ok("trip-abc")
            assert ig._trip_quota_ok("trip-abc") is True

    @pytest.mark.fast
    def test_third_run_blocked(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_TRIP_DAILY_LIMIT = 2
            ig._trip_quota_ok("trip-abc")
            ig._trip_quota_ok("trip-abc")
            assert ig._trip_quota_ok("trip-abc") is False

    @pytest.mark.fast
    def test_different_trips_are_independent(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_TRIP_DAILY_LIMIT = 1
            ig._trip_quota_ok("trip-a")
            assert ig._trip_quota_ok("trip-a") is False
            assert ig._trip_quota_ok("trip-b") is True

    @pytest.mark.fast
    def test_quota_resets_after_window_expires(self):
        with patch.object(ig, 'settings') as s:
            s.FAL_TRIP_DAILY_LIMIT = 1
            ig._trip_quota_ok("trip-abc")
            assert ig._trip_quota_ok("trip-abc") is False

            ig._trip_window["trip-abc"] = (1, time.time() - 1)
            assert ig._trip_quota_ok("trip-abc") is True


# ─── _call_fal short-circuits ─────────────────────────────────────────────────

@pytest.mark.fast
async def test_call_fal_skips_without_api_key():
    with patch.object(ig, 'settings') as s:
        s.FAL_API_KEY = ""
        result = await ig._call_fal("some prompt")
    assert result is None


@pytest.mark.fast
async def test_call_fal_skips_when_budget_exhausted():
    with patch.object(ig, 'settings') as s:
        s.FAL_API_KEY = "fal_test_key"
    with patch.object(ig, '_budget_ok', return_value=False):
        result = await ig._call_fal("some prompt")
    assert result is None


# ─── Idempotency: generate_trip_cover ────────────────────────────────────────

@pytest.mark.fast
async def test_cover_skips_if_already_generated():
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "trip-123",
        "name": "Goa 2024",
        "destination": "Goa",
        "lore_json": {"cooked_verdict": "Peak Delusion", "trip_personality_type": "chaotic"},
        "chaos_score": 75,
        "cover_image_url": "https://already.set/cover.png",
    }

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, '_call_fal', new_callable=AsyncMock) as mock_fal:
            await ig.generate_trip_cover("trip-123", force=False)
            mock_fal.assert_not_called()


@pytest.mark.fast
async def test_cover_regenerates_with_force():
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "trip-123",
        "name": "Goa 2024",
        "destination": "Goa",
        "lore_json": {"cooked_verdict": "Peak Delusion", "trip_personality_type": "chaotic"},
        "chaos_score": 75,
        "cover_image_url": "https://already.set/cover.png",
    }

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, '_call_fal', new_callable=AsyncMock, return_value=None) as mock_fal:
            await ig.generate_trip_cover("trip-123", force=True)
            mock_fal.assert_called_once()


@pytest.mark.fast
async def test_cover_skips_when_no_lore_json():
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "trip-123",
        "lore_json": None,
        "cover_image_url": None,
    }

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, '_call_fal', new_callable=AsyncMock) as mock_fal:
            await ig.generate_trip_cover("trip-123")
            mock_fal.assert_not_called()


# ─── Idempotency: generate_character_portraits ────────────────────────────────

@pytest.mark.fast
async def test_portraits_skip_members_with_existing_url():
    members = [
        {"user_id": "user-1", "role_title": "The Anchor", "role_archetype_tag": "Emotional Support NPC",
         "role_chaos_rating": 3, "portrait_url": "https://existing/portrait1.png"},
        {"user_id": "user-2", "role_title": "The Chaos Source", "role_archetype_tag": "Chaos Source",
         "role_chaos_rating": 9, "portrait_url": None},
    ]

    mock_sb = MagicMock()
    (mock_sb.table.return_value.select.return_value
     .eq.return_value.not_.is_.return_value
     .execute.return_value.data) = members

    generated = []

    async def mock_gen_portrait(trip_id, member):
        generated.append(member["user_id"])

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, '_gen_portrait', side_effect=mock_gen_portrait):
            await ig.generate_character_portraits("trip-123", force=False)

    assert generated == ["user-2"]


@pytest.mark.fast
async def test_portraits_regenerate_all_with_force():
    members = [
        {"user_id": "user-1", "role_title": "The Anchor", "role_archetype_tag": "Emotional Support NPC",
         "role_chaos_rating": 3, "portrait_url": "https://existing/portrait1.png"},
        {"user_id": "user-2", "role_title": "The Chaos Source", "role_archetype_tag": "Chaos Source",
         "role_chaos_rating": 9, "portrait_url": None},
    ]

    mock_sb = MagicMock()
    (mock_sb.table.return_value.select.return_value
     .eq.return_value.not_.is_.return_value
     .execute.return_value.data) = members

    generated = []

    async def mock_gen_portrait(trip_id, member):
        generated.append(member["user_id"])

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, '_gen_portrait', side_effect=mock_gen_portrait):
            await ig.generate_character_portraits("trip-123", force=True)

    assert set(generated) == {"user-1", "user-2"}


# ─── Era cap ──────────────────────────────────────────────────────────────────

@pytest.mark.fast
async def test_era_thumbnails_capped_at_fal_max_eras():
    eras = [
        {"id": f"era-{i}", "era_name": f"Chapter {i}", "timeframe": "evening",
         "description": "stuff happened", "display_order": i, "thumbnail_url": None}
        for i in range(10)
    ]

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"destination": "Goa"}
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = eras

    generated = []

    async def mock_gen_era(trip_id, era, destination):
        generated.append(era["id"])

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, 'settings') as s:
            s.FAL_MAX_ERAS = 5
            with patch.object(ig, '_gen_era_thumbnail', side_effect=mock_gen_era):
                await ig.generate_era_thumbnails("trip-123", force=True)

    assert len(generated) == 5


@pytest.mark.fast
async def test_era_thumbnails_skip_existing():
    eras = [
        {"id": "era-1", "era_name": "Chapter 1", "timeframe": "morning",
         "description": "dawn chaos", "display_order": 1, "thumbnail_url": "https://existing.png"},
        {"id": "era-2", "era_name": "Chapter 2", "timeframe": "night",
         "description": "3am decisions", "display_order": 2, "thumbnail_url": None},
    ]

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"destination": "Manali"}
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = eras

    generated = []

    async def mock_gen_era(trip_id, era, destination):
        generated.append(era["id"])

    with patch.object(ig, 'supabase', mock_sb):
        with patch.object(ig, 'settings') as s:
            s.FAL_MAX_ERAS = 5
            with patch.object(ig, '_gen_era_thumbnail', side_effect=mock_gen_era):
                await ig.generate_era_thumbnails("trip-123", force=False)

    assert generated == ["era-2"]


# ─── generate_all_images quota gate ──────────────────────────────────────────

@pytest.mark.fast
async def test_generate_all_skips_when_trip_quota_exceeded():
    with patch.object(ig, '_trip_quota_ok', return_value=False):
        with patch.object(ig, 'generate_trip_cover', new_callable=AsyncMock) as mock_cover:
            with patch.object(ig, 'generate_character_portraits', new_callable=AsyncMock) as mock_portraits:
                with patch.object(ig, 'generate_era_thumbnails', new_callable=AsyncMock) as mock_eras:
                    await ig.generate_all_images("trip-123")

    mock_cover.assert_not_called()
    mock_portraits.assert_not_called()
    mock_eras.assert_not_called()


@pytest.mark.fast
async def test_generate_all_runs_all_three_when_quota_ok():
    with patch.object(ig, '_trip_quota_ok', return_value=True):
        with patch.object(ig, 'generate_trip_cover', new_callable=AsyncMock) as mock_cover:
            with patch.object(ig, 'generate_character_portraits', new_callable=AsyncMock) as mock_portraits:
                with patch.object(ig, 'generate_era_thumbnails', new_callable=AsyncMock) as mock_eras:
                    await ig.generate_all_images("trip-xyz", force=True)

    mock_cover.assert_called_once_with("trip-xyz", force=True)
    mock_portraits.assert_called_once_with("trip-xyz", force=True)
    mock_eras.assert_called_once_with("trip-xyz", force=True)


# ─── _time_mood helper ─────────────────────────────────────────────────────────

@pytest.mark.fast
def test_time_mood_night_keywords():
    assert "blue-hour night" in ig._time_mood("3 AM chaos session")
    assert "blue-hour night" in ig._time_mood("late night beach walk")
    assert "blue-hour night" in ig._time_mood("midnight confession")


@pytest.mark.fast
def test_time_mood_morning_keywords():
    assert "soft pastel morning light" in ig._time_mood("sunrise yoga fail")
    assert "soft pastel morning light" in ig._time_mood("early morning departure")
    assert "soft pastel morning light" in ig._time_mood("dawn at the ghats")


@pytest.mark.fast
def test_time_mood_afternoon_keywords():
    assert "harsh midday sun" in ig._time_mood("lunch panic")
    assert "harsh midday sun" in ig._time_mood("midday trek")
    assert "harsh midday sun" in ig._time_mood("afternoon swimming")


@pytest.mark.fast
def test_time_mood_default_fallback():
    assert "golden hour" in ig._time_mood("completely vague timeframe")


@pytest.mark.fast
def test_time_mood_empty_string():
    result = ig._time_mood("")
    assert result
    assert "golden hour" in result
