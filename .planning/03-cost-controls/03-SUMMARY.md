# Phase 3: Cost Controls — Summary

**Completed:** 2026-05-19
**Status:** ✅ All 5 requirements complete

---

## Requirements Status

| ID      | Requirement                                                                | Status  | Evidence                                                                        |
| ------- | -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| COST-01 | Monthly token cap per user in `profiles.generation_tokens_used_this_month` | ✅ Done | Migration: `2026051901_cost_controls.sql:10-12`; enforced in `trips.ts:456-480` |
| COST-02 | `fal_budget` table persists `_fal_calls_today` counter by date             | ✅ Done | Migration: `2026051901_cost_controls.sql:77-89`; `image_gen.py:57-98`           |
| COST-03 | `LoreEvaluator.evaluate()` sampling via `LORE_EVAL_SAMPLE_RATE` env var    | ✅ Done | `config.py:41`; applied in `orchestrator.py:583-594`                            |
| COST-04 | Anthropic dashboard spend alert documented                                 | ✅ Done | `docs/runbooks/ai-cost-alerts.md`                                               |
| COST-05 | `warmupWorker` 10-minute server-side cache                                 | ✅ Done | `trips.ts:79-84` (module-level Map); used at `trips.ts:1078-1085`               |

---

## Key Implementation Details

**COST-01**: `profiles` table has `generation_tokens_used_this_month` (INTEGER) and `generation_tokens_month` (DATE). The `trg_increment_user_token_usage` trigger auto-increments when `lore_status` transitions to `'ready'`. `generateLore` checks the cap early and throws `TOO_MANY_REQUESTS`. First generation and referral-bonus holders bypass the cap.

**COST-02**: `fal_budget` table (date PK, calls_count) survives worker restarts. `image_gen.py::_budget_ok()` atomically reads/increments via Supabase upsert with thread-safe `_budget_lock`. Default daily budget: 200 fal.ai calls.

**COST-03**: `LORE_EVAL_SAMPLE_RATE` defaults to `1.0` in config (all runs) but should be set to `0.2` in production via Render env var. The `_quality_gate` method skips evaluation via `random.random() >= settings.LORE_EVAL_SAMPLE_RATE`.

**COST-05**: `_warmupCache = new Map<string, number>()` with `WARMUP_TTL_MS = 600_000`. In-memory — resets on cold start, acceptable trade-off. Prevents redundant `/health` calls within 10-minute windows.

---

## Production Configuration Needed

- Set `LORE_EVAL_SAMPLE_RATE=0.2` on Render (default 1.0 means all runs are evaluated)
- Set `FAL_DAILY_BUDGET=200` on Render (or leave default)
- Set Anthropic spend alert at console.anthropic.com: soft $30/mo, hard $50/mo
