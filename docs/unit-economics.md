# Yaarlore Unit Economics

## Revenue Per Trip

| Tier                   | Price       | Claude cost est.            | fal.ai cost           | Net margin       |
| ---------------------- | ----------- | --------------------------- | --------------------- | ---------------- |
| Digital (Rs 399)       | Rs 399      | ~Rs 150 (60k tokens Sonnet) | ~Rs 50 (3 images)     | ~Rs 199 (50%)    |
| Print (Rs 799)         | Rs 799      | ~Rs 150                     | ~Rs 50 + Rs 300 print | ~Rs 299 (37%)    |
| Monthly sub (Rs 99/mo) | Rs 1,188/yr | ~Rs 600/yr (4 trips)        | ~Rs 200/yr            | ~Rs 388/yr (33%) |

Cost estimates use Claude Sonnet pricing at time of writing. Token usage tracked via
Langfuse; see `docs/runbooks/ai-cost-alerts.md` for budget alert setup.

## LTV Model (Current one-time pricing)

- Avg trips/year per friend group: 2-3
- Avg monetized trips: 1 (first generation free)
- LTV: Rs 399 x 1.5 trips/yr = ~Rs 600/year per active user

## LTV Model (Subscription)

- Rs 99/month x 12 = Rs 1,188/year
- Churn assumption: 30%/year
- Expected LTV: Rs 1,188 / 0.30 = Rs 3,960 per subscriber

## CAC Target

- Organic: Rs 0 (invite-code viral — 1 creator brings 5+ members)
- Paid: target < Rs 500 CAC to maintain positive LTV/CAC > 7x

## Viral Coefficient

- 1 trip creator invites avg 5 members
- 1 public story share reaches avg 50 viewers
- If 5% convert: k = 1 creator x 5 shares x 0.05 = 0.25 organic k-factor
- With battle mode: estimated 1.1-1.3 k-factor (word-of-mouth battles)

## Token Budget Constraints

The platform enforces a per-user monthly token cap (`MONTHLY_TOKEN_CAP_PER_USER`, default
500,000 tokens). At ~60k tokens per lore pipeline, this allows ~8 full runs/month per user
on the free tier before hitting the cap. Paid subscribers bypass the cap.

## Infrastructure Cost at Scale

| Users (MAU) | Vercel (est.) | Supabase (est.) | Render (worker) | Total/mo |
| ----------- | ------------- | --------------- | --------------- | -------- |
| 1,000       | Free          | Free            | $7              | $7       |
| 10,000      | ~$20          | ~$25            | $25             | ~$70     |
| 100,000     | ~$150         | ~$150           | $85             | ~$385    |

At 100k MAU with 10% conversion to paid (Rs 399 avg): Rs 39,90,000/mo revenue vs ~Rs 32,000
infra cost — infra is less than 1% of revenue at scale.

## Break-Even

Break-even at ~20 paying trips/month covers Render Starter cost.
With 100 paying trips/month (realistic for a college-circuit launch), operating profit positive.
