-- ─────────────────────────────────────────────────────────────────────────────
-- CLIP EMBEDDINGS + MEMORY ECHO + NOSTALGIA MOMENTS
-- Requires: pgvector extension (enable in Supabase → Database → Extensions)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists vector;

-- Add 512-dim CLIP ViT-B/32 embedding column (null until worker processes photo)
alter table public.photos add column if not exists clip_embedding vector(512);

-- ivfflat index: 100 lists handles up to ~1M photos well at 10ms query time
-- cosine ops since CLIP embeddings are L2-normalized before storage
create index if not exists photos_clip_embedding_idx
  on public.photos
  using ivfflat (clip_embedding vector_cosine_ops)
  with (lists = 100);

-- RPC: find visually similar photos from OTHER trips the user is a member of.
-- Powers the "memory echo" feature: "3 years ago you took this exact shot."
-- cosine distance (<=>): 0 = identical, 2 = opposite. We return 1 - distance as similarity.
create or replace function public.find_similar_photos(
  p_photo_id uuid,
  p_user_id  uuid,
  p_limit    int default 5
) returns table(
  photo_id       uuid,
  trip_id        uuid,
  trip_name      text,
  storage_path   text,
  thumbnail_path text,
  similarity     double precision,
  trip_year      int,
  destination    text
) language plpgsql security definer as $$
declare
  v_embedding vector(512);
  v_trip_id   uuid;
begin
  select clip_embedding, trip_id into v_embedding, v_trip_id
  from public.photos where id = p_photo_id;

  if v_embedding is null then
    return;
  end if;

  return query
    select
      p.id,
      p.trip_id,
      t.name,
      p.storage_path,
      p.thumbnail_path,
      (1.0 - (p.clip_embedding <=> v_embedding)),
      extract(year from t.trip_start_date)::int,
      t.destination
    from public.photos p
    join public.trips t on t.id = p.trip_id
    -- Only return photos from trips the requesting user belongs to
    join public.trip_members tm
      on tm.trip_id = p.trip_id and tm.user_id = p_user_id
    where p.clip_embedding is not null
      and p.trip_id != v_trip_id
      and p.id != p_photo_id
    order by p.clip_embedding <=> v_embedding asc
    limit p_limit;
end;
$$;

-- RPC: "This day in history" — photos from the same calendar date in past trips.
-- ±3 day window handles short trips where photos might be a day off.
-- Ordered by chaos_score desc so the wildest memories surface first.
create or replace function public.get_nostalgia_moments(
  p_user_id uuid,
  p_limit   int default 10
) returns table(
  photo_id       uuid,
  trip_id        uuid,
  trip_name      text,
  trip_year      int,
  destination    text,
  storage_path   text,
  thumbnail_path text,
  chaos_score    int,
  years_ago      int,
  lore_tagline   text
) language plpgsql security definer as $$
begin
  return query
    select
      p.id,
      t.id,
      t.name,
      extract(year from coalesce(p.created_at, t.trip_start_date))::int,
      t.destination,
      p.storage_path,
      p.thumbnail_path,
      t.chaos_score,
      (extract(year from now()) - extract(year from coalesce(p.created_at, t.trip_start_date)))::int,
      (t.lore_json->>'tagline')::text
    from public.photos p
    join public.trips t on t.id = p.trip_id
    join public.trip_members tm on tm.trip_id = p.trip_id and tm.user_id = p_user_id
    where
      abs(
        extract(doy from p.created_at) - extract(doy from now())
      ) <= 3
      and extract(year from p.created_at) < extract(year from now())
      and t.lore_json is not null
    order by t.chaos_score desc nulls last, p.created_at desc
    limit p_limit;
end;
$$;

-- RPC: get a user's cross-trip archetype summary.
-- "Rohan has been The Chaos Agent in 7/7 trips." Powers identity continuity.
create or replace function public.get_member_archetype_summary(
  p_user_id uuid,
  p_trip_id uuid
) returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
  v_total   int;
  v_top_tag text;
  v_top_count int;
  v_avg_chaos numeric;
begin
  select count(*), round(avg(role_chaos_rating))
  into v_total, v_avg_chaos
  from public.user_archetypes
  where user_id = p_user_id;

  select role_archetype_tag, count(*) as cnt
  into v_top_tag, v_top_count
  from public.user_archetypes
  where user_id = p_user_id
  group by role_archetype_tag
  order by cnt desc
  limit 1;

  v_result := jsonb_build_object(
    'total_trips',   v_total,
    'top_archetype', v_top_tag,
    'top_count',     v_top_count,
    'avg_chaos',     v_avg_chaos
  );

  return v_result;
end;
$$;
