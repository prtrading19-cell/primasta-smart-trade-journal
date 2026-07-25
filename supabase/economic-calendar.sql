-- Economic Calendar Module
-- Supports calendar preferences, favorite events, read status, and last sync tracking.
-- This table stores per-user calendar settings and state.

CREATE TABLE IF NOT EXISTS economic_calendar_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_currency TEXT DEFAULT 'USD',
  default_view TEXT DEFAULT 'today',
  favorite_event_ids JSONB DEFAULT '[]'::jsonb,
  read_event_ids JSONB DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_source TEXT DEFAULT 'unavailable',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Calendar event cache (optional: stores fetched events for offline use)
CREATE TABLE IF NOT EXISTS economic_calendar_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_prefs_user ON economic_calendar_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_cache_user ON economic_calendar_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_cache_event ON economic_calendar_cache(event_id);

-- Row Level Security
ALTER TABLE economic_calendar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_calendar_cache ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own calendar data
CREATE POLICY "Users read own calendar preferences"
  ON economic_calendar_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own calendar preferences"
  ON economic_calendar_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own calendar preferences"
  ON economic_calendar_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own calendar cache"
  ON economic_calendar_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own calendar cache"
  ON economic_calendar_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own calendar cache"
  ON economic_calendar_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_preferences_updated
  BEFORE UPDATE ON economic_calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_preferences_timestamp();
