-- Location + Telegram link fields for profiles
alter table public.profiles
  add column if not exists locale text,
  add column if not exists city text,
  add column if not exists country_code text,
  add column if not exists timezone_source text,
  add column if not exists telegram_link_token text,
  add column if not exists telegram_link_expires_at timestamptz;

comment on column public.profiles.timezone_source is
  'How timezone was set: manual, browser, geolocation, ip, signup';

create unique index if not exists profiles_telegram_link_token_idx
  on public.profiles (telegram_link_token)
  where telegram_link_token is not null;
