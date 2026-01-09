import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
  getTrainerStudents,
  sendTrainerInvitation,
  removeTrainerStudentRelationship,
  TrainerStudentRelationship,
} from '../src/services/trainerService';
import { supabase } from '../src/services/supabase';
import { getFriends } from '../src/services/friendsService';
import { useAlert } from '../src/contexts/AlertContext';

export default function TrainerModeScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { showAlert } = useAlert();
  const [students, setStudents] = useState<TrainerStudentRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFriendsView, setShowFriendsView] = useState(false); // Cambio: view en lugar de modal
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [user])
  );

  const loadStudents = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await getTrainerStudents(user.id);
      if (result.success && result.data) {
        setStudents(result.data);
      } else {
        console.error('Error loading students:', result.error);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar usuarios mientras se escribe
  useEffect(() => {
    // No buscar si el modal no está abierto
    if (!showAddStudentModal) {
      return;
    }

    if (searchUsername.length < 2) {
      setUsernameSuggestions([]);
      setIsSearching(false);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, username, name, profile_photo_url')
          .ilike('username', `${searchUsername}%`)
          .limit(5);

        if (!error && data) {
          // Filtrar usuarios que ya son alumnos
          const filteredData = data.filter(
            (u: any) => !students.some((s) => s.student_id === u.user_id)
          );
          setUsernameSuggestions(filteredData);
        } else {
          setUsernameSuggestions([]);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setUsernameSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 400);
    return () => clearTimeout(timeoutId);
  }, [searchUsername, showAddStudentModal]);

  // Cargar lista de amigos
  const loadFriends = async () => {
    if (!user) {
      console.log('No hay usuario, no se pueden cargar amigos');
      return;
    }

    console.log('Cargando lista de amigos...');
    setIsLoadingFriends(true);
    try {
      const result = await getFriends(user.id);
      console.log('Resultado de getFriends:', result);
      
      if (result.success && result.data) {
        console.log('Amigos obtenidos:', result.data.length);
        // Filtrar amigos que ya son alumnos
        const filteredFriends = result.data.filter(
          (f) => {
            const friendId = f.friend_id || f.user_id;
            return !students.some((s) => s.student_id === friendId);
          }
        );
        console.log('Amigos filtrados:', filteredFriends.length);
        setFriends(filteredFriends);
      } else {
        console.log('Error o sin datos:', result.error);
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  const handleSendInvitation = async () => {
    console.log('🔵 handleSendInvitation - INICIO');
    console.log('🔵 User:', user?.id);
    console.log('🔵 Username:', searchUsername);
    
    if (!user || !searchUsername.trim()) {
      console.log('⚠️ Validación fallida - falta user o username');
      setCustomAlertMessage(t('trainer.enterUsername'));
      setShowCustomAlert(true);
      return;
    }

    console.log('🟢 Enviando invitación...');
    setIsSendingInvitation(true);
    try {
      const result = await sendTrainerInvitation(user.id, searchUsername.trim());
      console.log('📊 Resultado de sendTrainerInvitation:', result);
      
      if (result.success) {
        console.log('✅ Invitación enviada exitosamente');
        setCustomAlertMessage(t('trainer.invitationSentMessage'));
        setShowCustomAlert(true);
        setShowAddStudentModal(false);
        setSearchUsername('');
        setUsernameSuggestions([]);
        await loadStudents();
      } else {
        console.log('❌ Error al enviar invitación:', result.error);
        // Personalizar el mensaje de error si ya existe la invitación
        if (result.error?.includes('Ya existe una invitación')) {
          setCustomAlertMessage(t('trainer.invitationAlreadySent'));
        } else {
          setCustomAlertMessage(result.error || t('trainer.couldNotSendInvitation'));
        }
        setShowCustomAlert(true);
        console.log('🔔 Mostrando modal de alerta, estado:', showCustomAlert);
      }
    } catch (error) {
      console.error('💥 Excepción en handleSendInvitation:', error);
      setCustomAlertMessage(t('trainer.errorSendingInvitation'));
      setShowCustomAlert(true);
    } finally {
      setIsSendingInvitation(false);
      console.log('🔵 handleSendInvitation - FIN');
    }
  };

  const handleSelectSuggestion = (username: string) => {
    setSearchUsername(username);
    setUsernameSuggestions([]);
    Keyboard.dismiss();
  };

  const handleOpenFriendsView = () => {
    console.log('🟢 handleOpenFriendsView - INICIO');
    setShowFriendsView(true);
    console.log('🟢 Cambiando a vista de amigos');
    loadFriends();
  };

  const handleBackToSearch = () => {
    setShowFriendsView(false);
    setSearchUsername('');
    setUsernameSuggestions([]);
  };

  const handleSelectFriend = (friend: any) => {
    // Obtener el username correcto dependiendo de la estructura
    const username = friend.friend_profile?.username || friend.user_profile?.username || '';
    setSearchUsername(username);
    setShowFriendsView(false);
    setUsernameSuggestions([]);
  };

  const handleRemoveStudent = async (studentId: string, studentName: string, relationshipId: string) => {
    showAlert(
      t('trainer.removeStudent'),
      `¿Estás seguro de que quieres dejar de entrenar a ${studentName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await removeTrainerStudentRelationship(relationshipId);
            if (result.success) {
              setCustomAlertMessage(t('trainer.studentRemovedSuccess'));
              setShowCustomAlert(true);
              await loadStudents();
            } else {
              setCustomAlertMessage(result.error || 'No se pudo eliminar al alumno');
              setShowCustomAlert(true);
            }
          },
        },
      ],
      { icon: 'trash', iconColor: '#ff4444' }
    );
  };

  const handleViewStudentStats = (student: TrainerStudentRelationship) => {
    router.push({
      pathname: '/trainer-student-detail',
      params: {
        studentId: student.student_id,
        studentName: student.student_name || student.student_username || 'Alumno',
        studentPhoto: student.student_photo || '',
      },
    } as any);
  };

  const handleChatWithStudent = (student: TrainerStudentRelationship) => {
    // Navegar al chat con el alumno
    router.push({
      pathname: '/chat',
      params: {
        otherUserId: student.student_id,
        otherUserName: student.student_name || student.student_username || 'Alumno',
      },
    } as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>{t('trainer.loadingStudents')}</Text>
        </View>
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
        <Text style={styles.title}>{t('trainer.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onTouchStart={() => activeMenuStudentId && setActiveMenuStudentId(null)}
      >
        {/* Botón para agregar nuevo alumno */}
        <TouchableOpacity
          style={styles.addStudentButton}
          onPress={() => {
            setSearchUsername('');
            setUsernameSuggestions([]);
            setShowAddStudentModal(true);
          }}
        >
          <Ionicons name="person-add" size={24} color="#1a1a1a" />
          <Text style={styles.addStudentButtonText}>{t('trainer.addStudent')}</Text>
        </TouchableOpacity>

        {/* Descripción */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#ffb300" />
          <Text style={styles.infoText}>
            {t('trainer.trainerDescription')}
          </Text>
        </View>

        {/* Lista de alumnos */}
        {students.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              👥 {t('trainer.myStudents')} ({students.length})
            </Text>

            {students.map((student) => (
              <View key={student.id} style={styles.studentCard}>
                {/* Menú de 3 puntos */}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setActiveMenuStudentId(activeMenuStudentId === student.id ? null : student.id)}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#999" />
                </TouchableOpacity>

                {/* Dropdown del menú */}
                {activeMenuStudentId === student.id && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setActiveMenuStudentId(null);
                        handleRemoveStudent(
                          student.student_id,
                          student.student_name || student.student_username || t('trainer.thisStudent'),
                          student.id
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff4444" />
                      <Text style={styles.dropdownItemText}>{t('trainer.removeStudent')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Contenido principal de la tarjeta */}
                <TouchableOpacity 
                  style={styles.studentCardContent}
                  onPress={() => handleViewStudentStats(student)}
                  activeOpacity={0.7}
                >
                  {/* Avatar con indicador de estado */}
                  <View style={styles.avatarWrapper}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarPlaceholder}>
                        {(student.student_name || student.student_username || 'A')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.onlineIndicator} />
                  </View>

                  {/* Información del estudiante */}
                  <View style={styles.studentTextInfo}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.student_name || t('trainer.noName')}
                    </Text>
                    <Text style={styles.studentUsername}>
                      @{student.student_username || t('trainer.noUsername')}
                    </Text>
                    <View style={styles.studentMeta}>
                      <Ionicons name="calendar-outline" size={12} color="#666" />
                      <Text style={styles.studentDate}>
                        {new Date(student.accepted_at || student.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  {/* Flecha indicadora */}
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                {/* Acciones rápidas */}
                <View style={styles.studentActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.statsButton]}
                    onPress={() => handleViewStudentStats(student)}
                  >
                    <Ionicons name="stats-chart" size={16} color="#1a1a1a" />
                    <Text style={styles.actionButtonText}>Estadísticas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={() => handleChatWithStudent(student)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#ffb300" />
                    <Text style={[styles.actionButtonText, styles.chatButtonText]}>
                      Chat
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No tienes alumnos aún</Text>
            <Text style={styles.emptyDescription}>
              Agrega tu primer alumno para comenzar a entrenarlos y ver sus estadísticas
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para agregar alumno */}
      <Modal
        visible={showAddStudentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddStudentModal(false);
          setSearchUsername('');
          setUsernameSuggestions([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Mostrar lista de amigos o búsqueda normal */}
            {showFriendsView ? (
              /* Vista de Lista de Amigos */
              <>
                <View style={styles.friendsViewHeader}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackToSearch}
                  >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Selecciona un Amigo</Text>
                  <View style={{ width: 24 }} />
                </View>

                {isLoadingFriends ? (
                  <View style={styles.friendsLoadingView}>
                    <ActivityIndicator size="large" color="#ffb300" />
                    <Text style={styles.loadingText}>Cargando amigos...</Text>
                  </View>
                ) : friends.length > 0 ? (
                  <ScrollView style={styles.friendsListScroll} showsVerticalScrollIndicator={false}>
                    {friends.map((friend) => {
                      const profile = friend.friend_profile || friend.user_profile || {};
                      const name = profile.name || 'Sin nombre';
                      const username = profile.username || 'usuario';
                      
                      return (
                        <TouchableOpacity
                          key={friend.id}
                          style={styles.friendSelectCard}
                          onPress={() => handleSelectFriend(friend)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.friendSelectAvatar}>
                            <Text style={styles.friendSelectAvatarText}>
                              {name[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.friendSelectInfo}>
                            <Text style={styles.friendSelectName}>{name}</Text>
                            <Text style={styles.friendSelectUsername}>@{username}</Text>
                          </View>
                          <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyFriendsView}>
                    <Ionicons name="people-outline" size={64} color="#666" />
                    <Text style={styles.emptyFriendsTitle}>No hay amigos disponibles</Text>
                    <Text style={styles.emptyFriendsSubtext}>
                      Todos tus amigos ya son alumnos
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* Vista de Búsqueda Normal */
              <>
                <Text style={styles.modalTitle}>Agregar Nuevo Alumno</Text>
                <Text style={styles.modalSubtitle}>
                  Busca a tu alumno por su nombre de usuario
                </Text>

                {/* Input con búsqueda */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor="#666"
                value={searchUsername}
                onChangeText={setSearchUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color="#ffb300"
                  style={styles.searchingIndicator}
                />
              )}
            </View>

            {/* Sugerencias de usuarios */}
            {usernameSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {usernameSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.user_id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(suggestion.username)}
                  >
                    <View style={styles.suggestionAvatar}>
                      <Text style={styles.suggestionAvatarText}>
                        {(suggestion.name || suggestion.username)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>
                        {suggestion.name || 'Sin nombre'}
                      </Text>
                      <Text style={styles.suggestionUsername}>
                        @{suggestion.username}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

                {/* Botón para buscar en amigos */}
                <TouchableOpacity
                  style={styles.friendsButton}
                  onPress={() => {
                    console.log('🔵 Botón "Buscar en Lista de Amigos" presionado');
                    handleOpenFriendsView();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="people" size={18} color="#ffb300" />
                  <Text style={styles.friendsButtonText}>Buscar en Lista de Amigos</Text>
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddStudentModal(false);
                      setSearchUsername('');
                      setUsernameSuggestions([]);
                      setShowFriendsView(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.sendButton,
                      isSendingInvitation && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendInvitation}
                    disabled={isSendingInvitation}
                  >
                    {isSendingInvitation ? (
                      <ActivityIndicator size="small" color="#1a1a1a" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#1a1a1a" />
                        <Text style={styles.sendButtonText}>Agregar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Alerta Personalizada */}
      <Modal
        visible={showCustomAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomAlert(false)}
      >
        <TouchableOpacity 
          style={styles.customAlertOverlay}
          activeOpacity={1}
          onPress={() => setShowCustomAlert(false)}
        >
          <TouchableOpacity
            style={styles.customAlertContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.customAlertIconContainer}>
              <Ionicons name="information-circle" size={48} color="#ffb300" />
            </View>
            <Text style={styles.customAlertMessage}>{customAlertMessage}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setShowCustomAlert(false)}
            >
              <Text style={styles.customAlertButtonText}>Entendido</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    fontSize: 20,
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
  addStudentButton: {
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  addStudentButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  studentCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.15)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
    minWidth: 160,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff4444',
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 36,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#1f1f1f',
  },
  avatarPlaceholder: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  studentTextInfo: {
    flex: 1,
    marginLeft: 14,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  studentUsername: {
    fontSize: 14,
    color: '#ffb300',
    marginBottom: 6,
    fontWeight: '500',
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  statsButton: {
    backgroundColor: '#ffb300',
  },
  chatButton: {
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatButtonText: {
    color: '#ffb300',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    zIndex: 10000,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchingIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  suggestionUsername: {
    fontSize: 12,
    color: '#ffb300',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb300',
    marginBottom: 20,
    gap: 8,
  },
  friendsButtonText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para la vista de amigos dentro del modal
  friendsViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  friendsLoadingView: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  friendsListScroll: {
    maxHeight: 400,
  },
  friendSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  friendSelectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendSelectAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  friendSelectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  friendSelectUsername: {
    fontSize: 14,
    color: '#ffb300',
  },
  emptyFriendsView: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyFriendsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#ffb300',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para el modal de amigos
  friendsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  friendsModalContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 400,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 20,
  },
  friendsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  friendsModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  friendsCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  friendsLoadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  friendsScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  friendItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendItemAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  friendItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  friendItemUsername: {
    fontSize: 14,
    color: '#ffb300',
  },
  friendsEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  friendsEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  friendsEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Estilos para el modal de alerta personalizada
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customAlertContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  customAlertIconContainer: {
    marginBottom: 20,
  },
  customAlertMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  customAlertButton: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  customAlertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

