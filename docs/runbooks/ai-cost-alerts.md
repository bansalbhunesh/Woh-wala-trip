# Runbook: Anthropic & fal.ai Spend Alerts

## Anthropic Dashboard Spend Alert

1. Log in at https://console.anthropic.com
2. Go to **Settings > Billing > Spend Limits**
3. Set a **Soft Limit** at ~70% of your monthly budget (triggers an email alert)
4. Set a **Hard Limit** at 100% of your monthly budget (API returns 429 when reached)

Recommended starting limits for Yaarlore:

- Soft limit: $30/month (alert)
- Hard limit: $50/month (block)

## fal.ai Spend Alert

1. Log in at https://fal.ai/dashboard
2. Go to **Settings > Billing**
3. Enable email notifications for daily or monthly spend thresholds

## When an Alert Fires

1. Check `fal_budget` table in Supabase: `SELECT * FROM fal_budget ORDER BY date DESC LIMIT 7;`
2. Check `profiles` for high consumers: `SELECT id, generation_tokens_used_this_month FROM profiles ORDER BY generation_tokens_used_this_month DESC LIMIT 10;`
3. If a single user is consuming most budget, consider lowering `MONTHLY_TOKEN_CAP_PER_USER` env var (default 500000) on Render
4. If viral traffic is the cause, lower `FAL_DAILY_BUDGET` env var on the AI worker (default 200)
5. Set Anthropic Hard Limit lower if needed to stop all new generation immediately

## Environment Variables That Control Cost

| Var                          | Default                | Effect                                              |
| ---------------------------- | ---------------------- | --------------------------------------------------- |
| `MONTHLY_TOKEN_CAP_PER_USER` | 500000                 | Max Claude tokens per user per month                |
| `FAL_DAILY_BUDGET`           | 200                    | Max fal.ai image calls per day                      |
| `LORE_EVAL_SAMPLE_RATE`      | 1.0 (dev) / 0.2 (prod) | Fraction of lore runs that trigger Haiku evaluation |
