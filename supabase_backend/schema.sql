-- Enable necessary PostgreSQL extensions
create extension if not exists "uuid-ossp";

-- 1. Users Table (inherits from auth.users via triggers)
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

-- 2. Rooms Table (Includes coordinates for exact location mapping)
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

-- 3. Bookings Table
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

-- 4. Payments Table
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

-- 5. Chats Table
create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  participants uuid[] not null,
  last_message text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Messages Table (Real-time streams)
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

-- 7. Maintenance Tickets Table
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

-- 8. Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Colleges Table
create table if not exists public.colleges (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

-- 10. Admin Complaints Table
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

-- 11. Room Expenses Table (for personal roommate expense splitting)
create table if not exists public.room_expenses (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  description text not null,
  amount integer not null check (amount > 0),
  paid_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
