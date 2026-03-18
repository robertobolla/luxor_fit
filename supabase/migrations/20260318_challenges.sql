-- ============================================================
-- CHALLENGES FEATURE - Migration
-- ============================================================

-- 1. Challenge definitions (admin-managed)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  icon TEXT DEFAULT '🚶',
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  duration_type TEXT NOT NULL,
  reward_days INTEGER DEFAULT 3,
  reward_xp INTEGER DEFAULT 300,
  badge_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User challenge participation & progress
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(user_id, status);

-- 3. Rewards log
CREATE TABLE IF NOT EXISTS challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_challenge_id UUID REFERENCES user_challenges(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('days', 'xp', 'badge')),
  value INTEGER NOT NULL,
  badge_key TEXT,
  applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_rewards_user_id ON challenge_rewards(user_id);

-- 4. User XP (for future leveling system)
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- challenges: readable by all authenticated users
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);

-- user_challenges: users can manage their own
CREATE POLICY "user_challenges_select" ON user_challenges FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "user_challenges_insert" ON user_challenges FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "user_challenges_update" ON user_challenges FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- challenge_rewards: users can read their own
CREATE POLICY "challenge_rewards_select" ON challenge_rewards FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "challenge_rewards_insert" ON challenge_rewards FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- user_xp: users can manage their own
CREATE POLICY "user_xp_select" ON user_xp FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "user_xp_insert" ON user_xp FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "user_xp_update" ON user_xp FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- ============================================================
-- SEED: First challenge - Monthly Steps
-- ============================================================
INSERT INTO challenges (type, title_key, description_key, icon, metric_type, target_value, duration_type, reward_days, reward_xp, badge_key)
VALUES (
  'monthly_steps',
  'challenges.monthlySteps',
  'challenges.monthlyStepsDesc',
  '🚶',
  'total_steps',
  310000,
  'monthly',
  3,
  300,
  'steps_master'
);
