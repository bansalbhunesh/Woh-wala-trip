-- Photo view tracking table for dwell time signals
-- Used to identify emotionally resonant photos for lore emphasis

create table if not exists photo_views (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references photos(id) on delete cascade not null,
  trip_id uuid references trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  view_duration_ms integer not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists idx_photo_views_photo on photo_views(photo_id);
create index if not exists idx_photo_views_trip on photo_views(trip_id);

-- Aggregate view per photo (for the AI worker to query quickly)
create or replace view photo_view_stats as
  select
    photo_id,
    trip_id,
    count(*) as view_count,
    avg(view_duration_ms) as avg_duration_ms,
    max(view_duration_ms) as max_duration_ms,
    -- Photos viewed 9s+ are emotionally significant (Twitter dwell time equivalent)
    sum(case when view_duration_ms >= 9000 then 1 else 0 end) as long_view_count
  from photo_views
  group by photo_id, trip_id;

alter table photo_views enable row level security;

drop policy if exists "authenticated members can insert their own views" on photo_views;
create policy "authenticated members can insert their own views"
  on photo_views for insert
  to authenticated
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from trip_members
      where trip_members.trip_id = photo_views.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

drop policy if exists "service role full access on photo_views" on photo_views;
create policy "service role full access on photo_views"
  on photo_views for all
  to service_role
  using (true)
  with check (true);

