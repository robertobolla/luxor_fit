import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
  getPendingTrainerInvitations,
  respondToTrainerInvitation,
} from '../src/services/trainerService';

interface TrainerInvitation {
  id: string;
  trainer_id: string;
  student_id: string;
  status: string;
  created_at: string;
  trainer_name?: string;
  trainer_username?: string;
  trainer_photo?: string;
}

export default function TrainerInvitationsScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [invitations, setInvitations] = useState<TrainerInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [user])
  );

  const loadInvitations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await getPendingTrainerInvitations(user.id);
      if (result.success && result.data) {
        setInvitations(result.data);
      } else {
        console.error('Error loading invitations:', result.error);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
    setRefreshing(false);
  };

  const handleRespond = async (invitationId: string, accept: boolean, trainerName: string) => {
    if (!user) return;

    setRespondingTo(invitationId);
    try {
      const result = await respondToTrainerInvitation(user.id, invitationId, accept);
      
      if (result.success) {
        Alert.alert(
          accept ? '✅ Invitación Aceptada' : '❌ Invitación Rechazada',
          accept
            ? `Ahora ${trainerName} puede ver tus estadísticas y entrenamientos. También son amigos para chatear.`
            : `Has rechazado la invitación de ${trainerName}.`,
          [{ text: 'OK' }]
        );
        await loadInvitations();
      } else {
        Alert.alert(t('common.error'), result.error || t('workout.errorProcessingInvitation'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('workout.unexpectedErrorProcessingInvitation'));
    } finally {
      setRespondingTo(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>
  {t('invitations.loading')}
</Text>        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>
  {t('invitations.title')}
</Text>        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {invitations.length > 0 ? (
          <View style={styles.section}>
            {invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarPlaceholder}>
                      {(invitation.trainer_name || invitation.trainer_username || 'T')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.trainerName}>
                      {invitation.trainer_name || 'Sin nombre'}
                    </Text>
                    <Text style={styles.trainerUsername}>
                      @{invitation.trainer_username || 'sin_usuario'}
                    </Text>
                    <Text style={styles.invitationDate}>
                      Recibida: {new Date(invitation.created_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.invitationText}>
  {t('invitations.description')}
</Text>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.acceptButton,
                      respondingTo === invitation.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleRespond(
                        invitation.id,
                        true,
                        invitation.trainer_name || invitation.trainer_username || 'El entrenador'
                      )
                    }
                    disabled={respondingTo === invitation.id}
                  >
                    {respondingTo === invitation.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        <Text style={styles.acceptButtonText}>{t('common.accept')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      respondingTo === invitation.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleRespond(
                        invitation.id,
                        false,
                        invitation.trainer_name || invitation.trainer_username || 'El entrenador'
                      )
                    }
                    disabled={respondingTo === invitation.id}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                    <Text style={styles.rejectButtonText}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>
  {t('invitations.emptyTitle')}
</Text>         
<Text style={styles.emptyDescription}>
  {t('invitations.emptyDescription')}
</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  invitationCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffb300',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invitationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trainerUsername: {
    fontSize: 14,
    color: '#ffb300',
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: '#999',
  },
  invitationText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

