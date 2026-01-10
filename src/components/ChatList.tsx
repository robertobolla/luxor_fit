import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { getUserChats, Chat, subscribeToChats } from '../services/chatService';
import { getPendingFriendRequests } from '../services/friendsService';
import { useTranslation } from 'react-i18next';

interface ChatListProps {
  onNavigateToChat?: (chatId: string, otherUserId: string) => void;
  onNavigateToFriends?: () => void;
}

export default function ChatList({ onNavigateToChat, onNavigateToFriends }: ChatListProps) {
  const { user } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
const { t } = useTranslation();

  useEffect(() => {
    if (user?.id) {
      loadChats();
      loadPendingRequests();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    // Suscribirse a actualizaciones de chats en tiempo real
    const channel = subscribeToChats(user.id, (updatedChat) => {
      setChats((prevChats) => {
        const existingIndex = prevChats.findIndex((c) => c.id === updatedChat.id);
        if (existingIndex >= 0) {
          const updated = [...prevChats];
          updated[existingIndex] = updatedChat;
          return updated.sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bTime - aTime;
          });
        } else {
          return [updatedChat, ...prevChats].sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bTime - aTime;
          });
        }
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadChats = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    const result = await getUserChats(user.id);
    if (result.success && result.data) {
      setChats(result.data);
    }
    setIsLoading(false);
  };

  const loadPendingRequests = async () => {
    if (!user?.id) return;

    const result = await getPendingFriendRequests(user.id);
    if (result.success && result.data) {
      setPendingRequests(result.data.length);
    }
  };

  const handleChatPress = (chat: Chat) => {
    if (onNavigateToChat && chat.other_user) {
      onNavigateToChat(chat.id, chat.other_user.user_id);
    } else {
      router.push({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          otherUserId: chat.other_user?.user_id || '',
          otherUserName: chat.other_user?.name || 'Usuario',
        },
      });
    }
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'Ahora';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#ffb300" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con botón de amigos */}
      <View style={styles.header}>
        <Text style={styles.title}>💬 Chats</Text>
        <TouchableOpacity
          style={styles.friendsButton}
          onPress={() => {
            if (onNavigateToFriends) {
              onNavigateToFriends();
            } else {
              router.push('/friends');
            }
          }}
        >
          <Ionicons name="people" size={20} color="#ffb300" />
          {pendingRequests > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {String(pendingRequests)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista de chats */}
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>{t('chat.empty.title')}</Text>
<Text style={styles.emptySubtext}>{t('chat.empty.subtitle')}</Text>

        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherUser = item.other_user;
            const userName = otherUser?.name || otherUser?.username || 'Usuario';
            const userInitial = otherUser?.name?.charAt(0) || otherUser?.username?.charAt(0) || 'U';
            const unreadCount = item.unread_count || 0;
            const lastMessageTime = item.last_message_at ? formatTime(item.last_message_at) : '';
            const lastMessageText = item.last_message_text || '';

            return (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleChatPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  {otherUser?.profile_photo_url ? (
                    <Image
                      source={{ uri: otherUser.profile_photo_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {String(userInitial)}
                      </Text>
                    </View>
                  )}
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {String(unreadCount)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {String(userName)}
                    </Text>
                    {lastMessageTime ? (
                      <Text style={styles.chatTime}>
                        {String(lastMessageTime)}
                      </Text>
                    ) : null}
                  </View>
                  {lastMessageText ? (
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {String(lastMessageText)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  friendsButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffb300',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  chatPreview: {
    color: '#888',
    fontSize: 14,
  },
});

