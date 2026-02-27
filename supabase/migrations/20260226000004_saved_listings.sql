create table saved_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  listing_id uuid references listings not null,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);
alter table saved_listings enable row level security;
create policy "Users manage their own saves" on saved_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
