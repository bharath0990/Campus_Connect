-- ==========================================
-- CAMPUSSTAY: Room Deletion Requests System
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create deletion_requests table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  room_title text NOT NULL,
  room_address text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamptz
);

-- 2. Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Owners can create deletion requests for their own rooms
DROP POLICY IF EXISTS "Owners can request room deletion" ON public.deletion_requests;
CREATE POLICY "Owners can request room deletion"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can view their own requests
DROP POLICY IF EXISTS "Owners can view their own deletion requests" ON public.deletion_requests;
CREATE POLICY "Owners can view their own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = owner_id OR public.is_admin());

-- Only admins can update (approve/reject) deletion requests
DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.deletion_requests;
CREATE POLICY "Admins can update deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Enable Realtime for deletion_requests
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.deletion_requests;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.deletion_requests;

-- 5. Admin notification trigger when a new deletion request is created
CREATE OR REPLACE FUNCTION public.notify_admin_on_deletion_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all admin users
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT id, 'deletion_request',
    '🗑️ Room Deletion Request',
    'Owner ' || (SELECT name FROM public.users WHERE id = NEW.owner_id) ||
    ' has requested deletion of room: ' || NEW.room_title || '. Reason: ' || NEW.reason
  FROM public.users
  WHERE role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_deletion_request_created ON public.deletion_requests;
CREATE TRIGGER on_deletion_request_created
  AFTER INSERT ON public.deletion_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_on_deletion_request();
