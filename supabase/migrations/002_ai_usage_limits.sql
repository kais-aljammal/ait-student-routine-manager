-- Daily generation counter to enforce free-tier usage limits
create table if not exists public.ai_usage_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  requests_count integer not null default 0 check (requests_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create trigger ai_usage_limits_set_updated_at
  before update on public.ai_usage_limits
  for each row execute function public.set_updated_at();

alter table public.ai_usage_limits enable row level security;

create policy "ai_usage_limits_select_own"
  on public.ai_usage_limits for select
  using (auth.uid() = user_id);

create policy "ai_usage_limits_insert_own"
  on public.ai_usage_limits for insert
  with check (auth.uid() = user_id);

create policy "ai_usage_limits_update_own"
  on public.ai_usage_limits for update
  using (auth.uid() = user_id);
