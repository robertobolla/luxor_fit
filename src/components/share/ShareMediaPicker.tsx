import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

interface ShareMediaPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (uri: string, type: 'image' | 'video') => void;
    title?: string;
    subtitle?: string;
}

export const ShareMediaPicker: React.FC<ShareMediaPickerProps> = ({
    visible,
    onClose,
    onSelect,
    title,
    subtitle
}) => {
    const { t } = useTranslation();

    const pickImage = async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                // We should probably use a proper alert service here if available
                return;
            }

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images', 'videos'],
                allowsEditing: false,
                quality: 1,
            };

            const result = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const type = asset.type === 'video' ? 'video' : 'image';
                onSelect(asset.uri, type);
            }
        } catch (error) {
            console.error('Error picking media:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title || t('share.title', 'Compartir')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.pickTitle}>{title || t('share.selectMedia', 'Selecciona tu foto o video')}</Text>
                    <Text style={styles.pickSubtitle}>{subtitle || t('share.selectMediaHint', 'Captura un momento o elige de tu galería')}</Text>

                    <View style={styles.pickButtons}>
                        <TouchableOpacity
                            style={styles.pickButton}
                            onPress={() => pickImage(false)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="images" size={32} color="#FFD54A" />
                            </View>
                            <Text style={styles.pickButtonText}>{t('share.gallery', 'Galería')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.pickButton}
                            onPress={() => pickImage(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={32} color="#FFD54A" />
                            </View>
                            <Text style={styles.pickButtonText}>{t('share.camera', 'Cámara')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

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
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pickTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    pickSubtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 22,
    },
    pickButtons: {
        flexDirection: 'row',
        gap: 24,
    },
    pickButton: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 24,
        width: 140,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 213, 74, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    pickButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
