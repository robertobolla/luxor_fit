import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import {
  getChatMessages,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  Message,
} from '../src/services/chatService';
import {
  shareWorkout,
  acceptSharedWorkout,
  rejectSharedWorkout,
  getReceivedSharedWorkouts,
  SharedWorkout,
} from '../src/services/sharedWorkoutService';
import { supabase } from '../src/services/supabase';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const chatId = params.chatId as string;
  const otherUserId = params.otherUserId as string;
  const otherUserName = params.otherUserName as string || 'Usuario';

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [pendingWorkouts, setPendingWorkouts] = useState<SharedWorkout[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (chatId && user?.id) {
      loadMessages();
      loadOtherUserProfile();
      loadPendingWorkouts();
      markMessagesAsRead(chatId, user.id);
    }
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    // Suscribirse a nuevos mensajes en tiempo real
    const channel = subscribeToMessages(chatId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      markMessagesAsRead(chatId, user.id);
      
      // Scroll al final
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [chatId, user]);

  const loadMessages = async () => {
    if (!chatId) return;

    setIsLoading(true);
    const result = await getChatMessages(chatId);
    if (result.success && result.data) {
      setMessages(result.data);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
    setIsLoading(false);
  };

  const loadOtherUserProfile = async () => {
    if (!otherUserId) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, username, name, profile_photo_url')
      .eq('user_id', otherUserId)
      .single();

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

    const result = await sendMessage(chatId, user.id, otherUserId, text);
    if (result.success && result.data) {
      setMessages((prev) => [...prev, result.data!]);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
          <TouchableOpacity onPress={handleShareWorkout} style={styles.shareButton}>
            <Ionicons name="fitness" size={24} color="#ffb300" />
          </TouchableOpacity>
        </View>

        {/* Mensajes */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => {
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
                {message.message_text && (
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                    {message.message_text}
                  </Text>
                )}
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {formatTime(message.created_at)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
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
  shareButton: {
    padding: 8,
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
  messageTime: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#1a1a1a',
    opacity: 0.7,
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
});

