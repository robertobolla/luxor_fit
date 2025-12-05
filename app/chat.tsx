import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import {
  getChatMessages,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  setTypingIndicator,
  subscribeToTypingIndicators,
  searchMessages,
  Message,
} from '../src/services/chatService';
import { formatRelativeTime } from '../src/utils/formatTime';
import { supabase } from '../src/services/supabase';
import {
  shareWorkout,
  acceptSharedWorkout,
  rejectSharedWorkout,
  getReceivedSharedWorkouts,
  SharedWorkout,
} from '../src/services/sharedWorkoutService';
import { uploadChatImage } from '../src/services/chatImageService';
import { setCurrentChatForNotifications } from '../src/hooks/useChatNotifications';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const chatId = params.chatId as string;
  const otherUserId = params.otherUserId as string;
  const otherUserName = params.otherUserName as string || 'Usuario';

  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [pendingWorkouts, setPendingWorkouts] = useState<SharedWorkout[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chatId && user?.id) {
      // Establecer este chat como el actual para evitar notificaciones
      setCurrentChatForNotifications(chatId);
      
      loadMessages();
      loadOtherUserProfile();
      loadPendingWorkouts();
      markMessagesAsRead(chatId, user.id);
    }

    // Limpiar cuando se sale del chat
    return () => {
      setCurrentChatForNotifications(null);
    };
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    // Suscribirse a nuevos mensajes en tiempo real
    const messageChannel = subscribeToMessages(chatId, (newMessage) => {
      setMessages((prev) => {
        // Evitar duplicados verificando si el mensaje ya existe
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, newMessage];
      });
      markMessagesAsRead(chatId, user.id);
      
      // Scroll al final
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Suscribirse a indicadores de escritura
    const typingChannel = subscribeToTypingIndicators(chatId, (userId, typing) => {
      if (userId !== user.id) {
        setOtherUserTyping(typing);
        // Auto-ocultar después de 3 segundos
        if (typing) {
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      }
    });

    return () => {
      messageChannel.unsubscribe();
      typingChannel.unsubscribe();
      // Limpiar typing indicator al salir
      if (user?.id) {
        setTypingIndicator(chatId, user.id, false);
      }
    };
  }, [chatId, user]);

  // Filtrar mensajes cuando cambia la búsqueda
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter((msg) =>
        msg.message_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchQuery]);

  // Cleanup typing indicator al desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (chatId && user?.id) {
        setTypingIndicator(chatId, user.id, false);
      }
    };
  }, [chatId, user?.id]);

  const loadMessages = async () => {
    if (!chatId) return;

    setIsLoading(true);
    const result = await getChatMessages(chatId);
    if (result.success && result.data) {
      setMessages(result.data);
      setFilteredMessages(result.data); // Inicializar mensajes filtrados
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
    setIsLoading(false);
  };

  const loadOtherUserProfile = async () => {
    if (!otherUserId) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, name, profile_photo_url')
      .eq('user_id', otherUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading other user profile:', error);
    }

    if (data) {
      setOtherUserProfile(data);
    }
  };

  const loadPendingWorkouts = async () => {
    if (!user?.id) return;

    const result = await getReceivedSharedWorkouts(user.id);
    if (result.success && result.data) {
      // Filtrar solo los del chat actual
      const chatWorkouts = result.data.filter(
        (w) => w.sender_id === otherUserId || w.receiver_id === otherUserId
      );
      setPendingWorkouts(chatWorkouts);
    }
  };

  const handleAcceptWorkout = async (message: Message) => {
    if (!user?.id || !message.workout_plan_id) return;

    // Buscar el shared_workout correspondiente
    const { data: sharedWorkout } = await supabase
      .from('shared_workouts')
      .select('*')
      .eq('workout_plan_id', message.workout_plan_id)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!sharedWorkout) {
      Alert.alert('Error', 'No se encontró el entrenamiento compartido');
      return;
    }

    Alert.alert(
      'Aceptar Entrenamiento',
      '¿Quieres activar este entrenamiento como tu plan activo?',
      [
        {
          text: 'Solo aceptar',
          onPress: async () => {
            const result = await acceptSharedWorkout(sharedWorkout.id, user.id, false);
            if (result.success) {
              loadPendingWorkouts();
              loadMessages(); // Recargar mensajes para ver la actualización
            } else {
              Alert.alert('Error', result.error || 'No se pudo aceptar el entrenamiento');
            }
          },
        },
        {
          text: 'Aceptar y activar',
          onPress: async () => {
            const result = await acceptSharedWorkout(sharedWorkout.id, user.id, true);
            if (result.success) {
              Alert.alert('Éxito', 'Entrenamiento aceptado y activado como tu plan actual');
              loadPendingWorkouts();
              loadMessages();
            } else {
              Alert.alert('Error', result.error || 'No se pudo aceptar el entrenamiento');
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleRejectWorkout = async (message: Message) => {
    if (!user?.id || !message.workout_plan_id) return;

    const { data: sharedWorkout } = await supabase
      .from('shared_workouts')
      .select('*')
      .eq('workout_plan_id', message.workout_plan_id)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!sharedWorkout) {
      Alert.alert('Error', 'No se encontró el entrenamiento compartido');
      return;
    }

    Alert.alert('Rechazar Entrenamiento', '¿Estás seguro de rechazar este entrenamiento?', [
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          const result = await rejectSharedWorkout(sharedWorkout.id, user.id);
          if (result.success) {
            loadPendingWorkouts();
            loadMessages();
          } else {
            Alert.alert('Error', result.error || 'No se pudo rechazar el entrenamiento');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatId || !user?.id || !otherUserId) return;

    const text = messageText.trim();
    setMessageText('');
    
    // Dejar de escribir
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingIndicator(chatId, user.id, false);

    const result = await sendMessage(chatId, user.id, otherUserId, text);
    if (result.success && result.data) {
      setMessages((prev) => {
        // Evitar duplicados verificando si el mensaje ya existe
        const exists = prev.some(msg => msg.id === result.data!.id);
        if (exists) {
          return prev;
        }
        return [...prev, result.data!];
      });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar el mensaje');
      setMessageText(text); // Restaurar el texto
    }
  };

  const handleShareWorkout = async () => {
    if (!user?.id || !otherUserId) return;

    // Obtener planes de entrenamiento del usuario
    const { data: plans } = await supabase
      .from('workout_plans')
      .select('id, plan_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!plans || plans.length === 0) {
      Alert.alert('Sin planes', 'No tienes planes de entrenamiento para compartir');
      return;
    }

    // Mostrar selector de planes (simplificado - puedes mejorarlo con un modal)
    const planNames = plans.map((p) => p.plan_name);
    Alert.alert(
      'Compartir Entrenamiento',
      'Selecciona un plan para compartir',
      [
        ...plans.map((plan, index) => ({
          text: plan.plan_name,
          onPress: async () => {
            const result = await shareWorkout(user.id, otherUserId, plan.id);
            if (result.success) {
              Alert.alert('Éxito', 'Entrenamiento compartido correctamente');
            } else {
              Alert.alert('Error', result.error || 'No se pudo compartir el entrenamiento');
            }
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Manejar typing indicator
  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);
    
    if (!chatId || !user?.id) return;

    // Indicar que está escribiendo
    if (text.trim().length > 0) {
      setTypingIndicator(chatId, user.id, true);
      
      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Dejar de escribir después de 2 segundos sin escribir
      typingTimeoutRef.current = setTimeout(() => {
        setTypingIndicator(chatId, user.id, false);
      }, 2000);
    } else {
      // Si el texto está vacío, dejar de escribir inmediatamente
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingIndicator(chatId, user.id, false);
    }
  }, [chatId, user?.id]);

  // Enviar imagen
  const handlePickImage = async () => {
    if (!user?.id || !chatId) return;

    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para enviar imágenes');
        return;
      }

      // Abrir selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const imageUri = result.assets[0].uri;

        // Subir imagen
        const uploadResult = await uploadChatImage(user.id, chatId, imageUri);
        
        if (uploadResult.success && uploadResult.imageUrl) {
          // Enviar mensaje con imagen
          const messageResult = await sendMessage(
            chatId,
            user.id,
            otherUserId,
            '📷 Imagen',
            'image',
            undefined,
            uploadResult.imageUrl
          );

          if (messageResult.success && messageResult.data) {
            setMessages((prev) => {
              // Evitar duplicados verificando si el mensaje ya existe
              const exists = prev.some(msg => msg.id === messageResult.data!.id);
              if (exists) {
                return prev;
              }
              return [...prev, messageResult.data!];
            });
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } else {
            Alert.alert('Error', 'No se pudo enviar la imagen');
          }
        } else {
          Alert.alert('Error', uploadResult.error || 'No se pudo subir la imagen');
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Buscar mensajes
  const handleSearch = async () => {
    if (!searchQuery.trim() || !chatId) return;

    const result = await searchMessages(chatId, searchQuery);
    if (result.success && result.data) {
      setFilteredMessages(result.data);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/friends' as any)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerUser}>
            {otherUserProfile?.profile_photo_url ? (
              <Image
                source={{ uri: otherUserProfile.profile_photo_url }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {otherUserProfile?.name?.charAt(0) || otherUserName.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.headerName}>
              {otherUserProfile?.name || otherUserName}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => setShowSearch(!showSearch)} 
              style={styles.headerButton}
            >
              <Ionicons name="search" size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareWorkout} style={styles.headerButton}>
              <Ionicons name="fitness" size={24} color="#ffb300" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de búsqueda */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar mensajes..."
              placeholderTextColor="#666"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={() => setShowSearch(false)} style={styles.closeSearchButton}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de escritura */}
        {otherUserTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {otherUserProfile?.name || otherUserName} está escribiendo...
            </Text>
          </View>
        )}

        {/* Mensajes */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando mensajes...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Envía el primer mensaje para comenzar</Text>
            </View>
          ) : (
            filteredMessages.map((message) => {
            const isMe = message.sender_id === user?.id;
            return (
              <View
                key={message.id}
                style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}
              >
                {message.message_type === 'workout_share' && (
                  <View style={styles.workoutShareCard}>
                    <Ionicons name="fitness" size={20} color="#ffb300" />
                    <View style={styles.workoutShareContent}>
                      <Text style={styles.workoutShareText}>Entrenamiento compartido</Text>
                      {!isMe && (
                        <View style={styles.workoutActions}>
                          <TouchableOpacity
                            style={styles.acceptWorkoutButton}
                            onPress={() => handleAcceptWorkout(message)}
                          >
                            <Ionicons name="checkmark" size={16} color="#ffffff" />
                            <Text style={styles.acceptWorkoutText}>Aceptar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectWorkoutButton}
                            onPress={() => handleRejectWorkout(message)}
                          >
                            <Ionicons name="close" size={16} color="#ffffff" />
                            <Text style={styles.rejectWorkoutText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                {message.message_type === 'workout_accepted' && (
                  <View style={styles.workoutAcceptedCard}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.workoutAcceptedText}>Entrenamiento aceptado</Text>
                  </View>
                )}
                {message.message_type === 'workout_rejected' && (
                  <View style={styles.workoutRejectedCard}>
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                    <Text style={styles.workoutRejectedText}>Entrenamiento rechazado</Text>
                  </View>
                )}
                {/* Imagen si existe */}
                {message.message_type === 'image' && message.image_url && (
                  <TouchableOpacity
                    onPress={() => setSelectedImage(message.image_url!)}
                    style={styles.messageImageContainer}
                  >
                    <Image
                      source={{ uri: message.image_url }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {message.message_text ? (
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                    {message.message_text}
                  </Text>
                ) : null}
                <View style={styles.messageFooter}>
                  {message.created_at && (
                    <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                      {formatRelativeTime(message.created_at)}
                    </Text>
                  )}
                  {/* Indicador de leído/no leído */}
                  {isMe && (
                    <Ionicons
                      name={message.is_read ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={message.is_read ? '#4CAF50' : '#888'}
                      style={styles.readIndicator}
                    />
                  )}
                </View>
              </View>
            );
          })
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.imageButton}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color="#ffb300" />
            ) : (
              <Ionicons name="image" size={24} color="#ffb300" />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={handleTextChange}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color={messageText.trim() ? '#1a1a1a' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Modal para ver imagen en grande */}
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            style={styles.imageModal}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <Image
              source={{ uri: selectedImage || '' }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#ffb300',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  closeSearchButton: {
    padding: 8,
    marginLeft: 8,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  typingText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ffb300',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#1a1a1a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    color: '#888',
    fontSize: 11,
  },
  myMessageTime: {
    color: '#1a1a1a',
    opacity: 0.7,
  },
  readIndicator: {
    marginLeft: 2,
  },
  messageImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '90%',
  },
  workoutShareCard: {
    backgroundColor: '#ffb30020',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutShareContent: {
    marginLeft: 28,
  },
  workoutShareText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  acceptWorkoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  rejectWorkoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutAcceptedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF5020',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutAcceptedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  workoutRejectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444420',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutRejectedText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#0a0a0a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
});

