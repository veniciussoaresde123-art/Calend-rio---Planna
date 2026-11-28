alter table public.user_settings
  add column if not exists custom_categories jsonb not null default '[]'::jsonb,
  add column if not exists saved_filters jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add constraint user_settings_custom_categories_array
    check (jsonb_typeof(custom_categories) = 'array'),
  add constraint user_settings_saved_filters_array
    check (jsonb_typeof(saved_filters) = 'array');

