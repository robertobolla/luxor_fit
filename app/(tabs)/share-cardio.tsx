import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import CardioShareSticker, { CardioStickerData, StickerStyle, StatType, AVAILABLE_STATS } from '../../src/components/share/CardioShareSticker';
import { supabase } from '@/services/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CAPTURE_WIDTH = SCREEN_WIDTH;
const CAPTURE_HEIGHT = Math.min((SCREEN_WIDTH * 16) / 9, SCREEN_HEIGHT);

const STICKER_STYLES: { id: StickerStyle; labelKey: string }[] = [
    { id: 'glassmorphism', labelKey: 'share.styles.glass' },
    { id: 'horizontal', labelKey: 'share.styles.bar' },
    { id: 'vertical', labelKey: 'share.styles.card' },
    { id: 'minimal', labelKey: 'share.styles.min' },
];

export default function ShareCardioScreen() {
    const params = useLocalSearchParams();
    const { t } = useTranslation();
    const exerciseId = params.exerciseId as string;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<StickerStyle>('glassmorphism');
    const [isCapturing, setIsCapturing] = useState(false);
    const [exerciseData, setExerciseData] = useState<CardioStickerData | null>(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [selectedStats, setSelectedStats] = useState<StatType[]>(['distance', 'time', 'pace', 'calories']);

    const captureViewRef = useRef<View>(null);

    // Posición y escala del sticker
    const translateX = useSharedValue(20);
    const translateY = useSharedValue(CAPTURE_HEIGHT * 0.6);
    const stickerOffsetX = useSharedValue(0);
    const stickerOffsetY = useSharedValue(0);
    const stickerScale = useSharedValue(1);
    const stickerSavedScale = useSharedValue(1);

    // Posición y escala de la imagen de fondo
    const bgTranslateX = useSharedValue(0);
    const bgTranslateY = useSharedValue(0);
    const bgOffsetX = useSharedValue(0);
    const bgOffsetY = useSharedValue(0);
    const bgScale = useSharedValue(1);
    const bgSavedScale = useSharedValue(1);

    const handleGoBack = () => {
        if (exerciseId) {
            router.replace({
                pathname: '/(tabs)/exercise-activity-detail',
                params: { exerciseId: exerciseId }
            } as any);
        } else {
            router.replace('/(tabs)/home');
        }
    };

    useEffect(() => {
        const loadExerciseData = async () => {
            if (!exerciseId) {
                setExerciseData({
                    activityType: 'running',
                    distance: 5.2,
                    duration: '32:15',
                    elevation: 45,
                    routePoints: [],
                    startTime: '08:30',
                    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                });
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('exercises')
                    .select('*')
                    .eq('id', exerciseId)
                    .single();

                if (error) throw error;

                const minutes = data.duration_minutes || 0;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const duration = hours > 0
                    ? `${hours}:${String(mins).padStart(2, '0')}:00`
                    : `${mins}:00`;

                const createdAt = data.created_at ? new Date(data.created_at) : new Date();

                setExerciseData({
                    activityType: (data.activity_type as 'running' | 'walking' | 'cycling') || 'running',
                    distance: data.distance_km || 0,
                    duration,
                    elevation: (data as any).elevation_gain || 0,
                    routePoints: (data as any).route_points || [],
                    startTime: createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    date: createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    maxSpeed: (data as any).max_speed || 0,
                });
            } catch (error) {
                console.error('Error loading exercise:', error);
            }
        };

        loadExerciseData();
    }, [exerciseId]);

    // Gesto para mover el sticker
    const stickerPanGesture = Gesture.Pan()
        .onStart(() => {
            stickerOffsetX.value = translateX.value;
            stickerOffsetY.value = translateY.value;
        })
        .onUpdate((e) => {
            translateX.value = stickerOffsetX.value + e.translationX;
            translateY.value = stickerOffsetY.value + e.translationY;
        });

    // Gesto para escalar el sticker
    const stickerPinchGesture = Gesture.Pinch()
        .onStart(() => {
            stickerSavedScale.value = stickerScale.value;
        })
        .onUpdate((e) => {
            stickerScale.value = Math.max(0.5, Math.min(2, stickerSavedScale.value * e.scale));
        });

    const stickerComposedGesture = Gesture.Simultaneous(stickerPanGesture, stickerPinchGesture);

    const animatedStickerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: stickerScale.value },
        ],
    }));

    // Gesto para mover la imagen de fondo
    const bgPanGesture = Gesture.Pan()
        .onStart(() => {
            bgOffsetX.value = bgTranslateX.value;
            bgOffsetY.value = bgTranslateY.value;
        })
        .onUpdate((e) => {
            bgTranslateX.value = bgOffsetX.value + e.translationX;
            bgTranslateY.value = bgOffsetY.value + e.translationY;
        });

    const bgPinchGesture = Gesture.Pinch()
        .onStart(() => {
            bgSavedScale.value = bgScale.value;
        })
        .onUpdate((e) => {
            bgScale.value = Math.max(0.5, Math.min(3, bgSavedScale.value * e.scale));
        });

    const bgComposedGesture = Gesture.Simultaneous(bgPanGesture, bgPinchGesture);

    const animatedBgStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: bgTranslateX.value },
            { translateY: bgTranslateY.value },
            { scale: bgScale.value },
        ],
    }));

    const pickImage = async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(t('common.error'), t('common.permissionsRequired'));
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: 'images',
                    allowsEditing: false,
                    quality: 0.9,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    allowsEditing: false,
                    quality: 0.9,
                });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const handleShare = async () => {
        if (!captureViewRef.current) return;

        setIsCapturing(true);

        try {
            const uri = await captureRef(captureViewRef, {
                format: 'png',
                quality: 1,
                width: CAPTURE_WIDTH,
                height: CAPTURE_HEIGHT,
            });

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: t('share.title'),
                });
            } else {
                Alert.alert(t('common.error'), t('share.errorDevice'));
            }
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert(t('common.error'), t('share.errorSharing'));
        } finally {
            setIsCapturing(false);
        }
    };

    const toggleStat = (statId: StatType) => {
        if (selectedStats.includes(statId)) {
            if (selectedStats.length > 1) {
                setSelectedStats(selectedStats.filter(s => s !== statId));
            }
        } else {
            if (selectedStats.length < 4) {
                setSelectedStats([...selectedStats, statId]);
            } else {
                Alert.alert(t('share.maxStats'));
            }
        }
    };

    if (!selectedImage) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />

                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('share.title')}</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.imagePickerContainer}>
                    <Text style={styles.pickTitle}>{t('share.selectPhoto')}</Text>
                    <Text style={styles.pickSubtitle}>{t('share.dragHint')}</Text>

                    <View style={styles.pickButtons}>
                        <TouchableOpacity style={styles.pickButton} onPress={() => pickImage(false)}>
                            <Ionicons name="images" size={40} color="#FFD54A" />
                            <Text style={styles.pickButtonText}>{t('share.gallery')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.pickButton} onPress={() => pickImage(true)}>
                            <Ionicons name="camera" size={40} color="#FFD54A" />
                            <Text style={styles.pickButtonText}>{t('share.camera')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar hidden />



            <View
                ref={captureViewRef}
                style={styles.captureView}
                collapsable={false}
            >
                <GestureDetector gesture={bgComposedGesture}>
                    <Animated.Image
                        source={{ uri: selectedImage }}
                        style={[styles.backgroundImage, animatedBgStyle]}
                        resizeMode="cover"
                    />
                </GestureDetector>

                {exerciseData && (
                    <Animated.View style={[styles.stickerContainer, animatedStickerStyle]}>
                        <GestureDetector gesture={stickerComposedGesture}>
                            <Animated.View>
                                <CardioShareSticker
                                    style={selectedStyle}
                                    data={exerciseData}
                                    selectedStats={selectedStats}
                                />
                            </Animated.View>
                        </GestureDetector>
                    </Animated.View>
                )}
            </View>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={() => setSelectedImage(null)}
                >
                    <Ionicons name="images-outline" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.styleSelector}>
                    {STICKER_STYLES.map((style) => (
                        <TouchableOpacity
                            key={style.id}
                            style={[
                                styles.styleButton,
                                selectedStyle === style.id && styles.styleButtonActive,
                            ]}
                            onPress={() => setSelectedStyle(style.id)}
                        >
                            <Text style={[
                                styles.styleButtonText,
                                selectedStyle === style.id && styles.styleButtonTextActive,
                            ]}>{t(style.labelKey)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                    disabled={isCapturing}
                >
                    {isCapturing ? (
                        <ActivityIndicator color="#0a0a0a" />
                    ) : (
                        <>
                            <Ionicons name="share-outline" size={20} color="#0a0a0a" />
                            <Text style={styles.shareButtonText}>{t('share.title')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.dragHint}>
                <Ionicons name="move" size={14} color="#666" />
                <Text style={styles.dragHintText}>{t('share.dragHint')}</Text>
            </View>

            {/* Modal de configuración de estadísticas */}
            <Modal
                visible={showStatsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowStatsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('share.modalTitle')}</Text>
                            <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            {selectedStats.length}/4
                        </Text>
                        <ScrollView style={styles.statsList}>
                            {AVAILABLE_STATS.map((stat) => {
                                const isSelected = selectedStats.includes(stat.id);
                                return (
                                    <TouchableOpacity
                                        key={stat.id}
                                        style={[styles.statOption, isSelected && styles.statOptionSelected]}
                                        onPress={() => toggleStat(stat.id)}
                                    >
                                        <Ionicons
                                            name={stat.icon}
                                            size={20}
                                            color={isSelected ? '#FFD54A' : '#666'}
                                        />
                                        <Text style={[
                                            styles.statOptionText,
                                            isSelected && styles.statOptionTextSelected
                                        ]}>
                                            {t(`share.stats.${stat.id}`)}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color="#FFD54A" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowStatsModal(false)}
                        >
                            <Text style={styles.modalDoneText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </GestureHandlerRootView>
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
        paddingTop: 50,
        paddingBottom: 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    placeholder: {
        width: 40,
    },
    imagePickerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pickTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    pickSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    pickButtons: {
        flexDirection: 'row',
        gap: 24,
    },
    pickButton: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    pickButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
    },
    editHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    editHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    configButton: {
        padding: 8,
    },
    captureView: {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        backgroundColor: '#000',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    backgroundImage: {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
    },
    stickerContainer: {
        position: 'absolute',
    },
    controls: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
    },
    changePhotoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    styleSelector: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 4,
        justifyContent: 'space-around',
    },
    styleButton: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    styleButtonActive: {
        backgroundColor: '#2a2a2a',
    },
    styleButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
    },
    styleButtonTextActive: {
        color: '#FFD54A',
        fontWeight: '600',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        backgroundColor: '#FFD54A',
    },
    shareButtonText: {
        fontWeight: '600',
        fontSize: 14,
        color: '#0a0a0a',
    },
    dragHint: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    dragHintText: {
        fontSize: 12,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    statsList: {
        marginBottom: 16,
    },
    statOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#0a0a0a',
        gap: 12,
    },
    statOptionSelected: {
        backgroundColor: 'rgba(255, 213, 74, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 213, 74, 0.3)',
    },
    statOptionText: {
        flex: 1,
        fontSize: 16,
        color: '#666',
    },
    statOptionTextSelected: {
        color: '#fff',
        fontWeight: '500',
    },
    modalDoneButton: {
        backgroundColor: '#FFD54A',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalDoneText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0a0a0a',
    },
});
