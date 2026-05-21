-- Tracks anonymous clip usage for freemium gating
-- user_key: anon_<base36-hash> derived from IP+UA (no PII stored)
create table if not exists clip_usage (
  user_key text not null,
  month text not null,  -- format: YYYY-MM
  clip_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_key, month)
);

-- Stores generated clips for history/replay
create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  clip_title text,
  hook_line text,
  transcript_text text,
  video_url text not null,
  provider text not null,
  duration_seconds integer,
  aspect_ratio text,
  virality_score integer,
  created_at timestamptz not null default now()
);

create index if not exists clips_user_key_idx on clips (user_key, created_at desc);

-- Atomic increment for concurrent requests
create or replace function increment_clip_count(p_user_key text, p_month text)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update clip_usage
  set clip_count = clip_count + 1, updated_at = now()
  where user_key = p_user_key and month = p_month
  returning clip_count into new_count;

  if not found then
    insert into clip_usage (user_key, month, clip_count)
    values (p_user_key, p_month, 1)
    on conflict (user_key, month) do update
      set clip_count = clip_usage.clip_count + 1, updated_at = now()
    returning clip_count into new_count;
  end if;

  return new_count;
end;
$$;
