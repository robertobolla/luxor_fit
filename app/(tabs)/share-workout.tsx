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
    Image,
    Switch,
    Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/services/supabase';
import WorkoutShareSticker, { WorkoutStickerData, StickerStyle } from '../../src/components/share/WorkoutShareSticker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CAPTURE_WIDTH = SCREEN_WIDTH;
const CAPTURE_HEIGHT = Math.min((SCREEN_WIDTH * 16) / 9, SCREEN_HEIGHT);

const STICKER_STYLES: { id: StickerStyle; labelKey: string }[] = [
    { id: 'routine', labelKey: 'share.styles.routine' },
    { id: 'glassmorphism', labelKey: 'share.styles.glass' },
    { id: 'card', labelKey: 'share.styles.card' },
    { id: 'minimal', labelKey: 'share.styles.min' },
];

export default function ShareWorkoutScreen() {
    const params = useLocalSearchParams();
    const { t } = useTranslation();
    const planId = params.planId as string;
    const dayDataSource = params.dayDataSource as string;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<StickerStyle>('routine');
    const [isCapturing, setIsCapturing] = useState(false);
    const [planData, setPlanData] = useState<WorkoutStickerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Settings State
    const [showPlanName, setShowPlanName] = useState(true);
    const [showDayName, setShowDayName] = useState(true);
    const [showSets, setShowSets] = useState(true);
    const [showReps, setShowReps] = useState(true);
    const [showRir, setShowRir] = useState(true);
    const [showRest, setShowRest] = useState(false);

    const captureViewRef = useRef<View>(null);

    // Gestos para el sticker
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const stickerScale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const handleGoBack = () => {
        router.back();
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                let exercises: any[] = [];
                let dayName = '';

                // 1. Intentar cargar datos del día pasados por parámetro (prioridad)
                if (dayDataSource) {
                    try {
                        const parsedDayData = JSON.parse(dayDataSource);
                        exercises = parsedDayData.exercises || [];
                        dayName = parsedDayData.name || '';
                        // Si viene planName en el dataSource, usarlo
                        if (parsedDayData.planName) {
                            setPlanData({
                                planName: parsedDayData.planName,
                                dayName,
                                durationWeeks: 4,
                                daysPerWeek: 3,
                                minPerSession: 45,
                                exercises: exercises
                            });
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing dayDataSource', e);
                    }
                }

                // 2. Cargar datos del plan (nombre, duración, etc.)
                let planName = 'Mi Plan';
                let duration = 4;
                let days = 3;
                let min = 45;

                if (planId && planId !== 'custom') {
                    const { data, error } = await supabase
                        .from('workout_plans')
                        .select('*')
                        .eq('id', planId)
                        .single();

                    if (!error && data) {
                        planName = data.plan_name || 'Mi Plan';

                        let details: any = data.plan_data;
                        if (typeof details === 'string') {
                            try { details = JSON.parse(details); } catch (e) { }
                        }

                        duration = Number(details?.duration_weeks || (data as any).duration_weeks || 4);

                        if (details?.days_per_week) days = Number(details.days_per_week);
                        else if ((data as any).days_per_week) days = Number((data as any).days_per_week);
                        else if (Array.isArray(details?.weekly_structure)) days = details.weekly_structure.length;

                        min = details?.weekly_structure?.[0]?.duration || 45;
                    }
                }

                setPlanData({
                    planName,
                    dayName,
                    durationWeeks: duration,
                    daysPerWeek: days,
                    minPerSession: min,
                    exercises: exercises
                });

            } catch (error) {
                console.error('Error loading share data:', error);
                Alert.alert('Error', 'No se pudo cargar la información.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [planId, dayDataSource]);

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

    // Gestos corregidos con memoria
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

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: stickerScale.value }
        ]
    }));

    if (isLoading || !planData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD54A" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" hidden={isCapturing} />

                {/* Header Overlay */}
                {!isCapturing && (
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            onPress={() => setShowSettings(true)}
                            style={styles.headerButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-sharp" size={24} color="#fff" />
                        </TouchableOpacity>

                    </View>
                )}

                {/* Capture Area */}
                <View ref={captureViewRef} style={[styles.captureArea, { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT }]}>
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.backgroundImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.defaultBackground} />
                    )}

                    <GestureDetector gesture={composedGesture}>
                        <Animated.View style={[styles.stickerContainer, animatedStyle]}>
                            <WorkoutShareSticker
                                style={selectedStyle}
                                data={planData}
                                options={{
                                    showPlanName,
                                    showDayName,
                                    showSets,
                                    showReps,
                                    showRir,
                                    showRest
                                }}
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
                                {STICKER_STYLES.map((s) => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[
                                            styles.styleOption,
                                            selectedStyle === s.id && styles.styleOptionSelected
                                        ]}
                                        onPress={() => setSelectedStyle(s.id)}
                                    >
                                        <Text style={[
                                            styles.styleText,
                                            selectedStyle === s.id && styles.styleTextSelected
                                        ]}>
                                            {t(s.labelKey, s.id.toUpperCase())}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.bottomRow}>
                            <TouchableOpacity
                                style={styles.changePhotoButton}
                                onPress={() => pickImage()}
                            >
                                <Ionicons name="images-outline" size={24} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.shareButton} onPress={handleShare} disabled={isCapturing}>
                                {isCapturing ? (
                                    <ActivityIndicator color="#0a0a0a" />
                                ) : (
                                    <>
                                        <Ionicons name="share-outline" size={24} color="#0a0a0a" />
                                        <Text style={styles.shareButtonText}>{t('share.action', 'Compartir')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View >
                )
                }

                {/* Settings Modal */}
                <Modal
                    visible={showSettings}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowSettings(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('share.settings.title', 'Ajustes del Sticker')}</Text>
                                <TouchableOpacity onPress={() => setShowSettings(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showPlanName', 'Mostrar Nombre del Plan')}</Text>
                                    <Switch value={showPlanName} onValueChange={setShowPlanName} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showPlanName ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showDayName', 'Mostrar Nombre del Día')}</Text>
                                    <Switch value={showDayName} onValueChange={setShowDayName} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showDayName ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showSets', 'Mostrar Series')}</Text>
                                    <Switch value={showSets} onValueChange={setShowSets} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showSets ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showReps', 'Mostrar Repeticiones')}</Text>
                                    <Switch value={showReps} onValueChange={setShowReps} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showReps ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showRir', 'Mostrar Intensidad (RIR)')}</Text>
                                    <Switch value={showRir} onValueChange={setShowRir} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showRir ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>{t('share.settings.showRest', 'Mostrar Descanso')}</Text>
                                    <Switch value={showRest} onValueChange={setShowRest} trackColor={{ false: '#333', true: '#FFD54A' }} thumbColor={showRest ? '#000' : '#f4f3f4'} />
                                </View>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View >
        </GestureHandlerRootView >
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
    // New Header Overlay Style because absolute positioning in capture area makes it hard
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        zIndex: 100, // Ensure it's above everything
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Remove old header styles or keep for reference? removing to avoid confusion
    captureArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
    },
    defaultBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#111',
    },
    patternDot: {
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#FFD54A',
        opacity: 0.1,
        position: 'absolute',
        top: -50,
        right: -50,
    },
    stickerContainer: {
        zIndex: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    watermark: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 30, // Ajustado para dar espacio
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        zIndex: 90,
    },
    styleSelectorContainer: {
        width: '100%',
        height: 50,
        marginBottom: 10, // Más cerca de los botones (más abajo)
    },
    styleSelectorContent: {
        gap: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    styleOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        height: 36,
        justifyContent: 'center',
    },
    styleOptionSelected: {
        backgroundColor: '#FFD54A',
        borderColor: '#FFD54A',
    },
    styleText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    styleTextSelected: {
        color: '#000',
        fontWeight: '700',
    },
    bottomRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between', // Separados
        alignItems: 'center',
    },
    changePhotoButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    shareButton: {
        height: 50,
        backgroundColor: '#FFD54A',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 8,
    },
    shareButtonText: {
        color: '#0a0a0a',
        fontSize: 16,
        fontWeight: 'bold',
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
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingLabel: {
        color: '#fff',
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 12,
    },
});
