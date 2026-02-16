import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// -----------------------------------------------------------------------------
// Interfaces y Tipos
// -----------------------------------------------------------------------------

export interface NutritionStickerData {
    calories: number;
    caloriesTarget: number;
    protein: number;
    proteinTarget: number;
    carbs: number;
    carbsTarget: number;
    fat: number;
    fatTarget: number;
    date: string;
    waterMl?: number;
    weeklyData?: {
        day: string;
        date: string;
        calories: number;
        caloriesTarget: number;
        protein: number;
        proteinTarget: number;
        carbs: number;
        carbsTarget: number;
        fat: number;
        fatTarget: number;
    }[];
}

export type NutritionStickerStyle = 'summary' | 'simple' | 'glass' | 'weekly';

interface NutritionShareStickerProps {
    data: NutritionStickerData;
    style?: NutritionStickerStyle;
    scale?: number;
    showTargets?: boolean;
}

// -----------------------------------------------------------------------------
// Componentes Auxiliares
// -----------------------------------------------------------------------------

const ProgressRing: React.FC<{
    radius: number;
    stroke: number;
    progress: number;
    color: string;
    bgColor?: string;
}> = ({ radius, stroke, progress, color, bgColor = 'rgba(255,255,255,0.1)' }) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);

    return (
        <View style={{ width: radius * 2, height: radius * 2, transform: [{ rotate: '-90deg' }] }}>
            <Svg height={radius * 2} width={radius * 2}>
                <Circle
                    stroke={bgColor}
                    strokeWidth={stroke}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <Circle
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </Svg>
        </View>
    );
};

// -----------------------------------------------------------------------------
// Estilos de Sticker
// -----------------------------------------------------------------------------

// --- Estilo 1: Resumen Diario (Rings) ---
const StickerSummary: React.FC<{ data: NutritionStickerData; showTargets?: boolean }> = ({ data, showTargets }) => {
    const calProgress = data.caloriesTarget > 0 ? data.calories / data.caloriesTarget : 0;
    const pProgress = data.proteinTarget > 0 ? data.protein / data.proteinTarget : 0;
    const cProgress = data.carbsTarget > 0 ? data.carbs / data.carbsTarget : 0;
    const fProgress = data.fatTarget > 0 ? data.fat / data.fatTarget : 0;

    return (
        <View style={stylesSummary.container}>
            <View style={stylesSummary.header}>
                <View>
                    <Text style={stylesSummary.title}>RESUMEN DEL DÍA</Text>
                    <Text style={stylesSummary.date}>{data.date}</Text>
                </View>
                {/* Brand removed as requested */}
            </View>

            <View style={stylesSummary.mainStats}>
                {/* Calorías (Ring Grande) */}
                <View style={stylesSummary.calContainer}>
                    <ProgressRing radius={50} stroke={8} progress={calProgress} color="#ffb300" />
                    <View style={stylesSummary.calTextContainer}>
                        <Text style={stylesSummary.calValue}>{Math.round(data.calories)}</Text>
                        <Text style={stylesSummary.calLabel}>kcal</Text>
                    </View>
                </View>

                {/* Macros */}
                <View style={stylesSummary.macrosContainer}>
                    {/* Protein */}
                    <View style={stylesSummary.macroItem}>
                        <Text style={[stylesSummary.macroLabel, { color: '#4CAF50' }]}>Prot</Text>
                        <ProgressRing radius={22} stroke={4} progress={pProgress} color="#4CAF50" />
                        <Text style={stylesSummary.macroValue}>
                            {Math.round(data.protein)}g{showTargets ? ` / ${Math.round(data.proteinTarget)}g` : ''}
                        </Text>
                    </View>
                    {/* Carbs */}
                    <View style={stylesSummary.macroItem}>
                        <Text style={[stylesSummary.macroLabel, { color: '#2196F3' }]}>Carb</Text>
                        <ProgressRing radius={22} stroke={4} progress={cProgress} color="#2196F3" />
                        <Text style={stylesSummary.macroValue}>
                            {Math.round(data.carbs)}g{showTargets ? ` / ${Math.round(data.carbsTarget)}g` : ''}
                        </Text>
                    </View>
                    {/* Fat */}
                    <View style={stylesSummary.macroItem}>
                        <Text style={[stylesSummary.macroLabel, { color: '#FF9800' }]}>Grasa</Text>
                        <ProgressRing radius={22} stroke={4} progress={fProgress} color="#FF9800" />
                        <Text style={stylesSummary.macroValue}>
                            {Math.round(data.fat)}g{showTargets ? ` / ${Math.round(data.fatTarget)}g` : ''}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Footer con target de calorías */}
            <View style={stylesSummary.footer}>
                <Text style={stylesSummary.footerText}>Objetivo: {Math.round(data.caloriesTarget)} kcal</Text>
            </View>
        </View>
    );
};

const stylesSummary = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderRadius: 20,
        padding: 20,
        width: 320, // Increased width slightly to accommodate targets
        borderWidth: 1,
        borderColor: 'rgba(255, 179, 0, 0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 10,
        color: '#ffb300',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    date: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    brandContainer: {
        // Removed
    },
    brand: {
        // Removed
    },
    mainStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    calContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calTextContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    calValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    calLabel: {
        fontSize: 10,
        color: '#aaa',
    },
    macrosContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginLeft: 16,
    },
    macroItem: {
        alignItems: 'center',
        gap: 6,
    },
    macroLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    macroValue: {
        fontSize: 10, // Reduced font size slightly to fit logic
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#888',
    }
});


// -----------------------------------------------------------------------------
// Componente Principal
// -----------------------------------------------------------------------------

const StickerWeekly: React.FC<{ data: NutritionStickerData }> = ({ data }) => {
    const weeklyData = data.weeklyData || [];
    const maxCalories = Math.max(...weeklyData.map(d => Math.max(d.calories, d.caloriesTarget)), 2000);

    return (
        <View style={stylesWeekly.container}>
            <View style={stylesWeekly.header}>
                <View>
                    <Text style={stylesWeekly.title}>RESUMEN SEMANAL</Text>
                    <Text style={stylesWeekly.date}>Últimos 7 días</Text>
                </View>
            </View>

            <View style={stylesWeekly.chartContainer}>
                {weeklyData.map((day, index) => {
                    const heightPercent = Math.min((day.calories / maxCalories) * 100, 100);
                    // Margen de 10% para considerar objetivo cumplido
                    const isTargetMet = day.calories >= day.caloriesTarget * 0.9 && day.calories <= day.caloriesTarget * 1.1;
                    // Verde si cumplió, Rojo si excedió, Amarillo si déficit (usando colores del tema)
                    // Ajuste: Amarillo (brand) para déficit, Verde para cumplido, Rojo para exceso
                    const barColor = isTargetMet ? '#4CAF50' : (day.calories > day.caloriesTarget * 1.1 ? '#FF6B6B' : '#ffb300');

                    return (
                        <View key={index} style={stylesWeekly.barGroup}>
                            <View style={stylesWeekly.barContainer}>
                                <View style={[stylesWeekly.bar, { height: `${heightPercent}%`, backgroundColor: barColor }]} />
                            </View>
                            <Text style={stylesWeekly.dayLabel}>{day.day}</Text>
                        </View>
                    );
                })}
            </View>

            <View style={stylesWeekly.legend}>
                <View style={stylesWeekly.legendItem}>
                    <View style={[stylesWeekly.legendColor, { backgroundColor: '#4CAF50' }]} />
                    <Text style={stylesWeekly.legendText}>Objetivo</Text>
                </View>
                <View style={stylesWeekly.legendItem}>
                    <View style={[stylesWeekly.legendColor, { backgroundColor: '#ffb300' }]} />
                    <Text style={stylesWeekly.legendText}>Déficit</Text>
                </View>
                <View style={stylesWeekly.legendItem}>
                    <View style={[stylesWeekly.legendColor, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={stylesWeekly.legendText}>Exceso</Text>
                </View>
            </View>
        </View>
    );
};

const stylesWeekly = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderRadius: 20,
        padding: 20,
        width: 320,
        borderWidth: 1,
        borderColor: 'rgba(255, 179, 0, 0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 10,
        color: '#ffb300',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    date: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    barGroup: {
        alignItems: 'center',
        flex: 1,
    },
    barContainer: {
        height: '100%',
        justifyContent: 'flex-end',
        width: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 6,
        minHeight: 4,
    },
    dayLabel: {
        marginTop: 8,
        color: '#aaa',
        fontSize: 10,
        fontWeight: '600',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendColor: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: '#888',
        fontSize: 10,
    }
});

const NutritionShareSticker: React.FC<NutritionShareStickerProps> = ({ data, style = 'summary', scale = 1, showTargets = false }) => {
    return (
        <View style={{ transform: [{ scale }] }}>
            {style === 'summary' && <StickerSummary data={data} showTargets={showTargets} />}
            {style === 'weekly' && <StickerWeekly data={data} />}
        </View>
    );
};

export default NutritionShareSticker;
