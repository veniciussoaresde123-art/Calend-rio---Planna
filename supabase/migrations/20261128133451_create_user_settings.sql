create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Bahia',
  notifications_enabled boolean not null default false,
  default_reminder_minutes integer not null default 30
    check (default_reminder_minutes in (0, 5, 10, 30, 60, 1440)),
  theme text not null default 'light'
    check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users can read their own settings"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own settings"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own settings"
  on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_settings to authenticated;

