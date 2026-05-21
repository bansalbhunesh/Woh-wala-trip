-- The AI worker writes role_archetype_tag to trip_members after assigning roles.
-- The column was referenced in orchestrator.py but never added to the schema,
-- causing every lore generation to fail with PGRST204 (column not found).
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS role_archetype_tag TEXT;

COMMENT ON COLUMN public.trip_members.role_archetype_tag IS
  'Short behavioural archetype descriptor assigned by AI pipeline (e.g. "agenda built on vibes")';
