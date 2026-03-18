import { supabase } from './supabase';

// ============================================================
// Types
// ============================================================

export interface Challenge {
  id: string;
  type: string;
  title_key: string;
  description_key: string;
  icon: string;
  metric_type: string;
  target_value: number;
  duration_type: string;
  reward_days: number;
  reward_xp: number;
  badge_key: string | null;
  is_active: boolean;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'active' | 'completed' | 'failed';
  start_date: string;
  end_date: string;
  current_value: number;
  target_value: number;
  completed_at: string | null;
  created_at: string;
  challenge?: Challenge;
}

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
}

// ============================================================
// Challenge Queries
// ============================================================

/**
 * Get all active challenge definitions
 */
export async function getAvailableChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error loading challenges:', error);
    return [];
  }
  return data || [];
}

/**
 * Get user's challenges (active + completed)
 */
export async function getUserChallenges(
  userId: string,
  statusFilter?: 'active' | 'completed' | 'failed'
): Promise<UserChallenge[]> {
  let query = supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error loading user challenges:', error);
    return [];
  }
  return data || [];
}

/**
 * Accept a challenge — calculates start/end dates based on duration_type
 */
export async function acceptChallenge(
  userId: string,
  challenge: Challenge
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  let startDate: string;
  let endDate: string;
  let targetValue = challenge.target_value;

  if (challenge.duration_type === 'monthly') {
    // Start from day 1 of current month, end on last day
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Adjust target: days_in_month * 10000 for steps challenges
    if (challenge.metric_type === 'total_steps') {
      targetValue = daysInMonth * 10000;
    }
  } else if (challenge.duration_type === 'weekly') {
    // Current week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    startDate = monday.toISOString().split('T')[0];
    endDate = sunday.toISOString().split('T')[0];
  } else {
    // Custom: 30 days from now
    const end = new Date(now);
    end.setDate(now.getDate() + 30);
    startDate = now.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  }

  // Check if user already has this challenge active for the same period
  const { data: existing } = await supabase
    .from('user_challenges')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Challenge already active' };
  }

  const { error } = await supabase
    .from('user_challenges')
    .insert({
      user_id: userId,
      challenge_id: challenge.id,
      status: 'active',
      start_date: startDate,
      end_date: endDate,
      current_value: 0,
      target_value: targetValue,
    });

  if (error) {
    console.error('❌ Error accepting challenge:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update progress for all active challenges of a user
 * Queries health_data_daily to calculate current steps
 */
export async function updateChallengeProgress(
  userId: string
): Promise<void> {
  // Get active challenges
  const activeChallenges = await getUserChallenges(userId, 'active');

  for (const uc of activeChallenges) {
    const challenge = uc.challenge;
    if (!challenge) continue;

    let currentValue = 0;

    if (challenge.metric_type === 'total_steps') {
      // Sum steps from health_data_daily
      const { data, error } = await supabase
        .from('health_data_daily')
        .select('steps')
        .eq('user_id', userId)
        .gte('date', uc.start_date)
        .lte('date', uc.end_date);

      if (!error && data) {
        currentValue = data.reduce((sum: number, row: any) => sum + (row.steps || 0), 0);
      }
    }

    // Update current_value
    const updateData: any = { current_value: currentValue };

    // Check if challenge is completed
    if (currentValue >= uc.target_value && uc.status === 'active') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('user_challenges')
      .update(updateData)
      .eq('id', uc.id);

    // If just completed, grant rewards
    if (updateData.status === 'completed') {
      await grantRewards(userId, uc.id, challenge);
    }
  }

  // Check for expired challenges
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('user_challenges')
    .update({ status: 'failed' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .lt('end_date', today);
}

/**
 * Grant rewards after completing a challenge
 */
async function grantRewards(
  userId: string,
  userChallengeId: string,
  challenge: Challenge
): Promise<void> {
  const rewards = [];

  // XP reward (for ALL users)
  if (challenge.reward_xp > 0) {
    rewards.push({
      user_id: userId,
      user_challenge_id: userChallengeId,
      reward_type: 'xp',
      value: challenge.reward_xp,
      badge_key: null,
    });

    // Update user_xp
    await addXP(userId, challenge.reward_xp);
  }

  // Badge reward (for ALL users)
  if (challenge.badge_key) {
    rewards.push({
      user_id: userId,
      user_challenge_id: userChallengeId,
      reward_type: 'badge',
      value: 1,
      badge_key: challenge.badge_key,
    });
  }

  // Days reward will be granted client-side based on user type
  // (only for paid subscribers — the UI handles this)
  if (challenge.reward_days > 0) {
    rewards.push({
      user_id: userId,
      user_challenge_id: userChallengeId,
      reward_type: 'days',
      value: challenge.reward_days,
      badge_key: null,
    });
  }

  if (rewards.length > 0) {
    const { error } = await supabase
      .from('challenge_rewards')
      .insert(rewards);

    if (error) {
      console.error('❌ Error granting rewards:', error);
    }
  }
}

// ============================================================
// XP System
// ============================================================

/**
 * Get user's current XP and level
 */
export async function getUserXP(userId: string): Promise<UserXP> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { user_id: userId, total_xp: 0, level: 1 };
  }
  return data;
}

/**
 * Add XP to user's total
 */
export async function addXP(userId: string, amount: number): Promise<void> {
  // Try to get existing record
  const { data: existing } = await supabase
    .from('user_xp')
    .select('total_xp')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_xp')
      .update({
        total_xp: existing.total_xp + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_xp')
      .insert({
        user_id: userId,
        total_xp: amount,
        level: 1,
      });
  }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('challenge_rewards')
    .select('badge_key')
    .eq('user_id', userId)
    .eq('reward_type', 'badge')
    .not('badge_key', 'is', null);

  if (error || !data) return [];
  return data.map((r: any) => r.badge_key).filter(Boolean);
}

/**
 * Get total bonus subscription days earned
 */
export async function getBonusSubscriptionDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('challenge_rewards')
    .select('value')
    .eq('user_id', userId)
    .eq('reward_type', 'days');

  if (error || !data) return 0;
  return data.reduce((sum: number, r: any) => sum + (r.value || 0), 0);
}
