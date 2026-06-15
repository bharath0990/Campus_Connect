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


-- 1. Users Policies
drop policy if exists "Users profiles are viewable by authenticated users" on public.users;
create policy "Users profiles are viewable by authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id or public.is_admin());


-- 2. Rooms Policies
drop policy if exists "Rooms are viewable by everyone authenticated" on public.rooms;
create policy "Rooms are viewable by everyone authenticated"
  on public.rooms for select
  using (auth.role() = 'authenticated');

drop policy if exists "Owners can create rooms" on public.rooms;
create policy "Owners can create rooms"
  on public.rooms for insert
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Owners can update/delete their own rooms" on public.rooms;
drop policy if exists "Owners can update their own rooms" on public.rooms;
create policy "Owners can update their own rooms"
  on public.rooms for update
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Owners can delete their own rooms" on public.rooms;
create policy "Owners can delete their own rooms"
  on public.rooms for delete
  using (auth.uid() = owner_id or public.is_admin());


-- 3. Bookings Policies
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


-- 4. Payments Policies
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


-- 5. Chats Policies
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


-- 6. Messages Policies
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


-- 7. Maintenance Policies
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


-- 8. Notifications Policies
drop policy if exists "Notifications viewable and updateable by target user" on public.notifications;
create policy "Notifications viewable and updateable by target user"
  on public.notifications for all
  using (auth.uid() = user_id or public.is_admin());


-- 9. Colleges Policies
drop policy if exists "Colleges list readable by all authenticated users" on public.colleges;
create policy "Colleges list readable by all authenticated users"
  on public.colleges for select
  using (auth.role() = 'authenticated');

drop policy if exists "Only admins can manage colleges database" on public.colleges;
create policy "Only admins can manage colleges database"
  on public.colleges for all
  using (public.is_admin());


-- 10. Complaints Policies
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
  using (public.is_admin());
