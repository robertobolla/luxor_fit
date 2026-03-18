// ============================================================================
// CHALLENGES SCREEN
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
  Challenge,
  UserChallenge,
  getAvailableChallenges,
  getUserChallenges,
  acceptChallenge,
  updateChallengeProgress,
  getUserXP,
  UserXP,
} from '../../src/services/challengeService';
import { useSubscription } from '../../src/hooks/useSubscription';

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { isActive, expirationDate } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [userXP, setUserXP] = useState<UserXP>({ user_id: '', total_xp: 0, level: 1 });
  const [accepting, setAccepting] = useState<string | null>(null);

  // Only paid subscribers (with RevenueCat expiration) get day rewards
  // Admin, partner, and gym users do NOT have expirationDate
  const isPaidSubscriber = isActive && !!expirationDate;

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Update progress first
      await updateChallengeProgress(user.id);

      const [availableChallenges, userChals, xp] = await Promise.all([
        getAvailableChallenges(),
        getUserChallenges(user.id),
        getUserXP(user.id),
      ]);

      setChallenges(availableChallenges);
      setUserChallenges(userChals);
      setUserXP(xp);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptChallenge = async (challenge: Challenge) => {
    if (!user?.id) return;
    setAccepting(challenge.id);

    try {
      const result = await acceptChallenge(user.id, challenge);
      if (result.success) {
        Alert.alert('✅', t('challenges.challengeAccepted'));
        await loadData();
      } else {
        Alert.alert(t('common.error'), result.error || t('common.unexpectedError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.unexpectedError'));
    } finally {
      setAccepting(null);
    }
  };

  const getProgressPercentage = (uc: UserChallenge) => {
    if (uc.target_value === 0) return 0;
    return Math.min((uc.current_value / uc.target_value) * 100, 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Separate active and completed challenges
  const activeChallenges = userChallenges.filter(uc => uc.status === 'active');
  const completedChallenges = userChallenges.filter(uc => uc.status === 'completed');
  const acceptedChallengeIds = userChallenges.map(uc => uc.challenge_id);
  const availableChallenges = challenges.filter(c => !acceptedChallengeIds.includes(c.id));

  // Get current month days for dynamic target display
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('challenges.title')}</Text>
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={16} color="#ffb300" />
          <Text style={styles.xpText}>{userXP.total_xp} XP</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ffb300']}
            tintColor="#ffb300"
            progressBackgroundColor="#2a2a2a"
          />
        }
      >
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 {t('challenges.active')}</Text>
            {activeChallenges.map(uc => {
              const challenge = uc.challenge;
              if (!challenge) return null;
              const progress = getProgressPercentage(uc);
              const daysLeft = getDaysRemaining(uc.end_date);

              return (
                <View key={uc.id} style={styles.challengeCardActive}>
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                    <View style={styles.challengeHeaderText}>
                      <Text style={styles.challengeTitle}>
                        {t(challenge.title_key, { defaultValue: challenge.title_key })}
                      </Text>
                      <Text style={styles.challengeDays}>
                        {t('challenges.daysRemaining', { days: daysLeft })}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                  </View>

                  <Text style={styles.progressDetail}>
                    {formatNumber(uc.current_value)} / {formatNumber(uc.target_value)}
                  </Text>

                  {/* Rewards preview */}
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardTag}>
                      <Ionicons name="star" size={14} color="#ffb300" />
                      <Text style={styles.rewardTagText}>+{challenge.reward_xp} XP</Text>
                    </View>
                    <View style={styles.rewardTag}>
                      <Text style={styles.rewardTagText}>🏅 Badge</Text>
                    </View>
                    {isPaidSubscriber && challenge.reward_days > 0 && (
                      <View style={[styles.rewardTag, styles.rewardTagDays]}>
                        <Ionicons name="calendar" size={14} color="#4CAF50" />
                        <Text style={[styles.rewardTagText, styles.rewardTagTextDays]}>
                          +{challenge.reward_days} {t('challenges.days')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Available Challenges */}
        {availableChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 {t('challenges.available')}</Text>
            {availableChallenges.map(challenge => {
              const dynamicTarget = challenge.metric_type === 'total_steps'
                ? daysInMonth * 10000
                : challenge.target_value;

              return (
                <View key={challenge.id} style={styles.challengeCardAvailable}>
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                    <View style={styles.challengeHeaderText}>
                      <Text style={styles.challengeTitle}>
                        {t(challenge.title_key, { defaultValue: challenge.title_key })}
                      </Text>
                      <Text style={styles.challengeDesc}>
                        {t(challenge.description_key, {
                          target: formatNumber(dynamicTarget),
                          defaultValue: challenge.description_key,
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Rewards preview */}
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardTag}>
                      <Ionicons name="star" size={14} color="#ffb300" />
                      <Text style={styles.rewardTagText}>+{challenge.reward_xp} XP</Text>
                    </View>
                    <View style={styles.rewardTag}>
                      <Text style={styles.rewardTagText}>🏅 Badge</Text>
                    </View>
                    {isPaidSubscriber && challenge.reward_days > 0 && (
                      <View style={[styles.rewardTag, styles.rewardTagDays]}>
                        <Ionicons name="calendar" size={14} color="#4CAF50" />
                        <Text style={[styles.rewardTagText, styles.rewardTagTextDays]}>
                          +{challenge.reward_days} {t('challenges.days')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptChallenge(challenge)}
                    disabled={accepting === challenge.id}
                  >
                    {accepting === challenge.id ? (
                      <ActivityIndicator size="small" color="#0a0a0a" />
                    ) : (
                      <Text style={styles.acceptButtonText}>{t('challenges.accept')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ {t('challenges.completed')}</Text>
            {completedChallenges.map(uc => {
              const challenge = uc.challenge;
              if (!challenge) return null;

              return (
                <View key={uc.id} style={styles.challengeCardCompleted}>
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                    <View style={styles.challengeHeaderText}>
                      <Text style={styles.challengeTitle}>
                        {t(challenge.title_key, { defaultValue: challenge.title_key })}
                      </Text>
                      <Text style={styles.completedDate}>
                        {uc.completed_at
                          ? new Date(uc.completed_at).toLocaleDateString()
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </View>
                  </View>

                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardTagEarned}>
                      <Ionicons name="star" size={14} color="#ffb300" />
                      <Text style={styles.rewardTagText}>+{challenge.reward_xp} XP</Text>
                    </View>
                    <View style={styles.rewardTagEarned}>
                      <Text style={styles.rewardTagText}>🏅</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {activeChallenges.length === 0 && availableChallenges.length === 0 && completedChallenges.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>{t('challenges.noChallenges')}</Text>
            <Text style={styles.emptyText}>{t('challenges.exploreChallenges')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 4,
  },
  xpText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },

  // Active challenge card
  challengeCardActive: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  challengeHeaderText: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  challengeDays: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '600',
  },
  challengeDesc: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffb300',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffb300',
    width: 45,
    textAlign: 'right',
  },
  progressDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },

  // Available challenge card
  challengeCardAvailable: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  acceptButton: {
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  acceptButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Completed challenge card
  challengeCardCompleted: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    opacity: 0.85,
  },
  completedDate: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  completedBadge: {
    marginLeft: 8,
  },

  // Reward tags
  rewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  rewardTagDays: {
    backgroundColor: '#1b3a1b',
  },
  rewardTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  rewardTagTextDays: {
    color: '#4CAF50',
  },
  rewardTagEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
