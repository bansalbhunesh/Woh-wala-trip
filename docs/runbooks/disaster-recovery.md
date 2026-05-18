# Yaarlore Disaster Recovery Runbook

## Scenario 1: AI Worker Down (Render)

**Symptom:** `/api/health` shows `ai_worker: error`. All lore generations queue but don't process.

**Impact:** Generations queue in `generation_jobs` table (durable). No data loss.

**Steps:**

1. Check Render dashboard — restart the service if crashed
2. If Render is down, all queued jobs will auto-process when worker comes back
3. Stuck `processing` trips will auto-reset after 30 min by `reset_stuck_pipelines()`
4. Manual reset:
   ```sql
   UPDATE trips
   SET lore_status = 'failed'
   WHERE lore_status = 'processing'
     AND processing_started_at < now() - interval '30 minutes';
   ```

---

## Scenario 2: Supabase Outage

**Symptom:** All tRPC calls fail with `INTERNAL_SERVER_ERROR`.

**Impact:** Complete service outage. No writes possible.

**Steps:**

1. Monitor https://status.supabase.com
2. No action needed — service auto-recovers when Supabase comes back
3. Check Sentry for any data corruption events after recovery

---

## Scenario 3: Anthropic API Outage

**Symptom:** Lore generations fail with `OVERLOAD` errors.

**Impact:** New generations fail. Existing lore unaffected.

**Steps:**

1. Check https://status.anthropic.com
2. Worker will auto-retry with Haiku fallback model (configured via `CLAUDE_FALLBACK_MODEL`)
3. If Haiku is also down, `lore_status` is set to `failed` — users can retry manually

---

## Scenario 4: Runaway AI Costs

**Symptom:** Anthropic dashboard shows unexpected spend spike.

**Steps:**

1. Immediately set `MONTHLY_TOKEN_CAP_PER_USER=0` in Vercel env → redeploy → all generation blocked
2. Set `LORE_EVAL_SAMPLE_RATE=0` in Render env → evaluator disabled
3. Investigate:
   ```sql
   SELECT creator_id, SUM(generation_cost_tokens)
   FROM trips
   GROUP BY creator_id
   ORDER BY 2 DESC
   LIMIT 10;
   ```
4. Block the abusive user:
   ```sql
   UPDATE profiles
   SET monthly_token_cap_override = 0
   WHERE id = '<user_id>';
   ```

---

## Rollback Procedure

To revert a bad deploy:

1. **Vercel:** Deployments → previous deployment → Redeploy
2. **DB migrations:** Supabase does not support automatic rollback. Manually reverse the migration via the SQL editor.
3. Each migration in `supabase/migrations/` should be paired with a `*_rollback.sql` comment block for critical schema changes.

---

## Key Contacts / Links

| Resource         | URL                          |
| ---------------- | ---------------------------- |
| Vercel dashboard | https://vercel.com/dashboard |
| Render dashboard | https://dashboard.render.com |
| Supabase status  | https://status.supabase.com  |
| Anthropic status | https://status.anthropic.com |
| Sentry errors    | https://sentry.io            |
| Upstash console  | https://console.upstash.com  |
