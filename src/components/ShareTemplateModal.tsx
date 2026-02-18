import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { shareTemplate } from '../services/sharedTemplateService';
import { getFriends } from '../services/friendsService';

interface Props {
    visible: boolean;
    onClose: () => void;
    templateId: string;
    templateName: string;
    senderId: string;
    sourceType?: 'personal' | 'gym_public';
    onShared?: () => void;
}

interface UserResult {
    user_id: string;
    username: string;
    name: string;
    profile_photo_url: string | null;
}

export function ShareTemplateModal({
    visible,
    onClose,
    templateId,
    templateName,
    senderId,
    sourceType = 'personal',
    onShared,
}: Props) {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [friends, setFriends] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showFriends, setShowFriends] = useState(true);
    const [sharedTo, setSharedTo] = useState<Set<string>>(new Set());
    const [successMessage, setSuccessMessage] = useState('');

    // Load friends on open
    useEffect(() => {
        if (visible) {
            loadFriends();
            setSharedTo(new Set());
            setSuccessMessage('');
            setSearchText('');
            setResults([]);
            setShowFriends(true);
        }
    }, [visible]);

    // Search users while typing
    useEffect(() => {
        if (searchText.length < 2) {
            setResults([]);
            setShowFriends(true);
            return;
        }
        setShowFriends(false);

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('user_id, username, name, profile_photo_url')
                    .ilike('username', `${searchText}%`)
                    .neq('user_id', senderId)
                    .limit(10);

                if (!error && data) {
                    setResults(data.map(d => ({
                        user_id: d.user_id,
                        username: d.username || '',
                        name: d.name || '',
                        profile_photo_url: d.profile_photo_url,
                    })));
                }
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchText]);

    const loadFriends = async () => {
        setIsLoadingFriends(true);
        try {
            const result = await getFriends(senderId);
            if (result.success && result.data) {
                const mapped: UserResult[] = result.data.map((f: any) => {
                    const profile = f.friend_profile || f.user_profile || {};
                    return {
                        user_id: f.friend_id || f.user_id || profile.user_id || '',
                        username: profile.username || '',
                        name: profile.name || '',
                        profile_photo_url: profile.profile_photo_url || null,
                    };
                }).filter((u: UserResult) => u.user_id && u.user_id !== senderId);
                setFriends(mapped);
            }
        } catch (e) {
            console.error('Load friends error:', e);
        } finally {
            setIsLoadingFriends(false);
        }
    };

    const handleShare = async (user: UserResult) => {
        if (sharedTo.has(user.user_id)) return;
        setIsSharing(true);
        try {
            const result = await shareTemplate(senderId, user.user_id, templateId, sourceType);
            if (result.success) {
                setSharedTo(prev => new Set(prev).add(user.user_id));
                setSuccessMessage(`✓ Compartido con @${user.username}`);
                setTimeout(() => setSuccessMessage(''), 2500);
                onShared?.();
            } else {
                setSuccessMessage(`✗ ${result.error || 'Error'}`);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (e) {
            console.error('Share error:', e);
        } finally {
            setIsSharing(false);
        }
    };

    const renderUser = ({ item }: { item: UserResult }) => {
        const alreadyShared = sharedTo.has(item.user_id);
        return (
            <TouchableOpacity
                style={[styles.userRow, alreadyShared && styles.userRowShared]}
                onPress={() => handleShare(item)}
                disabled={alreadyShared || isSharing}
                activeOpacity={0.7}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(item.name || item.username || '?')[0].toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{item.name || 'Sin nombre'}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                </View>
                {alreadyShared ? (
                    <View style={styles.sharedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleShare(item)}
                        disabled={isSharing}
                    >
                        <Ionicons name="send" size={14} color="#1a1a1a" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const displayList = showFriends ? friends : results;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContainer}
                >
                    <View style={styles.modal}>
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{t('templates.share')}</Text>
                                <Text style={styles.subtitle} numberOfLines={1}>"{templateName}"</Text>
                            </View>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#666" />
                            <TextInput
                                style={styles.searchInput}
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholder="Buscar por username..."
                                placeholderTextColor="#666"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {isSearching && <ActivityIndicator size="small" color="#ffb300" />}
                        </View>

                        {/* Tab indicator */}
                        <Text style={styles.sectionLabel}>
                            {showFriends ? '👥 Amigos' : `🔍 Resultados (${results.length})`}
                        </Text>

                        {/* Success message */}
                        {successMessage ? (
                            <View style={styles.successBanner}>
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        ) : null}

                        {/* List */}
                        {(showFriends && isLoadingFriends) ? (
                            <ActivityIndicator size="large" color="#ffb300" style={{ paddingVertical: 40 }} />
                        ) : displayList.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons
                                    name={showFriends ? 'people-outline' : 'search-outline'}
                                    size={40}
                                    color="#666"
                                />
                                <Text style={styles.emptyText}>
                                    {showFriends
                                        ? 'No tienes amigos aún'
                                        : searchText.length < 2
                                            ? 'Escribí al menos 2 caracteres'
                                            : 'No se encontraron usuarios'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={displayList}
                                keyExtractor={(item) => item.user_id}
                                renderItem={renderUser}
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContainer: { justifyContent: 'flex-end' },
    modal: {
        backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: '80%',
        borderTopWidth: 2, borderTopColor: '#ffb300',
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#444', alignSelf: 'center', marginBottom: 16,
    },
    header: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    subtitle: { fontSize: 13, color: '#ffb300', marginTop: 2 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 12,
        marginBottom: 12, borderWidth: 1, borderColor: '#333',
    },
    searchInput: { flex: 1, paddingVertical: 12, color: '#ffffff', fontSize: 14 },
    sectionLabel: {
        fontSize: 13, color: '#999', fontWeight: '600',
        marginBottom: 10, paddingLeft: 2,
    },
    successBanner: {
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        borderRadius: 8, padding: 10, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.3)',
    },
    successText: { color: '#4CAF50', fontSize: 13, fontWeight: '500', textAlign: 'center' },
    list: { maxHeight: 350 },
    userRow: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        backgroundColor: '#2a2a2a', borderRadius: 12, marginBottom: 8,
    },
    userRowShared: { opacity: 0.6, backgroundColor: 'rgba(76, 175, 80, 0.08)' },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#333', justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#ffb300', fontSize: 16, fontWeight: 'bold' },
    userInfo: { flex: 1 },
    userName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
    userUsername: { fontSize: 12, color: '#999', marginTop: 1 },
    sharedBadge: { paddingHorizontal: 8 },
    shareBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#ffb300', justifyContent: 'center', alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center', paddingVertical: 40, gap: 10,
    },
    emptyText: { color: '#666', fontSize: 13 },
});
