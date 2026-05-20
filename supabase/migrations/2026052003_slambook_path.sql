-- Add slambook_path to trips.
-- Set by the generate_slambook background job after PDF generation completes.
-- Used by trips.getSlambookUrl tRPC query to produce a signed download URL.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS slambook_path text;
