create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  category text not null default 'pessoal',
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_completed boolean not null default false,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_user_starts_at_idx
  on public.events (user_id, starts_at);

create index if not exists events_user_completed_starts_idx
  on public.events (user_id, is_completed, starts_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "Users can read their own events"
  on public.events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own events"
  on public.events for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own events"
  on public.events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own events"
  on public.events for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.events to authenticated;

