-- AI Student Routine Manager — initial schema
-- Run in Supabase SQL Editor or via `supabase db push` after linking the project.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (onboarding + Telegram + timezone)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  timezone text not null default 'UTC',
  telegram_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App profile linked 1:1 to auth.users; stores display name, IANA timezone, and Telegram chat id for alerts.';

create index profiles_telegram_chat_id_idx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null;

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- constraints: fixed classes + life variables (one row per user for MVP)
-- ---------------------------------------------------------------------------
create table public.constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fixed_schedule jsonb not null default '[]'::jsonb,
  life_variables jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.constraints is 'User-defined fixed blocks and life variables; JSON shape documented in app code.';
comment on column public.constraints.fixed_schedule is 'e.g. [{"title":"Calculus","weekday":1,"start":"09:00","end":"11:00"}] — weekday 0=Sun .. 6=Sat (adjust in app if you prefer Mon=0).';
comment on column public.constraints.life_variables is 'e.g. {"commute_minutes":45,"sleep_hours":8}';

create trigger constraints_set_updated_at
  before update on public.constraints
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks: generated schedule blocks + completion + alert bookkeeping
-- ---------------------------------------------------------------------------
create type public.task_category as enum ('class', 'study', 'life');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category public.task_category not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  schedule_date date not null,
  completed boolean not null default false,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.tasks is 'AI-generated (or fixed-class) blocks for the timeline UI and Telegram 15-minute reminders.';
comment on column public.tasks.alert_sent_at is 'When a 15-minute heads-up was sent; null means not sent yet for that block.';

create index tasks_user_schedule_date_idx on public.tasks (user_id, schedule_date);
create index tasks_user_starts_at_idx on public.tasks (user_id, starts_at);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.constraints enable row level security;
alter table public.tasks enable row level security;

-- profiles: users read/update only their own row
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- constraints: full CRUD own rows only
create policy "constraints_select_own"
  on public.constraints for select
  using (auth.uid() = user_id);

create policy "constraints_insert_own"
  on public.constraints for insert
  with check (auth.uid() = user_id);

create policy "constraints_update_own"
  on public.constraints for update
  using (auth.uid() = user_id);

create policy "constraints_delete_own"
  on public.constraints for delete
  using (auth.uid() = user_id);

-- tasks: full CRUD own rows only
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
