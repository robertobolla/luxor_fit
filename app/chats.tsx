import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ChatList from '../src/components/ChatList';

export default function ChatsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="chatbubbles" size={24} color="#ffb300" />
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Lista de Chats */}
      <ChatList 
        onNavigateToChat={(chatId, otherUserId) => {
          router.push({
            pathname: '/chat',
            params: { chatId, otherUserId }
          } as any);
        }}
        onNavigateToFriends={() => {
          router.push('/friends');
        }}
      />
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: {
    width: 40,
  },
});

