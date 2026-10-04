-- ==========================================
-- SWIFTPARCEL - DATABASE ARCHITECTURE & SCHEMA
-- ==========================================
-- This file contains the complete, eternal database architecture for SwiftParcel.
-- If developers need to understand how the database is structured, or if you need 
-- to rebuild it from scratch, everything is here.

-- ==========================================
-- 1. CACHE CLEAR & SYSTEM STABILITY
-- ==========================================
-- Run this if you ever see "Could not find column in schema cache" (PGRST204)
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- 2. COMPLETE 'packages' TABLE DEFINITION
-- ==========================================
-- If the user_id column is missing, you can add it by running:
-- ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to link each package to a specific authenticated user
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    client_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    primary_phone TEXT,
    secondary_phone TEXT,
    sender_address TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered', 'Canceled')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- These policies ensure that users can only see and edit THEIR OWN parcels, 
-- creating absolute data isolation and security.

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own packages
CREATE POLICY "Users can insert their own packages"
ON public.packages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own packages
CREATE POLICY "Users can view their own packages"
ON public.packages FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own packages
CREATE POLICY "Users can update their own packages"
ON public.packages FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own packages
CREATE POLICY "Users can delete their own packages"
ON public.packages FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- 4. DEVELOPER DIAGNOSTIC QUERIES
-- ==========================================
-- Run these queries in the Supabase SQL Editor to check the database state.

-- A) View all columns currently existing in the 'packages' table:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'packages';

-- B) View all active RLS policies on the 'packages' table:
SELECT * 
FROM pg_policies 
WHERE tablename = 'packages';
