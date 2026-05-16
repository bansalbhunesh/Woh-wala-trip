# Supabase Migrations

All migration files must be run manually in the **Supabase SQL editor** in strict filename (chronological) order.

Project SQL editor:
https://app.supabase.com/project/lngtsccftumhbycywerg/sql

## Order

| File | Description |
|------|-------------|
| `20260515_auto_profile.sql` | Trigger: auto-create `profiles` row on new auth signup |
| `20260516_anniversary_and_reactions.sql` | `scheduled_emails` table + lore reaction tables/views |
| `20260516_cross_trip_features.sql` | `user_archetypes`, `yearly_wraps`, `username`/`is_public` columns, archetype functions, `public_profiles` view |

## Rules

- Never skip a file or run them out of order — later migrations may depend on objects created by earlier ones.
- Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`) so re-running a file is safe.
- Use the service-role key when executing from a script or CI; use the SQL editor for one-off manual runs.
