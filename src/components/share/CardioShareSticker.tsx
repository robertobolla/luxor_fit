import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import RoutePathSVG from './RoutePathSVG';

interface RoutePoint {
    latitude: number;
    longitude: number;
}

export interface CardioStickerData {
    activityType: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: string;
    elevation: number;
    routePoints: RoutePoint[];
    startTime?: string;
    date?: string;
    maxSpeed?: number;
}

export type StickerStyle = 'glassmorphism' | 'horizontal' | 'vertical' | 'minimal';

export type StatType = 'distance' | 'time' | 'pace' | 'elevation' | 'calories' |
    'avgSpeed' | 'maxSpeed' | 'startTime' | 'steps' | 'cadence' | 'date';

export const AVAILABLE_STATS: { id: StatType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'distance', label: 'Distancia', icon: 'navigate' },
    { id: 'time', label: 'Tiempo', icon: 'time' },
    { id: 'pace', label: 'Ritmo', icon: 'speedometer' },
    { id: 'elevation', label: 'Desnivel', icon: 'trending-up' },
    { id: 'calories', label: 'Calorías', icon: 'flame' },
    { id: 'avgSpeed', label: 'Vel. Promedio', icon: 'speedometer-outline' },
    { id: 'maxSpeed', label: 'Vel. Máxima', icon: 'flash' },
    { id: 'startTime', label: 'Hora Inicio', icon: 'alarm' },
    { id: 'steps', label: 'Pasos', icon: 'footsteps' },
    { id: 'cadence', label: 'Cadencia', icon: 'pulse' },
    { id: 'date', label: 'Fecha', icon: 'calendar' },
];

interface CardioShareStickerProps {
    style: StickerStyle;
    data: CardioStickerData;
    selectedStats?: StatType[];
}

const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
        case 'running': return 'walk';
        case 'walking': return 'footsteps';
        case 'cycling': return 'bicycle';
        default: return 'fitness';
    }
};

const getActivityLabel = (type: string): string => {
    switch (type) {
        case 'running': return 'Run';
        case 'walking': return 'Walk';
        case 'cycling': return 'Ride';
        default: return 'Workout';
    }
};

const calculateStats = (data: CardioStickerData) => {
    const durationParts = data.duration.split(':');
    const totalMinutes = durationParts.length === 3
        ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
        : parseInt(durationParts[0]);

    const paceMinKm = data.distance > 0 ? totalMinutes / data.distance : 0;
    const paceMin = Math.floor(paceMinKm);
    const paceSec = Math.round((paceMinKm - paceMin) * 60);

    const avgSpeed = data.distance > 0 && totalMinutes > 0
        ? (data.distance / (totalMinutes / 60)).toFixed(1)
        : '0.0';

    const steps = data.activityType === 'cycling'
        ? 0
        : Math.round(data.distance * 1300);

    const cadence = data.activityType === 'cycling'
        ? 0
        : totalMinutes > 0 ? Math.round(steps / totalMinutes) : 0;

    const calories = Math.round(data.distance * 60);

    return {
        pace: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
        avgSpeed,
        steps,
        cadence,
        calories,
    };
};

const getStatValue = (statId: StatType, data: CardioStickerData, calculated: ReturnType<typeof calculateStats>): { value: string; unit: string } => {
    switch (statId) {
        case 'distance': return { value: data.distance.toFixed(2), unit: 'km' };
        case 'time': return { value: data.duration, unit: '' };
        case 'pace': return { value: calculated.pace, unit: '/km' };
        case 'elevation': return { value: `${data.elevation}`, unit: 'm' };
        case 'calories': return { value: `${calculated.calories}`, unit: 'kcal' };
        case 'avgSpeed': return { value: calculated.avgSpeed, unit: 'km/h' };
        case 'maxSpeed': return { value: data.maxSpeed?.toFixed(1) || '0.0', unit: 'km/h' };
        case 'startTime': return { value: data.startTime || '08:00', unit: '' };
        case 'steps': return { value: `${calculated.steps}`, unit: '' };
        case 'cadence': return { value: `${calculated.cadence}`, unit: 'spm' };
        case 'date': return { value: data.date || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), unit: '' };
        default: return { value: '-', unit: '' };
    }
};

// Estilo 1: Glassmorphism Mini
const StickerGlassmorphism: React.FC<{ data: CardioStickerData }> = ({ data }) => (
    <View style={stylesGlass.container}>
        <Text style={stylesGlass.brand}>LUXOR FITNESS</Text>
        <View style={stylesGlass.routeIcon}>
            <RoutePathSVG routePoints={data.routePoints} width={24} height={24} strokeWidth={2} />
        </View>
        <Text style={stylesGlass.distance}>{data.distance.toFixed(1)} km</Text>
        <Text style={stylesGlass.stats}>{data.duration} • +{data.elevation}m</Text>
    </View>
);

const stylesGlass = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 26, 26, 0.85)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        minWidth: 100,
    },
    brand: { fontSize: 8, color: '#FFD54A', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
    routeIcon: { marginVertical: 4 },
    distance: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
    stats: { fontSize: 10, color: '#999' },
});

// Estilo 2: Barra Horizontal con estadísticas configurables
const StickerHorizontal: React.FC<{ data: CardioStickerData; selectedStats: StatType[] }> = ({ data, selectedStats }) => {
    const { t } = useTranslation();
    const calculated = calculateStats(data);
    const stats = selectedStats.slice(0, 4);

    return (
        <View style={stylesHoriz.container}>
            <View style={stylesHoriz.header}>
                <Text style={stylesHoriz.brand}>LUXOR FITNESS</Text>
                <View style={stylesHoriz.activityBadge}>
                    <Ionicons name={getActivityIcon(data.activityType)} size={12} color="#0a0a0a" />
                    <Text style={stylesHoriz.activityLabel}>{getActivityLabel(data.activityType)}</Text>
                </View>
            </View>
            <View style={stylesHoriz.content}>
                <View style={stylesHoriz.statsColumn}>
                    {stats.slice(0, 2).map((statId) => {
                        const { value, unit } = getStatValue(statId, data, calculated);
                        return (
                            <View key={statId} style={stylesHoriz.statItem}>
                                <Text style={stylesHoriz.statValue}>{value}</Text>
                                <Text style={stylesHoriz.statUnit}>{unit}</Text>
                                <Text style={stylesHoriz.statLabel}>{t(`share.stats.${statId}`)}</Text>
                            </View>
                        );
                    })}
                </View>
                <View style={stylesHoriz.statsColumn}>
                    {stats.slice(2, 4).map((statId) => {
                        const { value, unit } = getStatValue(statId, data, calculated);
                        return (
                            <View key={statId} style={stylesHoriz.statItem}>
                                <Text style={stylesHoriz.statValue}>{value}</Text>
                                <Text style={stylesHoriz.statUnit}>{unit}</Text>
                                <Text style={stylesHoriz.statLabel}>{t(`share.stats.${statId}`)}</Text>
                            </View>
                        );
                    })}
                </View>
                <View style={stylesHoriz.mapColumn}>
                    <View style={stylesHoriz.routeBox}>
                        <RoutePathSVG routePoints={data.routePoints} width={60} height={60} strokeWidth={2} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const stylesHoriz = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderRadius: 16,
        padding: 14,
        minWidth: 300,
        borderWidth: 1,
        borderColor: 'rgba(255, 213, 74, 0.3)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    brand: { fontSize: 10, color: '#FFD54A', fontWeight: '700', letterSpacing: 1 },
    activityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD54A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    activityLabel: { fontSize: 11, color: '#0a0a0a', fontWeight: '600' },
    content: {
        flexDirection: 'row',
        gap: 8,
    },
    statsColumn: {
        flex: 1,
        gap: 8,
    },
    statItem: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
    },
    statValue: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
    statUnit: { fontSize: 10, color: '#FFD54A', marginTop: 1 },
    statLabel: { fontSize: 8, color: '#666', textTransform: 'uppercase', marginTop: 2 },
    mapColumn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    routeBox: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 8,
    },
});

// Estilo 3: Tarjeta Vertical
const StickerVertical: React.FC<{ data: CardioStickerData }> = ({ data }) => (
    <View style={stylesVert.container}>
        <View style={stylesVert.header}>
            <Ionicons name={getActivityIcon(data.activityType)} size={16} color="#FFD54A" />
            <Text style={stylesVert.label}>{getActivityLabel(data.activityType)}</Text>
            <Text style={stylesVert.brand}>LUXOR</Text>
        </View>
        <View style={stylesVert.mapBox}>
            <RoutePathSVG routePoints={data.routePoints} width={90} height={70} strokeWidth={2.5} />
        </View>
        <Text style={stylesVert.distance}>{data.distance.toFixed(1)} km</Text>
        <View style={stylesVert.row}>
            <Ionicons name="time" size={14} color="#999" />
            <Text style={stylesVert.stat}>{data.duration}</Text>
            <Ionicons name="trending-up" size={14} color="#999" style={{ marginLeft: 10 }} />
            <Text style={stylesVert.stat}>+{data.elevation}m</Text>
        </View>
    </View>
);

const stylesVert = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        minWidth: 120,
        borderWidth: 1,
        borderColor: 'rgba(255, 213, 74, 0.3)',
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    label: { fontSize: 14, color: '#FFD54A', fontWeight: '600', flex: 1 },
    brand: { fontSize: 8, color: '#FFD54A', fontWeight: '600' },
    mapBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 8, marginBottom: 10 },
    distance: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center' },
    stat: { fontSize: 12, color: '#fff', marginLeft: 4 },
});

// Estilo 4: Minimalista (transparente)
const StickerMinimal: React.FC<{ data: CardioStickerData }> = ({ data }) => (
    <View style={stylesMin.container}>
        <RoutePathSVG routePoints={data.routePoints} width={70} height={70} strokeWidth={2.5} />
        <View style={stylesMin.stats}>
            <View style={stylesMin.activityRow}>
                <Ionicons name={getActivityIcon(data.activityType)} size={14} color="#FFD54A" />
                <Text style={stylesMin.activityLabel}>{getActivityLabel(data.activityType)}</Text>
            </View>
            <Text style={stylesMin.distance}>{data.distance.toFixed(1)} km</Text>
            <Text style={stylesMin.time}>{data.duration}</Text>
            <Text style={stylesMin.elevation}>+{data.elevation}m</Text>
        </View>
        <Text style={stylesMin.brand}>LUXOR FITNESS</Text>
    </View>
);

const stylesMin = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stats: { alignItems: 'flex-start' },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    activityLabel: { fontSize: 12, color: '#FFD54A', fontWeight: '600' },
    distance: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
    time: { fontSize: 14, color: '#fff' },
    elevation: { fontSize: 14, color: '#fff' },
    brand: { position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#FFD54A', fontWeight: '600' },
});

const CardioShareSticker: React.FC<CardioShareStickerProps> = ({ style, data, selectedStats = ['distance', 'time', 'pace', 'calories'] }) => {
    switch (style) {
        case 'glassmorphism': return <StickerGlassmorphism data={data} />;
        case 'horizontal': return <StickerHorizontal data={data} selectedStats={selectedStats} />;
        case 'vertical': return <StickerVertical data={data} />;
        case 'minimal': return <StickerMinimal data={data} />;
        default: return <StickerGlassmorphism data={data} />;
    }
};

export default CardioShareSticker;
