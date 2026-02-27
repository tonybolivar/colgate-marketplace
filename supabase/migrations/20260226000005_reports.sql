create table listing_reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users not null,
  listing_id uuid references listings not null,
  reason text not null,
  details text,
  created_at timestamptz default now(),
  unique(reporter_id, listing_id)
);
alter table listing_reports enable row level security;
create policy "Users can submit listing reports" on listing_reports
  for insert with check (auth.uid() = reporter_id);
create policy "Users can view own listing reports" on listing_reports
  for select using (auth.uid() = reporter_id);
create policy "Admins can manage listing reports" on listing_reports
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create table conversation_reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users not null,
  conversation_id uuid references conversations not null,
  reason text not null,
  details text,
  created_at timestamptz default now(),
  unique(reporter_id, conversation_id)
);
alter table conversation_reports enable row level security;
create policy "Participants can report conversations" on conversation_reports
  for insert with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from conversations
      where id = conversation_id
        and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );
create policy "Users can view own conversation reports" on conversation_reports
  for select using (auth.uid() = reporter_id);
create policy "Admins can manage conversation reports" on conversation_reports
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Allow admins to read all messages (for reported conversation review)
create policy "Admins can read all messages" on messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
