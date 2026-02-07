import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RoutePoint {
    latitude: number;
    longitude: number;
}

interface RoutePathSVGProps {
    routePoints: RoutePoint[];
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
}

const RoutePathSVG: React.FC<RoutePathSVGProps> = ({
    routePoints,
    width = 120,
    height = 120,
    strokeColor = '#FFD54A',
    strokeWidth = 3,
}) => {
    if (!routePoints || routePoints.length < 2) {
        return (
            <View style={[styles.container, { width, height }]}>
                <Text style={styles.noRoute}>Sin ruta</Text>
            </View>
        );
    }

    // Normalizar coordenadas al viewBox
    const lats = routePoints.map(p => p.latitude);
    const lons = routePoints.map(p => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;

    // Padding del 10%
    const padding = 0.1;
    const viewBoxSize = 100;
    const usableSize = viewBoxSize * (1 - 2 * padding);

    // Generar path SVG
    const pathData = routePoints.map((point, index) => {
        const x = ((point.longitude - minLon) / lonRange) * usableSize + viewBoxSize * padding;
        const y = viewBoxSize - (((point.latitude - minLat) / latRange) * usableSize + viewBoxSize * padding);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    return (
        <View style={[styles.container, { width, height }]}>
            <Svg width={width} height={height} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
                <Path
                    d={pathData}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    noRoute: {
        color: '#666',
        fontSize: 10,
    },
});

export default RoutePathSVG;
