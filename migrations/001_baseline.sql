-- Migration 001: Baseline Schema
-- Date: 2026-03-26
-- Description: Documents the initial schema as-deployed in Supabase
-- Status: Applied (existing tables, no action needed)

-- NOTE: This migration is declarative — it documents what already exists.
-- Supabase Auth manages the auth.users table automatically.

-- Subscriptions table (access control + roles)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'active', 'revoked'
  role TEXT NOT NULL DEFAULT 'user',       -- 'user', 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Usage logs table (article generation + edit tracking + admin audit trail)
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,          -- 'generate', 'edit', 'admin:approve', 'admin:revoke', etc.
  article_file TEXT,             -- file path or target user ID for admin actions
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (applied via Supabase dashboard)
-- subscriptions: users can read own row, admins can read/write all
-- usage_logs: users can insert own rows, admins can read all

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);
