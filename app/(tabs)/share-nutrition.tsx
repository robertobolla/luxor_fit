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
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import NutritionShareSticker, { NutritionStickerData, NutritionStickerStyle } from '../../src/components/share/NutritionShareSticker';
import { ShareMediaPicker } from '../../src/components/share/ShareMediaPicker';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CAPTURE_WIDTH = SCREEN_WIDTH;
const CAPTURE_HEIGHT = Math.min((SCREEN_WIDTH * 16) / 9, SCREEN_HEIGHT);

const STICKER_STYLES: { id: NutritionStickerStyle; labelKey: string }[] = [
    { id: 'summary', labelKey: 'share.styles.summary' },
    { id: 'weekly', labelKey: 'share.styles.weekly' },
    // Future styles
    // { id: 'simple', labelKey: 'share.styles.simple' },
];

export default function ShareNutritionScreen() {
    const params = useLocalSearchParams();
    const { t } = useTranslation();
    const rawData = params.data as string;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<NutritionStickerStyle>('summary');
    const [isCapturing, setIsCapturing] = useState(false);
    const [nutritionData, setNutritionData] = useState<NutritionStickerData | null>(null);
    const [showTargets, setShowTargets] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showMediaPicker, setShowMediaPicker] = useState(true);

    const captureViewRef = useRef<View>(null);
    const stickerRef = useRef<View>(null);

    // ... gestures ...
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const stickerScale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const handleGoBack = () => {
        router.navigate('/(tabs)/nutrition');
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                if (rawData) {
                    try {
                        const parsedData = JSON.parse(rawData);
                        setNutritionData(parsedData);
                    } catch (e) {
                        console.error('Error parsing nutrition data', e);
                        Alert.alert('Error', 'Datos de nutrición inválidos.');
                    }
                }
            } catch (error) {
                console.error('Error loading share data:', error);
                Alert.alert('Error', 'No se pudo cargar la información.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [rawData]);

    // Filtrar estilos disponibles según los datos
    const availableStyles = STICKER_STYLES.filter(style => {
        if (style.id === 'weekly') return nutritionData?.weeklyData && nutritionData.weeklyData.length > 0;
        return true;
    });

    // ... existing pickImage and handleShare ... 

    const handleMediaSelect = (uri: string, type: 'image' | 'video') => {
        if (type === 'video') {
            setSelectedVideo(uri);
            setSelectedImage(null);
        } else {
            setSelectedImage(uri);
            setSelectedVideo(null);
        }
        setShowMediaPicker(false);
    };

    const handleShare = async () => {
        try {
            setIsCapturing(true);
            await new Promise(resolve => setTimeout(resolve, 100));

            const PIXEL_RATIO = 3;

            // Opción Pro: Si hay video, compartimos nativamente a Instagram Stories
            if (selectedVideo && Platform.OS !== 'web') {
                try {
                    // Capturamos SOLO el sticker con transparencia
                    const stickerUri = await captureRef(stickerRef, {
                        format: 'png',
                        quality: 1,
                        result: 'data-uri', // Importante para Share
                    });

                    const { SocialShareService } = await import('../../src/services/socialShareService');
                    
                    await SocialShareService.shareToInstagramStories({
                        backgroundVideoUri: selectedVideo,
                        stickerImageUri: stickerUri,
                    });
                    
                    setIsCapturing(false);
                    return;
                } catch (socialError) {
                    console.error('Error sharing pro:', socialError);
                    // Fallback a expo-sharing si falla el modo pro
                }
            }

            // Fallback o modo imagen estándar
            const uri = await captureRef(captureViewRef, {
                format: 'png',
                quality: 1,
                width: CAPTURE_WIDTH * PIXEL_RATIO,
                height: CAPTURE_HEIGHT * PIXEL_RATIO,
            });

            setIsCapturing(false);

            if (uri) {
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error('Error sharing:', error);
            setIsCapturing(false);
            Alert.alert('Error', 'No se pudo generar el contenido para compartir.');
        }
    };

    // ... existing gestures ...
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            stickerScale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = stickerScale.value;
        });

    const composed = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: stickerScale.value },
        ],
    }));


    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD54A" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (!nutritionData) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white' }}>No data to share</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar hidden />

                <ShareMediaPicker
                    visible={showMediaPicker}
                    onClose={() => {
                        if (selectedImage || selectedVideo) {
                            setShowMediaPicker(false);
                        } else {
                            handleGoBack();
                        }
                    }}
                    onSelect={handleMediaSelect}
                />

                {/* Header Overlay */}
                {!isCapturing && (
                    <View style={styles.editHeader}>
                        <TouchableOpacity onPress={handleGoBack} style={styles.iconButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}>
                            <Ionicons name="options" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Capture Area */}
                <View
                    ref={captureViewRef}
                    collapsable={false}
                    style={styles.captureView}
                >
                    {/* Background Media */}
                    {selectedVideo ? (
                        <Video
                            source={{ uri: selectedVideo }}
                            style={styles.backgroundImage}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted
                        />
                    ) : selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.backgroundImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.defaultBackground} />
                    )}

                    {/* Draggable Sticker */}
                    <GestureDetector gesture={composed}>
                        <Animated.View
                            ref={stickerRef}
                            style={[
                                styles.stickerWrapper,
                                animatedStyle
                            ]}
                            collapsable={false}
                        >
                            <NutritionShareSticker
                                data={nutritionData}
                                style={selectedStyle}
                                showTargets={showTargets}
                            />
                        </Animated.View>
                    </GestureDetector>
                </View>

                {/* Controls */}
                {!isCapturing && (
                    <View style={styles.controls}>
                        <View style={styles.styleSelectorContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.styleSelectorContent}
                            >
                                {availableStyles.map((style) => (
                                    <TouchableOpacity
                                        key={style.id}
                                        style={[
                                            styles.styleButton,
                                            selectedStyle === style.id && styles.styleButtonActive
                                        ]}
                                        onPress={() => setSelectedStyle(style.id)}
                                    >
                                        <Text style={[
                                            styles.styleButtonText,
                                            selectedStyle === style.id && styles.styleButtonTextActive
                                        ]}>
                                            {t(style.labelKey, style.id === 'weekly' ? 'Semanal' : (style.id === 'summary' ? 'Resumen' : 'Simple'))}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.bottomRow}>
                            <TouchableOpacity
                                style={styles.changePhotoButton}
                                onPress={() => setShowMediaPicker(true)}
                            >
                                <Ionicons name="images-outline" size={24} color="#fff" />
                            </TouchableOpacity>

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
                                        <Text style={styles.shareButtonText}>{t('share.action', 'Compartir')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Drag Hint */}
                {!isCapturing && (
                    <View style={styles.dragHint}>
                        <Ionicons name="move" size={14} color="#666" />
                        <Text style={styles.dragHintText}>{t('share.dragHint', 'Arrastra y pellizca el sticker')}</Text>
                    </View>
                )}

                {/* Settings Modal */}
                {showSettings && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.settingsModal}>
                            <View style={styles.settingsHeader}>
                                <Text style={styles.settingsTitle}>{t('share.settings.title', 'Ajustes')}</Text>
                                <TouchableOpacity onPress={() => setShowSettings(false)}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('share.settings.showTargets', 'Mostrar Objetivos')}</Text>
                                <TouchableOpacity
                                    style={[styles.toggle, showTargets && styles.toggleActive]}
                                    onPress={() => setShowTargets(!showTargets)}
                                >
                                    <View style={[styles.toggleCircle, showTargets && styles.toggleCircleActive]} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 10,
    },
    editHeader: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureView: {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        backgroundColor: '#000',
        alignSelf: 'center',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
    },
    defaultBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1a1a1a',
    },
    stickerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    controls: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        gap: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        paddingBottom: 10,
    },
    styleSelectorContainer: {
        width: '100%',
        height: 50,
    },
    styleSelectorContent: {
        gap: 12,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    styleButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        height: 36,
        justifyContent: 'center',
    },
    styleButtonActive: {
        backgroundColor: 'rgba(255, 213, 74, 0.2)',
        borderColor: '#FFD54A',
    },
    styleButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#ffffff',
    },
    styleButtonTextActive: {
        color: '#FFD54A',
        fontWeight: '700',
    },
    bottomRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
        alignItems: 'center',
    },
    changePhotoButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
        backgroundColor: '#FFD54A',
    },
    shareButtonText: {
        fontWeight: '700',
        fontSize: 16,
        color: '#0a0a0a',
    },
    dragHint: {
        position: 'absolute',
        bottom: 150,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    dragHintText: {
        fontSize: 12,
        color: '#666',
    },
    // Settings Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    settingsModal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 24,
        width: '80%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#333',
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    settingLabel: {
        color: '#ddd',
        fontSize: 16,
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#333',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#FFD54A',
    },
    toggleCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFF',
    },
    toggleCircleActive: {
        transform: [{ translateX: 20 }],
    },
});
