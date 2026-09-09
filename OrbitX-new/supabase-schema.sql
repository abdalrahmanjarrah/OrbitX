-- ============================================
-- OrbitX Database Schema for Supabase
-- Run this in SQL Editor on supabase.com
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ──────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default '',
  email text default '',
  avatar_url text default '',
  bio text default '',
  mission_role text default 'Cosmonaut',
  xp integer default 0,
  level integer default 1,
  role text default 'user' check (role in ('user', 'admin', 'moderator')),
  focus_minutes integer default 0,
  total_focus_sessions integer default 0,
  streak_days integer default 0,
  last_active_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Rooms ─────────────────────────────────
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  host_id uuid references public.profiles(id) on delete cascade,
  timer_state jsonb default '{"mode": "focus", "duration": 1500, "running": false}'::jsonb,
  is_public boolean default true,
  max_members integer default 10,
  created_at timestamp with time zone default now()
);

alter table public.rooms enable row level security;

create policy "Rooms are viewable by authenticated users"
  on public.rooms for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  with check (auth.uid() = host_id);

create policy "Host can update room"
  on public.rooms for update
  using (auth.uid() = host_id);

create policy "Host can delete room"
  on public.rooms for delete
  using (auth.uid() = host_id);

-- ─── Room Members ──────────────────────────
create table public.room_members (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(room_id, user_id)
);

alter table public.room_members enable row level security;

create policy "Room members are viewable"
  on public.room_members for select
  using (auth.role() = 'authenticated');

create policy "Users can join rooms"
  on public.room_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave rooms"
  on public.room_members for delete
  using (auth.uid() = user_id);

-- ─── Fleets ────────────────────────────────
create table public.fleets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  leader_id uuid references public.profiles(id) on delete cascade,
  xp integer default 0,
  invite_code text default substr(md5(random()::text), 1, 8),
  created_at timestamp with time zone default now()
);

alter table public.fleets enable row level security;

create policy "Fleets are viewable by authenticated users"
  on public.fleets for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create fleets"
  on public.fleets for insert
  with check (auth.uid() = leader_id);

-- ─── Fleet Members ─────────────────────────
create table public.fleet_members (
  id uuid default uuid_generate_v4() primary key,
  fleet_id uuid references public.fleets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(fleet_id, user_id)
);

alter table public.fleet_members enable row level security;

create policy "Fleet members are viewable"
  on public.fleet_members for select
  using (auth.role() = 'authenticated');

create policy "Users can join fleets"
  on public.fleet_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave fleets"
  on public.fleet_members for delete
  using (auth.uid() = user_id);

-- ─── Challenges ────────────────────────────
create table public.challenges (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  target_xp integer default 200,
  status text default 'waiting' check (status in ('waiting', 'active', 'completed', 'cancelled')),
  winner_id uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.challenges enable row level security;

create policy "Challenges are viewable by authenticated users"
  on public.challenges for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create challenges"
  on public.challenges for insert
  with check (auth.uid() = creator_id);

-- ─── Challenge Participants ────────────────
create table public.challenge_participants (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  progress integer default 0,
  joined_at timestamp with time zone default now(),
  unique(challenge_id, user_id)
);

alter table public.challenge_participants enable row level security;

create policy "Participants are viewable"
  on public.challenge_participants for select
  using (auth.role() = 'authenticated');

create policy "Users can join challenges"
  on public.challenge_participants for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.challenge_participants for update
  using (auth.uid() = user_id);

-- ─── Discussions ───────────────────────────
create table public.discussions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  content text default '',
  category text default 'general',
  replies_count integer default 0,
  likes_count integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.discussions enable row level security;

create policy "Discussions are viewable by authenticated users"
  on public.discussions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create discussions"
  on public.discussions for insert
  with check (auth.uid() = user_id);

create policy "Authors can update discussions"
  on public.discussions for update
  using (auth.uid() = user_id);

create policy "Authors can delete discussions"
  on public.discussions for delete
  using (auth.uid() = user_id);

-- ─── Discussion Replies ────────────────────
create table public.discussion_replies (
  id uuid default uuid_generate_v4() primary key,
  discussion_id uuid references public.discussions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.discussion_replies enable row level security;

create policy "Replies are viewable by authenticated users"
  on public.discussion_replies for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can reply"
  on public.discussion_replies for insert
  with check (auth.uid() = user_id);

-- ─── Discussion Likes ──────────────────────
create table public.discussion_likes (
  id uuid default uuid_generate_v4() primary key,
  discussion_id uuid references public.discussions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(discussion_id, user_id)
);

alter table public.discussion_likes enable row level security;

create policy "Likes are viewable"
  on public.discussion_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can like"
  on public.discussion_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.discussion_likes for delete
  using (auth.uid() = user_id);

-- ─── Messages (Global Chat) ───────────────
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  room_id text default 'global',
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "Messages are viewable by authenticated users"
  on public.messages for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

-- Enable Realtime for messages
alter publication supabase_realtime add table public.messages;

-- ─── Schedule Items ────────────────────────
create table public.schedule_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  day text not null,
  time_start text default '',
  time_end text default '',
  category text default 'study',
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  completed boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.schedule_items enable row level security;

create policy "Users can view own schedule"
  on public.schedule_items for select
  using (auth.uid() = user_id);

create policy "Users can manage own schedule"
  on public.schedule_items for all
  using (auth.uid() = user_id);

-- ─── Support Tickets ───────────────────────
create table public.support_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users can create tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tickets"
  on public.support_tickets for update
  using (auth.uid() = user_id);

-- ─── Ticket Messages ───────────────────────
create table public.ticket_messages (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.ticket_messages enable row level security;

create policy "Users can view own ticket messages"
  on public.ticket_messages for select
  using (
    exists (
      select 1 from public.support_tickets
      where id = ticket_id and user_id = auth.uid()
    )
  );

create policy "Users can send ticket messages"
  on public.ticket_messages for insert
  with check (auth.uid() = user_id);

-- ─── Notifications ─────────────────────────
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text default '',
  type text default 'info',
  is_global boolean default false,
  is_read boolean default false,
  priority text default 'normal',
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id or is_global = true);

-- ─── Activity Logs ─────────────────────────
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  description text not null,
  xp_earned integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.activity_logs enable row level security;

create policy "Users can view own activity"
  on public.activity_logs for select
  using (auth.uid() = user_id);

-- ─── Black Holes (Community Goals) ────────
create table public.black_holes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text default '',
  target_xp integer default 10000,
  current_xp integer default 0,
  status text default 'active' check (status in ('active', 'completed', 'failed')),
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.black_holes enable row level security;

create policy "Black holes are viewable by everyone"
  on public.black_holes for select
  using (true);

-- ─── Indexes ───────────────────────────────
create index idx_profiles_xp on public.profiles(xp desc);
create index idx_profiles_level on public.profiles(level desc);
create index idx_messages_room on public.messages(room_id, created_at desc);
create index idx_discussions_created on public.discussions(created_at desc);
create index idx_schedule_user_day on public.schedule_items(user_id, day);
create index idx_activity_user on public.activity_logs(user_id, created_at desc);
