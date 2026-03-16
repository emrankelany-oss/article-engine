-- ============================================================
-- Article Engine — Supabase Setup (Complete)
-- ============================================================
-- Run this SQL in your Supabase dashboard:
--   Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Subscriptions table (includes role column for admin access)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'user',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usage logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  article_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — Subscriptions
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 5. RLS Policies — Usage logs
CREATE POLICY "Users can insert own usage"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own usage"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Auto-create subscription when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, role)
  VALUES (NEW.id, 'free', 'pending', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Index for fast quota checks (count today's usage)
CREATE INDEX idx_usage_logs_user_date
  ON public.usage_logs (user_id, created_at DESC);

-- ============================================================
-- IMPORTANT: After running this SQL, set yourself as admin:
--
--   1. Go to Authentication → Users → find your user → copy your user ID
--   2. Go to SQL Editor and run:
--
--      UPDATE public.subscriptions
--      SET role = 'admin', status = 'active'
--      WHERE user_id = 'YOUR_USER_ID_HERE';
--
--   Replace YOUR_USER_ID_HERE with your actual user ID.
-- ============================================================
