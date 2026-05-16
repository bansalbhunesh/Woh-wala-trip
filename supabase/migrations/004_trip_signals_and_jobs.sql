-- Trip signals: pre-computed structural data to feed lore generation
alter table trips add column if not exists trip_signals jsonb;

-- Generation job queue: durable fallback when HTTP trigger to AI worker fails
-- The worker polls this table every 60s using SKIP LOCKED
create table if not exists generation_jobs (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'done', 'failed')),
  created_at timestamptz default now() not null,
  claimed_at timestamptz,
  completed_at timestamptz,
  error text
);

create index if not exists idx_generation_jobs_pending
  on generation_jobs(created_at)
  where status = 'pending';

-- claim_generation_job(): atomically claims one pending job using SKIP LOCKED.
-- Returns null if no pending jobs exist.
-- Called by the AI worker polling loop every 60s.
create or replace function claim_generation_job()
returns uuid
language plpgsql
security definer
as $$
declare
  v_trip_id uuid;
begin
  update generation_jobs
  set status = 'claimed', claimed_at = now()
  where id = (
    select gj.id
    from generation_jobs gj
    join trips t on t.id = gj.trip_id
    where gj.status = 'pending'
      and t.lore_status not in ('processing', 'ready')
    order by gj.created_at asc
    limit 1
    for update skip locked
  )
  returning trip_id into v_trip_id;

  return v_trip_id;
end;
$$;

-- RLS: only service role touches job queue
alter table generation_jobs enable row level security;

create policy "service role full access on generation_jobs"
  on generation_jobs for all
  to service_role
  using (true)
  with check (true);
