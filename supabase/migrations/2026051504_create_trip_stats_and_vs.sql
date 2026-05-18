-- Create trip_stats and trip_vs_trip tables

CREATE TABLE IF NOT EXISTS public.trip_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  unit          TEXT,
  display_order INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, label)
);

CREATE TABLE IF NOT EXISTS public.trip_vs_trip (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_a_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  trip_b_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',
  voting_ends_at  TIMESTAMPTZ NOT NULL,
  ai_verdict_json JSONB,
  ai_winner       UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
