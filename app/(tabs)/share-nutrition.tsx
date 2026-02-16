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
    const [selectedStyle, setSelectedStyle] = useState<NutritionStickerStyle>('summary');
    const [isCapturing, setIsCapturing] = useState(false);
    const [nutritionData, setNutritionData] = useState<NutritionStickerData | null>(null);
    const [showTargets, setShowTargets] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const captureViewRef = useRef<View>(null);

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

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleShare = async () => {
        try {
            setIsCapturing(true);
            await new Promise(resolve => setTimeout(resolve, 100));

            const uri = await captureRef(captureViewRef, {
                format: 'png',
                quality: 0.9,
                width: CAPTURE_WIDTH,
                height: CAPTURE_HEIGHT,
            });

            setIsCapturing(false);

            if (uri) {
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error('Error sharing:', error);
            setIsCapturing(false);
            Alert.alert('Error', 'No se pudo generar la imagen para compartir.');
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
                <StatusBar barStyle="light-content" hidden={isCapturing} />

                {/* Header */}
                <View style={[styles.header, { top: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{t('share.title', 'Compartir')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}>
                        <Ionicons name="settings-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Capture Area */}
                <View
                    ref={captureViewRef}
                    collapsable={false}
                    style={[styles.captureContainer, { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT }]}
                >
                    {/* Background Image */}
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.backgroundImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.defaultBackground} />
                    )}

                    {/* Draggable Sticker */}
                    <GestureDetector gesture={composed}>
                        <Animated.View
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

                <View style={styles.controls}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleSelector}>
                        {availableStyles.map((style) => (
                            <TouchableOpacity
                                key={style.id}
                                style={[
                                    styles.styleOption,
                                    selectedStyle === style.id && styles.styleOptionSelected
                                ]}
                                onPress={() => setSelectedStyle(style.id)}
                            >
                                <Text style={[
                                    styles.styleOptionText,
                                    selectedStyle === style.id && styles.styleOptionTextSelected
                                ]}>
                                    {t(style.labelKey, style.id === 'weekly' ? 'Semanal' : (style.id === 'summary' ? 'Resumen' : 'Simple'))}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                            <Ionicons name="image-outline" size={24} color="#FFF" />
                            <Text style={styles.buttonText}>{t('share.changeBackground', 'Fondo')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                            <Text style={styles.shareButtonText}>{t('share.action', 'Compartir')}</Text>
                            <Ionicons name="share-social" size={20} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Settings Modal */}
                {showSettings && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.settingsModal}>
                            <View style={styles.settingsHeader}>
                                <Text style={styles.settingsTitle}>{t('share.settings.title', 'Ajustes')}</Text>
                                <TouchableOpacity onPress={() => setShowSettings(false)}>
                                    <Ionicons name="close" size={24} color="#FFF" />
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
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 10,
    },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    captureContainer: {
        backgroundColor: '#111',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    defaultBackground: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a', // Dark grey default
        position: 'absolute',
    },
    stickerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    styleSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    styleOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444',
    },
    styleOptionSelected: {
        backgroundColor: '#ffb300',
        borderColor: '#ffb300',
    },
    styleOptionText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
    },
    styleOptionTextSelected: {
        color: '#000',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    imageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#333',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffb300', // Primary Gold
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    shareButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Settings Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    settingsModal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
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
        color: '#FFF',
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
        backgroundColor: '#ffb300',
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
