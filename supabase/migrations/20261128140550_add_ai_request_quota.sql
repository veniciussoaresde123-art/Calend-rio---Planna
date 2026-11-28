create table public.ai_request_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_request_windows enable row level security;
revoke all on table public.ai_request_windows from anon, authenticated;

create or replace function public.consume_ai_request_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.ai_request_windows (user_id, window_started_at, request_count)
  values (v_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when public.ai_request_windows.window_started_at <= now() - interval '1 hour' then now()
      else public.ai_request_windows.window_started_at
    end,
    request_count = case
      when public.ai_request_windows.window_started_at <= now() - interval '1 hour' then 1
      when public.ai_request_windows.request_count < 20 then public.ai_request_windows.request_count + 1
      else public.ai_request_windows.request_count
    end
  returning request_count into v_request_count;

  return v_request_count <= 20;
end;
$function$;

revoke all on function public.consume_ai_request_quota() from public, anon;
grant execute on function public.consume_ai_request_quota() to authenticated;

