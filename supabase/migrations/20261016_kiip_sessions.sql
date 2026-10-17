-- KIIP practice session + answer persistence (Phase 2)
-- Server (service role) only; no anon policies.

create table if not exists public.kiip_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  stage smallint not null check (stage between 1 and 6),
  question_count smallint not null check (question_count between 1 and 20),
  score smallint not null default 0 check (score >= 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kiip_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.kiip_sessions(id) on delete cascade,
  question_id text not null references public.kiip_questions(id),
  selected_index smallint not null check (selected_index between 0 and 3),
  is_correct boolean not null,
  topic_key text not null default '',
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists kiip_sessions_device_started_idx
  on public.kiip_sessions(device_id, started_at desc);

create index if not exists kiip_sessions_device_status_idx
  on public.kiip_sessions(device_id, status);

create index if not exists kiip_answers_session_idx
  on public.kiip_answers(session_id);

alter table public.kiip_sessions enable row level security;
alter table public.kiip_answers enable row level security;

-- Application uses service-role client only (same pattern as kiip_questions).
