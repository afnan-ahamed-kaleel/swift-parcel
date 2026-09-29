-- Run this in your Supabase SQL Editor

CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    primary_phone TEXT,
    secondary_phone TEXT,
    sender_address TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered', 'Canceled')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Enable Row Level Security (RLS) if you want to secure your database later
-- ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
