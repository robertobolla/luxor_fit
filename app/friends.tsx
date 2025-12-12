import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import {
  searchUsersByUsername,
  sendFriendRequest,
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  Friendship,
  FriendRequest,
} from '../src/services/friendsService';
import { getOrCreateChat } from '../src/services/chatService';

export default function FriendsScreen() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'friends' | 'requests'>('friends');

  useEffect(() => {
    if (user?.id) {
      loadFriends();
      loadPendingRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user?.id) return;

    const result = await getFriends(user.id);
    if (result.success && result.data) {
      setFriends(result.data);
    }
  };

  const loadPendingRequests = async () => {
    if (!user?.id) return;

    const result = await getPendingFriendRequests(user.id);
    if (result.success && result.data) {
      setPendingRequests(result.data);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user?.id) return;

    setIsSearching(true);
    const result = await searchUsersByUsername(searchQuery.trim(), user.id);
    if (result.success && result.data) {
      setSearchResults(result.data);
    }
    setIsSearching(false);
  };

  const handleSendFriendRequest = async (friendId: string) => {
    if (!user?.id) return;

    const result = await sendFriendRequest(user.id, friendId);
    if (result.success) {
      Alert.alert('Éxito', 'Solicitud de amistad enviada');
      handleSearch(); // Refrescar resultados
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar la solicitud');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    if (!user?.id) return;

    const result = await acceptFriendRequest(friendshipId, user.id);
    if (result.success) {
      Alert.alert('Éxito', 'Solicitud aceptada');
      loadPendingRequests();
      loadFriends();
    } else {
      Alert.alert('Error', result.error || 'No se pudo aceptar la solicitud');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    if (!user?.id) return;

    const result = await rejectFriendRequest(friendshipId, user.id);
    if (result.success) {
      loadPendingRequests();
    } else {
      Alert.alert('Error', result.error || 'No se pudo rechazar la solicitud');
    }
  };

  const handleStartChat = async (friendId: string, friendName: string) => {
    if (!user?.id) return;

    const result = await getOrCreateChat(user.id, friendId);
    if (result.success && result.data) {
      router.push({
        pathname: '/chat',
        params: {
          chatId: result.data.id,
          otherUserId: friendId,
          otherUserName: friendName,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amigos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Amigos ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Solicitudes ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            Buscar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Tab: Buscar */}
        {activeTab === 'search' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre de usuario..."
                placeholderTextColor="#666"
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#ffb300" />
                ) : (
                  <Ionicons name="search" size={24} color="#ffb300" />
                )}
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                {searchResults.map((user) => (
                  <View key={user.user_id} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      {user.profile_photo_url ? (
                        <Image
                          source={{ uri: user.profile_photo_url }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
                        <Text style={styles.userUsername}>@{user.username}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleSendFriendRequest(user.user_id)}
                    >
                      <Ionicons name="person-add" size={20} color="#ffb300" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab: Amigos */}
        {activeTab === 'friends' && (
          <View style={styles.friendsContainer}>
            {friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No tienes amigos aún</Text>
                <Text style={styles.emptySubtext}>Busca usuarios para agregar como amigos</Text>
              </View>
            ) : (
              friends.map((friendship) => {
                const friend = friendship.friend_profile;
                if (!friend) return null;

                return (
                  <View key={friendship.id} style={styles.friendCard}>
                    <View style={styles.userInfo}>
                      {friend.profile_photo_url ? (
                        <Image
                          source={{ uri: friend.profile_photo_url }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {friend.name?.charAt(0) || friend.username?.charAt(0) || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{friend.name || 'Usuario'}</Text>
                        <Text style={styles.userUsername}>@{friend.username}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => handleStartChat(friend.user_id, friend.name || 'Usuario')}
                    >
                      <Ionicons name="chatbubble" size={20} color="#ffb300" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab: Solicitudes */}
        {activeTab === 'requests' && (
          <View style={styles.requestsContainer}>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No tienes solicitudes pendientes</Text>
              </View>
            ) : (
              pendingRequests.map((request) => {
                const requester = request.user_profile;
                if (!requester) return null;

                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.userInfo}>
                      {requester.profile_photo_url ? (
                        <Image
                          source={{ uri: requester.profile_photo_url }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {requester.name?.charAt(0) || requester.username?.charAt(0) || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{requester.name || 'Usuario'}</Text>
                        <Text style={styles.userUsername}>@{requester.username}</Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptRequest(request.id)}
                      >
                        <Ionicons name="checkmark" size={20} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectRequest(request.id)}
                      >
                        <Ionicons name="close" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
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
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#ffb300',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffb300',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 12,
  },
  searchButton: {
    padding: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  friendsContainer: {
    padding: 16,
  },
  requestsContainer: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffb300',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  chatButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#ff4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

