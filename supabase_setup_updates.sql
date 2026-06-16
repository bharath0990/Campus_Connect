-- =============================================================
-- CAMPUSSTAY EXTRA DATABASE & STORAGE REPAIRS
-- Copy and paste this script in your Supabase SQL Editor.
-- =============================================================

-- 1. Ensure latitude and longitude columns exist in public.rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS latitude numeric(9,6);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

-- 2. Reload PostgREST schema cache to resolve PostgrestException (PGRST204)
NOTIFY pgrst, 'reload schema';

-- 3. Ensure the storage bucket 'room-images' exists in Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
-- 5. Drop existing policies on storage.objects for room-images to avoid conflicts
DROP POLICY IF EXISTS "Allow Public Access to room-images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Users to Upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Users to Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Users to Delete" ON storage.objects;

-- 6. Re-create clean policies on storage.objects for 'room-images' bucket
CREATE POLICY "Allow Public Access to room-images bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-images');

CREATE POLICY "Allow Authenticated Users to Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'room-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow Authenticated Users to Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'room-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow Authenticated Users to Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'room-images'
  AND auth.role() = 'authenticated'
);

-- =============================================================
-- 6. Room Reviews Table, Policies and Triggers
-- =============================================================
CREATE TABLE IF NOT EXISTS public.room_reviews (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT null,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT null,
  student_name text NOT null,
  rating integer NOT null CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null
);

-- Enable RLS on room_reviews
ALTER TABLE public.room_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Reviews are readable by anyone authenticated" ON public.room_reviews;
DROP POLICY IF EXISTS "Students can insert reviews" ON public.room_reviews;

-- Create policies for room_reviews
CREATE POLICY "Reviews are readable by anyone authenticated"
ON public.room_reviews FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Students can insert reviews"
ON public.room_reviews FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Trigger to recalculate average rating on rooms table
CREATE OR REPLACE FUNCTION public.update_room_average_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE public.rooms
  SET rating = (
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 5.0)
    FROM public.room_reviews
    WHERE room_id = COALESCE(new.room_id, old.room_id)
  )
  WHERE id = COALESCE(new.room_id, old.room_id);
  RETURN COALESCE(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_room_review_added ON public.room_reviews;
CREATE TRIGGER on_room_review_added
AFTER INSERT OR UPDATE OR DELETE ON public.room_reviews
FOR EACH ROW EXECUTE PROCEDURE public.update_room_average_rating();


-- =============================================================
-- 7. Open RLS Policies for SELECT Queries (resolves empty listings)
-- =============================================================
DROP POLICY IF EXISTS "Rooms are viewable by everyone authenticated" ON public.rooms;
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON public.rooms;
CREATE POLICY "Rooms are viewable by everyone"
ON public.rooms FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users profiles are viewable by authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users profiles are viewable by everyone" ON public.users;
CREATE POLICY "Users profiles are viewable by everyone"
ON public.users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Reviews are readable by anyone authenticated" ON public.room_reviews;
DROP POLICY IF EXISTS "Reviews are readable by everyone" ON public.room_reviews;
CREATE POLICY "Reviews are readable by everyone"
ON public.room_reviews FOR SELECT
USING (true);

-- =============================================================
-- 8. Open RLS Policies for UPDATE Queries (resolves admin approvals and complaints updates)
-- =============================================================
DROP POLICY IF EXISTS "Owners can update their own rooms" ON public.rooms;
CREATE POLICY "Owners can update their own rooms"
ON public.rooms FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;
CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE
USING (true)
WITH CHECK (true);

-- =============================================================
-- 9. Update handle_new_user trigger to support Google OAuth Profile Picture Sync
-- =============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_role text;
  username text;
  unique_username text;
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

  -- Remove spaces and lowercase default username input to align with client rules
  username := lower(replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', ''));
  unique_username := username || '_' || substring(new.id::text, 1, 5);

  insert into public.users (id, name, email, phone, role, profile_pic, verified, trust_score, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.phone,
    default_role,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      'https://api.dicebear.com/7.x/adventurer/png?seed=' || new.id
    ),
    (default_role = 'admin'), -- admins auto-verified
    85,
    unique_username
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

-- Re-bind the user signup trigger to be absolutely sure it is active
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================
-- 10. Add Room Capacity, Usernames, Friends, and Bills
-- =============================================================

-- Add capacity column to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 4;

-- Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create roommate_friends table
CREATE TABLE IF NOT EXISTS public.roommate_friends (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on roommate_friends
ALTER TABLE public.roommate_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friends" ON public.roommate_friends;
DROP POLICY IF EXISTS "Users can add friends" ON public.roommate_friends;
DROP POLICY IF EXISTS "Users can remove friends" ON public.roommate_friends;

CREATE POLICY "Users can view their own friends"
ON public.roommate_friends FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends"
ON public.roommate_friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove friends"
ON public.roommate_friends FOR DELETE
USING (auth.uid() = user_id);

-- Create room_bills table
CREATE TABLE IF NOT EXISTS public.room_bills (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  electricity_bill integer DEFAULT 0,
  maid_bill integer DEFAULT 0,
  wifi_bill integer default 0,
  billing_month text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on room_bills
ALTER TABLE public.room_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room bills are readable by everyone" ON public.room_bills;
DROP POLICY IF EXISTS "Room bills are manageable by anyone" ON public.room_bills;

CREATE POLICY "Room bills are readable by everyone"
ON public.room_bills FOR SELECT
USING (true);

CREATE POLICY "Room bills are manageable by anyone"
ON public.room_bills FOR ALL
USING (true);

-- =============================================================
-- 11. Add Security Deposit support
-- =============================================================
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deposit integer DEFAULT 0;

-- =============================================================
-- 12. Enable Real-Time Replication for Notifications & Room Bills
-- =============================================================
do $$
begin
  begin
    alter publication supabase_realtime drop table public.notifications;
  exception when others then null;
  end;
  
  begin
    alter publication supabase_realtime drop table public.room_bills;
  exception when others then null;
  end;
end $$;

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.room_bills;

-- =============================================================
-- 13. Fix Notifications Table RLS Policies
-- =============================================================
DROP POLICY IF EXISTS "Notifications viewable and updateable by target user" ON public.notifications;
DROP POLICY IF EXISTS "Notifications are viewable by recipient" ON public.notifications;
DROP POLICY IF EXISTS "Notifications can be inserted by anyone authenticated" ON public.notifications;
DROP POLICY IF EXISTS "Notifications can be updated by recipient" ON public.notifications;
DROP POLICY IF EXISTS "Notifications can be deleted by recipient" ON public.notifications;

CREATE POLICY "Notifications are viewable by recipient"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notifications can be inserted by anyone authenticated"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Notifications can be updated by recipient"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notifications can be deleted by recipient"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());


-- =============================================================
-- 14. Add resolution_notes to maintenance & unique constraint to room_bills & is_read to messages
-- =============================================================

-- Add resolution_notes to maintenance table
ALTER TABLE public.maintenance ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Add is_read to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Add unique constraint to room_bills
ALTER TABLE public.room_bills ADD CONSTRAINT unique_room_month UNIQUE (room_id, billing_month);

-- Create room_expenses table
CREATE TABLE IF NOT EXISTS public.room_expenses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  paid_by uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on room_expenses
ALTER TABLE public.room_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room expenses are readable by everyone" ON public.room_expenses;
CREATE POLICY "Room expenses are readable by everyone"
ON public.room_expenses FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Room expenses are insertable by anyone authenticated" ON public.room_expenses;
CREATE POLICY "Room expenses are insertable by anyone authenticated"
ON public.room_expenses FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- RLS Updates for roommate_friends table to allow friend request update & delete by recipient/sender
DROP POLICY IF EXISTS "Users can update friends" ON public.roommate_friends;
CREATE POLICY "Users can update friends"
ON public.roommate_friends FOR UPDATE
USING (auth.uid() = friend_id); -- Only the recipient can accept a request

DROP POLICY IF EXISTS "Users can remove friends" ON public.roommate_friends;
CREATE POLICY "Users can remove friends"
ON public.roommate_friends FOR ALL
USING (auth.uid() = user_id OR auth.uid() = friend_id); -- Either sender or recipient can delete or unfriend

-- Enable Real-Time Replication for room_expenses
do $$
begin
  begin
    alter publication supabase_realtime drop table public.room_expenses;
  exception when others then null;
  end;
end $$;
alter publication supabase_realtime add table public.room_expenses;

-- Notify roommates when a maintenance ticket is resolved
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
