-- ==========================================
-- CAMPUSSTAY UNIFIED DATABASE SETUP SCRIPT
-- Copy and paste this script in your Supabase SQL Editor.
-- ==========================================

-- Enable necessary PostgreSQL extensions
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. TABLES DEFINITIONS
-- ==========================================

-- 1.1 Users Table (inherits from auth.users via triggers)
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  role text not null check (role in ('student', 'owner', 'admin')),
  profile_pic text,
  verified boolean default false,
  verification_docs text[] default '{}',
  trust_score integer default 85 check (trust_score between 0 and 100),
  joined_date timestamp with time zone default timezone('utc'::text, now()) not null,
  preferences jsonb default '{"budgetMin": 2000, "budgetMax": 15000, "sleepHabit": "flexible", "dietary": "any", "cleanliness": "medium", "socialStatus": "medium"}'::jsonb,
  saved_rooms uuid[] default '{}'
);

-- 1.2 Rooms Table (Includes coordinates for exact location mapping)
create table if not exists public.rooms (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  city text not null,
  detailed_address text not null,
  rent integer not null check (rent > 0),
  amenities text[] default '{}',
  images text[] default '{}',
  available boolean default true,
  verified boolean default false,
  rating numeric(3,2) default 5.0 check (rating between 0.0 and 5.0),
  latitude numeric(9,6),
  longitude numeric(9,6)
);

-- 1.3 Bookings Table
create table if not exists public.bookings (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  status text not null check (status in ('Requested', 'Active', 'Completed', 'Cancelled')),
  move_in_date timestamp with time zone not null,
  rental_agreement_url text,
  rent integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.4 Payments Table
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  amount integer not null check (amount > 0),
  method text not null check (method in ('UPI', 'Card', 'NetBanking', 'Wallet')),
  status text not null check (status in ('Pending', 'Successful', 'Failed', 'Refunded')),
  razorpay_id text unique,
  receipt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.5 Chats Table
create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  participants uuid[] not null,
  last_message text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.6 Messages Table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  sender_name text not null,
  text text not null,
  image_url text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.7 Maintenance Tickets Table
create table if not exists public.maintenance (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  status text not null check (status in ('Open', 'Acknowledged', 'Escalated', 'Resolved')),
  issue text not null,
  room_address text not null,
  photos text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  resolution_notes text
);

-- 1.8 Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.9 Colleges Table
create table if not exists public.colleges (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

-- 1.10 Admin Complaints Table
create table if not exists public.complaints (
  id uuid default uuid_generate_v4() primary key,
  complainant_id uuid references public.users(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  type text not null,
  description text not null,
  status text not null check (status in ('Open', 'Resolved')),
  sla text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security (RLS) for all tables
alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.maintenance enable row level security;
alter table public.notifications enable row level security;
alter table public.colleges enable row level security;
alter table public.complaints enable row level security;

-- Helper validation: Check if authenticated user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2.1 Users Policies
drop policy if exists "Users profiles are viewable by authenticated users" on public.users;
drop policy if exists "Users profiles are viewable by everyone" on public.users;
create policy "Users profiles are viewable by everyone"
  on public.users for select
  using (true);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id or public.is_admin());

-- 2.2 Rooms Policies
drop policy if exists "Rooms are viewable by everyone authenticated" on public.rooms;
drop policy if exists "Rooms are viewable by everyone" on public.rooms;
create policy "Rooms are viewable by everyone"
  on public.rooms for select
  using (true);

drop policy if exists "Owners can create rooms" on public.rooms;
create policy "Owners can create rooms"
  on public.rooms for insert
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Owners can update/delete their own rooms" on public.rooms;
drop policy if exists "Owners can update their own rooms" on public.rooms;
create policy "Owners can update their own rooms"
  on public.rooms for update
  using (true)
  with check (true);

drop policy if exists "Owners can delete their own rooms" on public.rooms;
create policy "Owners can delete their own rooms"
  on public.rooms for delete
  using (auth.uid() = owner_id or public.is_admin());

-- 2.3 Bookings Policies
drop policy if exists "Bookings are viewable by student, owner, or admin" on public.bookings;
create policy "Bookings are viewable by student, owner, or admin"
  on public.bookings for select
  using (auth.uid() = student_id or auth.uid() = owner_id or public.is_admin());

drop policy if exists "Students can request bookings" on public.bookings;
create policy "Students can request bookings"
  on public.bookings for insert
  with check (auth.uid() = student_id);

drop policy if exists "Parties can modify booking status" on public.bookings;
create policy "Parties can modify booking status"
  on public.bookings for update
  using (auth.uid() = student_id or auth.uid() = owner_id or public.is_admin());

-- 2.4 Payments Policies
drop policy if exists "Payments are viewable by paying student, landlord, or admin" on public.payments;
create policy "Payments are viewable by paying student, landlord, or admin"
  on public.payments for select
  using (
    auth.uid() = student_id 
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.owner_id = auth.uid()
    ) 
    or public.is_admin()
  );

drop policy if exists "Students can register payments" on public.payments;
create policy "Students can register payments"
  on public.payments for insert
  with check (auth.uid() = student_id);

-- 2.5 Chats Policies
drop policy if exists "Chats viewable by participants or admin" on public.chats;
create policy "Chats viewable by participants or admin"
  on public.chats for select
  using (auth.uid() = any(participants) or public.is_admin());

drop policy if exists "Users can open chats" on public.chats;
create policy "Users can open chats"
  on public.chats for insert
  with check (auth.uid() = any(participants));

drop policy if exists "Users can update chats they participate in" on public.chats;
create policy "Users can update chats they participate in"
  on public.chats for update
  using (auth.uid() = any(participants) or public.is_admin());

-- 2.6 Messages Policies
drop policy if exists "Messages viewable by chat participants" on public.messages;
create policy "Messages viewable by chat participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      where id = chat_id and auth.uid() = any(participants)
    )
  );

drop policy if exists "Users can post chat messages" on public.messages;
create policy "Users can post chat messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.chats
      where id = chat_id and auth.uid() = any(participants)
    )
  );

-- 2.7 Maintenance Policies
drop policy if exists "Tickets viewable by student, owner, or admin" on public.maintenance;
create policy "Tickets viewable by student, owner, or admin"
  on public.maintenance for select
  using (auth.uid() = student_id or auth.uid() = owner_id or public.is_admin());

drop policy if exists "Students can file maintenance tickets" on public.maintenance;
create policy "Students can file maintenance tickets"
  on public.maintenance for insert
  with check (auth.uid() = student_id);

drop policy if exists "Tickets updateable by student, owner, or admin" on public.maintenance;
create policy "Tickets updateable by student, owner, or admin"
  on public.maintenance for update
  using (auth.uid() = student_id or auth.uid() = owner_id or public.is_admin());

-- 2.8 Notifications Policies
drop policy if exists "Notifications viewable and updateable by target user" on public.notifications;
create policy "Notifications viewable and updateable by target user"
  on public.notifications for all
  using (auth.uid() = user_id or public.is_admin());

-- 2.9 Colleges Policies
drop policy if exists "Colleges list readable by all authenticated users" on public.colleges;
create policy "Colleges list readable by all authenticated users"
  on public.colleges for select
  using (auth.role() = 'authenticated');

drop policy if exists "Only admins can manage colleges database" on public.colleges;
create policy "Only admins can manage colleges database"
  on public.colleges for all
  using (public.is_admin());

-- 2.10 Complaints Policies
drop policy if exists "Complaints viewable by complainant or admin" on public.complaints;
create policy "Complaints viewable by complainant or admin"
  on public.complaints for select
  using (auth.uid() = complainant_id or public.is_admin());

drop policy if exists "Users can log complaints" on public.complaints;
create policy "Users can log complaints"
  on public.complaints for insert
  with check (auth.uid() = complainant_id);

drop policy if exists "Admins can update complaints" on public.complaints;
create policy "Admins can update complaints"
  on public.complaints for update
  using (true)
  with check (true);


-- ==========================================
-- 3. TRIGGERS & FUNCTIONS
-- ==========================================

-- 3.1 Sync auth.users with public.users on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_role text;
  username text;
begin
  -- Determine role based on email context or metadata
  default_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  
  -- Force admin role only if email domain is admin.campusstay.com
  if new.email like '%@admin.campusstay.com' then
    default_role := 'admin';
  else
    -- If role is admin but email domain does not match, downgrade to student
    if default_role = 'admin' then
      default_role := 'student';
    end if;
  end if;

  username := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.users (id, name, email, phone, role, profile_pic, verified, trust_score)
  values (
    new.id,
    username,
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', new.phone, ''),
    default_role,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      'https://api.dicebear.com/7.x/adventurer/png?seed=' || new.id
    ),
    (default_role = 'admin'), -- admins auto-verified
    85
  );

  -- Create welcome notification
  insert into public.notifications (user_id, type, title, message)
  values (
    new.id,
    'system',
    'Welcome to CampusStay!',
    'Your profile has been created successfully as a ' || default_role || '.'
  );

  return new;
end;
$$ language plpgsql security definer;

-- Bind user signup trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3.2 Maintenance SLA escalation handler
create or replace function public.escalate_ticket_sla()
returns trigger as $$
begin
  -- Check if ticket status transitions to "Escalated"
  if old.status = 'Open' and new.status = 'Escalated' then
    -- Generate notification alert to owner
    insert into public.notifications (user_id, type, title, message)
    values (
      new.owner_id,
      'sla_breach',
      '⚠️ SLA ESCALATION ALARM',
      'Maintenance Ticket #' || new.id || ' was escalated due to non-response inside 24 hours.'
    );

    -- Reduce owner trust score by 5 points (min limit 50)
    update public.users
    set trust_score = greatest(50, trust_score - 5)
    where id = new.owner_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Bind ticket escalation trigger
drop trigger if exists on_maintenance_escalated on public.maintenance;
create trigger on_maintenance_escalated
  after update on public.maintenance
  for each row execute procedure public.escalate_ticket_sla();


-- 3.3 Prevent non-admin users from escalating their own role, verification, or trust score
create or replace function public.check_user_role_update()
returns trigger as $$
begin
  if not public.is_admin() then
    if old.role <> new.role then
      raise exception 'Unauthorized to modify role column';
    end if;
    if old.verified <> new.verified then
      raise exception 'Unauthorized to modify verified column';
    end if;
    if old.trust_score <> new.trust_score then
      raise exception 'Unauthorized to modify trust_score column';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_user_profile_update on public.users;
create trigger on_user_profile_update
  before update on public.users
  for each row execute procedure public.check_user_role_update();


-- 3.4 Automate booking status transitions on payment success
create or replace function public.handle_payment_success()
returns trigger as $$
begin
  if new.status = 'Successful' then
    update public.bookings
    set status = 'Active'
    where id = new.booking_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_success on public.payments;
create trigger on_payment_success
  after insert or update on public.payments
  for each row execute procedure public.handle_payment_success();


-- 3.5 Notify roommates when a maintenance ticket is resolved
create or replace function public.notify_students_maintenance_resolved()
returns trigger as $$
declare
  roommate_rec record;
begin
  if old.status <> 'Resolved' and new.status = 'Resolved' then
    for roommate_rec in 
      select student_id from public.bookings 
      where room_id = new.room_id and status = 'Active'
    loop
      insert into public.notifications (user_id, type, title, message)
      values (
        roommate_rec.student_id,
        'maintenance_resolved',
        '🛠️ Maintenance Issue Solved',
        'The maintenance ticket "' || new.issue || '" has been resolved. Report: ' || coalesce(new.resolution_notes, 'Issue cleared.')
      );
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_maintenance_resolved on public.maintenance;
create trigger on_maintenance_resolved
  after update on public.maintenance
  for each row execute procedure public.notify_students_maintenance_resolved();


-- ==========================================
-- 4. REALTIME CONFIGURATION
-- ==========================================

-- Enable Realtime replication for tables required for streaming
do $$
begin
  -- Remove existing tables from publication if they exist to prevent duplicate errors
  begin
    alter publication supabase_realtime drop table public.rooms;
  exception when others then null;
  end;
  
  begin
    alter publication supabase_realtime drop table public.bookings;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.chats;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.messages;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.maintenance;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.notifications;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.room_bills;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime drop table public.room_expenses;
  exception when others then null;
  end;
end $$;

-- Add tables to the supabase_realtime publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.maintenance;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.room_bills;
alter publication supabase_realtime add table public.room_expenses;
