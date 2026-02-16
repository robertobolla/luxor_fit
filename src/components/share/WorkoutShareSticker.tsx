import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// -----------------------------------------------------------------------------
// Tipos de Datos
// -----------------------------------------------------------------------------

export interface WorkoutStickerData {
    planName: string;
    dayName?: string;
    durationWeeks: number;
    daysPerWeek: number;
    minPerSession: number;
    difficulty?: string;
    focus?: string;
    exercises?: any[];
}

export interface WorkoutStickerOptions {
    showPlanName: boolean;
    showDayName: boolean;
    showSets: boolean;
    showReps: boolean;
    showRir: boolean;
    showRest: boolean;
}

export type StickerStyle = 'routine' | 'glassmorphism' | 'card' | 'minimal';

interface WorkoutShareStickerProps {
    style: StickerStyle;
    data: WorkoutStickerData;
    options?: WorkoutStickerOptions;
}

// -----------------------------------------------------------------------------
// Componente Principal
// -----------------------------------------------------------------------------

const WorkoutShareSticker: React.FC<WorkoutShareStickerProps> = ({ style, data, options }) => {
    switch (style) {
        case 'routine':
            return <StickerRoutine data={data} options={options} />;
        case 'glassmorphism':
            return <StickerGlass data={data} options={options} />;
        case 'card':
            return <StickerCard data={data} options={options} />;
        case 'minimal':
            return <StickerMinimal data={data} options={options} />;
        default:
            return <StickerGlass data={data} options={options} />;
    }
};

export default WorkoutShareSticker;

// -----------------------------------------------------------------------------
// Sub-componentes de Estilo
// -----------------------------------------------------------------------------

// --- Estilo 0: Routine (Lista de ejercicios) ---
const StickerRoutine: React.FC<{ data: WorkoutStickerData; options?: WorkoutStickerOptions }> = ({ data, options }) => {
    const { t } = useTranslation();
    const exercises = data.exercises || [];
    const maxExercises = 8; // Límite para mostrar
    const displayExercises = exercises.slice(0, maxExercises);
    const hiddenCount = exercises.length - maxExercises;

    const showPlanName = options?.showPlanName ?? true;
    const showDayName = options?.showDayName ?? true;

    return (
        <View style={stylesRoutine.container}>
            {/* Header */}
            <View style={stylesRoutine.header}>
                {showPlanName && (
                    <Text style={stylesRoutine.planName} numberOfLines={1}>
                        {data.planName}
                    </Text>
                )}
                {showDayName && data.dayName && (
                    <Text style={stylesRoutine.dayName} numberOfLines={1}>
                        {data.dayName}
                    </Text>
                )}
            </View>

            {/* Exercise List */}
            <View style={stylesRoutine.listContainer}>
                {displayExercises.map((ex, index) => (
                    <View key={index} style={stylesRoutine.exerciseRow}>
                        <View style={stylesRoutine.exerciseNumberBox}>
                            <Text style={stylesRoutine.exerciseNumber}>{index + 1}</Text>
                        </View>
                        <View style={stylesRoutine.exerciseInfo}>
                            <Text style={stylesRoutine.exerciseName} numberOfLines={1}>{ex.name}</Text>
                            <View style={stylesRoutine.exerciseDetails}>
                                {options?.showSets && (
                                    <Text style={stylesRoutine.detailText}>{ex.sets} Series</Text>
                                )}
                                {options?.showSets && options?.showReps && <Text style={stylesRoutine.separator}>•</Text>}

                                {options?.showReps && (
                                    <Text style={stylesRoutine.detailText}>
                                        {Array.isArray(ex.reps) ? `${ex.reps[0] || '?'}` : ex.reps} Reps
                                    </Text>
                                )}

                                {options?.showRir && (ex.rir !== undefined || (ex.setTypes && ex.setTypes[0]?.rir !== undefined)) && (
                                    <>
                                        <Text style={stylesRoutine.separator}>•</Text>
                                        <Text style={stylesRoutine.detailText}>
                                            RIR {ex.rir ?? ex.setTypes?.[0]?.rir ?? '-'}
                                        </Text>
                                    </>
                                )}

                                {options?.showRest && ex.rest_seconds && (
                                    <>
                                        <Text style={stylesRoutine.separator}>•</Text>
                                        <Text style={stylesRoutine.detailText}>{ex.rest_seconds}s</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                ))}
                {hiddenCount > 0 && (
                    <Text style={stylesRoutine.moreText}>+ {hiddenCount} {t('common.more', 'más...')}</Text>
                )}
            </View>

            {/* Footer / Branding */}
            <View style={stylesRoutine.footer}>
                <Ionicons name="barbell" size={14} color="#FFD54A" style={{ marginRight: 6 }} />
                <Text style={stylesRoutine.brand}>LUXOR FITNESS</Text>
            </View>
        </View>
    );
};

const stylesRoutine = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        borderRadius: 24,
        padding: 24,
        width: 300,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 16,
    },
    planName: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    dayName: {
        fontSize: 14,
        color: '#FFD54A',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listContainer: {
        marginBottom: 20,
    },
    exerciseRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'center',
    },
    exerciseNumberBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    exerciseNumber: {
        color: '#FFD54A',
        fontSize: 12,
        fontWeight: 'bold',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    exerciseDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    detailText: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '500',
    },
    separator: {
        color: '#555',
        fontSize: 12,
        marginHorizontal: 6,
    },
    moreText: {
        color: '#888',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
        marginLeft: 36, // Align with text
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 16,
    },
    brand: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
});

// --- Estilo 1: Glassmorphism (Moderno y translúcido) ---
const StickerGlass: React.FC<{ data: WorkoutStickerData; options?: WorkoutStickerOptions }> = ({ data, options }) => {
    const { t } = useTranslation();
    const exercises = data.exercises || [];
    const maxExercises = 8;
    const displayExercises = exercises.slice(0, maxExercises);
    const hiddenCount = exercises.length - maxExercises;

    const showPlanName = options?.showPlanName ?? true;
    const showDayName = options?.showDayName ?? true;

    return (
        <View style={stylesGlass.container}>
            <View style={stylesGlass.header}>
                {showPlanName && (
                    <Text style={stylesGlass.planName} numberOfLines={1}>
                        {data.planName}
                    </Text>
                )}
                {showDayName && data.dayName && (
                    <Text style={stylesGlass.dayName} numberOfLines={1}>
                        {data.dayName}
                    </Text>
                )}
            </View>

            <View style={stylesGlass.listContainer}>
                {displayExercises.map((ex, index) => (
                    <View key={index} style={stylesGlass.exerciseRow}>
                        <View style={stylesGlass.exerciseInfo}>
                            <Text style={stylesGlass.exerciseName} numberOfLines={1}>{ex.name}</Text>
                            <View style={stylesGlass.exerciseDetails}>
                                {options?.showSets && (
                                    <Text style={stylesGlass.detailText}>{ex.sets || '-'}x</Text>
                                )}
                                {options?.showReps && (
                                    <Text style={stylesGlass.detailText}>
                                        {Array.isArray(ex.reps) ? `${ex.reps[0] || '?'}` : (ex.reps || '?')}
                                    </Text>
                                )}
                                {options?.showRir && (ex.rir !== undefined || (ex.setTypes && ex.setTypes[0]?.rir !== undefined)) && (
                                    <Text style={stylesGlass.detailText}>
                                        @RIR {ex.rir ?? ex.setTypes?.[0]?.rir ?? '-'}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                ))}
                {hiddenCount > 0 && (
                    <Text style={stylesGlass.moreText}>+ {hiddenCount}</Text>
                )}
            </View>

            <View style={stylesGlass.footer}>
                <Text style={stylesGlass.brand}>LUXOR FITNESS</Text>
            </View>
        </View>
    );
};

const stylesGlass = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 20,
        width: 280,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        // backdropFilter removed as it is not supported in RN
    },
    header: {
        marginBottom: 15,
        alignItems: 'center',
    },
    planName: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    dayName: {
        fontSize: 12,
        color: '#FFD54A',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    listContainer: {
        marginBottom: 10,
    },
    exerciseRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 4,
    },
    exerciseInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exerciseName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    exerciseDetails: {
        flexDirection: 'row',
        gap: 6,
    },
    detailText: {
        color: '#eee',
        fontSize: 12,
        fontWeight: '400',
    },
    moreText: {
        color: '#ccc',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
    },
    footer: {
        alignItems: 'center',
        marginTop: 8,
    },
    brand: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '700',
        letterSpacing: 2,
    },
    // Remnants removal
    iconContainer: {},
    statsRow: {},
    statItem: {},
    statValue: {},
    statLabel: {},
    divider: {},
});

// --- Estilo 2: Card (Detallado) ---
const StickerCard: React.FC<{ data: WorkoutStickerData; options?: WorkoutStickerOptions }> = ({ data, options }) => {
    const exercises = data.exercises || [];
    const maxExercises = 6;
    const displayExercises = exercises.slice(0, maxExercises);

    const showPlanName = options?.showPlanName ?? true;
    const showDayName = options?.showDayName ?? true;

    return (
        <View style={stylesCard.container}>
            <View style={stylesCard.header}>
                <View style={stylesCard.headerLeft}>
                    {showPlanName && <Text style={stylesCard.title} numberOfLines={1}>{data.planName}</Text>}
                    {showDayName && <Text style={stylesCard.subtitle}>{data.dayName}</Text>}
                </View>
                <Ionicons name="fitness" size={24} color="#1a1a1a" />
            </View>

            <View style={stylesCard.content}>
                {displayExercises.map((ex, index) => (
                    <View key={index} style={stylesCard.row}>
                        <View style={stylesCard.bullet} />
                        <Text style={stylesCard.exerciseText} numberOfLines={1}>
                            {ex.name}
                        </Text>
                        <View style={stylesCard.meta}>
                            {options?.showSets && <Text style={stylesCard.metaText}>{ex.sets || '-'}x</Text>}
                            {options?.showReps && <Text style={stylesCard.metaText}>{Array.isArray(ex.reps) ? (ex.reps[0] || '?') : (ex.reps || '?')}</Text>}
                        </View>
                    </View>
                ))}
            </View>

            <View style={stylesCard.footer}>
                <Text style={stylesCard.brand}>LUXOR FITNESS</Text>
            </View>
        </View>
    );
};

const stylesCard = StyleSheet.create({
    container: {
        backgroundColor: '#FFD54A',
        borderRadius: 16,
        padding: 16,
        width: 260,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        paddingBottom: 8,
    },
    headerLeft: {
        flex: 1,
    },
    subtitle: {
        fontSize: 10,
        color: '#1a1a1a',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 16,
        color: '#000',
        fontWeight: '900',
    },
    content: {
        gap: 6,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#000',
        marginRight: 6,
    },
    exerciseText: {
        flex: 1,
        color: '#000',
        fontSize: 13,
        fontWeight: '500',
    },
    meta: {
        flexDirection: 'row',
        gap: 4,
    },
    metaText: {
        color: '#333',
        fontSize: 11,
        fontWeight: '700',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        paddingTop: 8,
        alignItems: 'center',
    },
    brand: {
        fontSize: 8,
        color: '#000',
        fontWeight: '900',
        letterSpacing: 1,
    },
    // Remnants
    grid: {},
    gridItem: {},
    gridValue: {},
});

// --- Estilo 3: Minimal (Limpio) ---
const StickerMinimal: React.FC<{ data: WorkoutStickerData; options?: WorkoutStickerOptions }> = ({ data, options }) => {
    const exercises = data.exercises || [];
    const maxExercises = 10;
    const displayExercises = exercises.slice(0, maxExercises);

    const showPlanName = options?.showPlanName ?? true;
    const showDayName = options?.showDayName ?? true;

    return (
        <View style={stylesMin.container}>
            <View style={stylesMin.marker} />
            <View style={stylesMin.content}>
                {showPlanName && <Text style={stylesMin.title} numberOfLines={1}>{data.planName}</Text>}
                {showDayName && <Text style={stylesMin.subtitle}>{data.dayName}</Text>}

                <View style={stylesMin.list}>
                    {displayExercises.map((ex, index) => (
                        <Text key={index} style={stylesMin.item} numberOfLines={1}>
                            {ex.name}
                            {(options?.showSets || options?.showReps) && <Text style={stylesMin.dimmed}>
                                {' '}({options?.showSets ? (ex.sets || '-') + 'x' : ''}{options?.showReps ? (Array.isArray(ex.reps) ? (ex.reps[0] || '?') : (ex.reps || '?')) : ''})
                            </Text>}
                        </Text>
                    ))}
                </View>
                <Text style={stylesMin.brand}>LUXOR FITNESS</Text>
            </View>
        </View>
    );
};

const stylesMin = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.4)', // Slightly darkened for readability
        borderRadius: 8,
    },
    marker: {
        width: 3,
        backgroundColor: '#FFD54A',
        borderRadius: 1.5,
        marginRight: 12,
        height: '100%',
    },
    content: {
        justifyContent: 'center',
        width: 200,
    },
    title: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#FFD54A',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    list: {
        gap: 2,
        marginBottom: 8,
    },
    item: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
    },
    dimmed: {
        color: '#aaa',
    },
    brand: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
        marginTop: 4,
    },
    // Remnants
    leftBar: {},
    details: {},
});
