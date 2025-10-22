-- Telegram bots tables for multi-tenant service
CREATE TABLE IF NOT EXISTS public.telegram_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  creator_wallet TEXT,
  bot_id TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  bot_name TEXT,
  encrypted_token TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  group_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.telegram_bot_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_slug TEXT NOT NULL REFERENCES public.telegram_bots(slug) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  chat_id TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telegram_bots_slug ON public.telegram_bots(slug);
CREATE INDEX IF NOT EXISTS idx_telegram_bot_users_bot_slug ON public.telegram_bot_users(bot_slug);
CREATE INDEX IF NOT EXISTS idx_telegram_bot_users_user_id ON public.telegram_bot_users(user_id);

-- Simple RLS (readable; write protected)
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read bots" ON public.telegram_bots;
CREATE POLICY "Public read bots" ON public.telegram_bots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read bot users" ON public.telegram_bot_users;
CREATE POLICY "Public read bot users" ON public.telegram_bot_users FOR SELECT USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_telegram_bots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_telegram_bots_updated_at ON public.telegram_bots;
CREATE TRIGGER update_telegram_bots_updated_at
  BEFORE UPDATE ON public.telegram_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_bots_updated_at();
