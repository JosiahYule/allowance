-- User settings for onboarding state and monthly income
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  setup_complete boolean default false,
  monthly_income numeric(12, 2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "own_settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
