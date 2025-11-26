import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function CustomModal({ visible, onClose, title, children }: CustomModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  confirmButtonStyle?: 'primary' | 'danger';
}

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  confirmButtonStyle = 'primary',
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.confirmContent}>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.confirmButtons}>
              {cancelText && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  confirmButtonStyle === 'danger' ? styles.dangerButton : styles.confirmButton,
                  !cancelText && styles.fullWidthButton,
                ]}
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    confirmButtonStyle === 'danger' && styles.dangerButtonText,
                  ]}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface FriendSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Array<{
    id: string;
    friend_profile?: {
      user_id: string;
      username: string;
      name: string;
      profile_photo_url?: string;
    };
  }>;
  onSelectFriend: (friendId: string, friendName: string) => void;
  title?: string;
}

export function FriendSelectionModal({
  visible,
  onClose,
  friends,
  onSelectFriend,
  title = 'Compartir con un amigo',
}: FriendSelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No tienes amigos aún</Text>
                <Text style={styles.emptySubtext}>
                  Agrega amigos para compartir entrenamientos
                </Text>
              </View>
            ) : (
              friends.map((friendship) => {
                const friend = friendship.friend_profile;
                if (!friend) return null;

                return (
                  <TouchableOpacity
                    key={friendship.id}
                    style={styles.friendOption}
                    onPress={() => {
                      onSelectFriend(friend.user_id, friend.name || friend.username);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendOptionContent}>
                      {friend.profile_photo_url ? (
                        <Image
                          source={{ uri: friend.profile_photo_url }}
                          style={styles.friendOptionAvatar}
                        />
                      ) : (
                        <View style={styles.friendOptionAvatarPlaceholder}>
                          <Text style={styles.friendOptionAvatarText}>
                            {friend.name?.charAt(0) || friend.username?.charAt(0) || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.friendOptionInfo}>
                        <Text style={styles.friendOptionName}>
                          {friend.name || 'Usuario'}
                        </Text>
                        <Text style={styles.friendOptionUsername}>@{friend.username}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
  },
  confirmContent: {
    padding: 20,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  fullWidthButton: {
    flex: 1,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#ffb300',
  },
  confirmButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  dangerButtonText: {
    color: '#ffffff',
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
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  friendOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  friendOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendOptionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendOptionAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendOptionAvatarText: {
    color: '#ffb300',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendOptionInfo: {
    flex: 1,
  },
  friendOptionName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendOptionUsername: {
    color: '#666',
    fontSize: 14,
  },
});

