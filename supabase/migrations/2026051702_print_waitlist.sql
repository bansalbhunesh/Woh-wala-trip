-- Print book waitlist
CREATE TABLE IF NOT EXISTS print_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, user_id)
);

ALTER TABLE print_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own waitlist entries" ON print_waitlist;
CREATE POLICY "Users can insert their own waitlist entries"
  ON print_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own waitlist entries" ON print_waitlist;
CREATE POLICY "Users can view their own waitlist entries"
  ON print_waitlist FOR SELECT
  USING (auth.uid() = user_id);
