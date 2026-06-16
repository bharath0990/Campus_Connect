-- ==========================================
-- CAMPUSSTAY: User Block & Replication Schema Updates
-- Run this script in your Supabase SQL Editor
-- ==========================================

-- 1. Add blocked column to public.users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked boolean DEFAULT false;

-- 2. Add public.users to the supabase_realtime publication for real-time stream sync
DO $$
BEGIN
  -- Attempt to remove it first to avoid duplicates
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
  EXCEPTION WHEN others THEN NULL;
  END;
  
  -- Add users table to publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
