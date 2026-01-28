import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { getExerciseById, Exercise } from '@/services/exerciseService';
import { useUnitsStore, conversions } from '../../src/store/unitsStore';

const { width, height } = Dimensions.get('window');

export default function ExerciseActivityDetailScreen() {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const exerciseId = params.exerciseId as string;
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  // Unidades
  const { distanceUnit } = useUnitsStore();
  const displayDistance = (km: number) => distanceUnit === 'mi' ? conversions.kmToMi(km) : km;
  const displaySpeed = (kmh: number) => distanceUnit === 'mi' ? kmh * 0.621371 : kmh; // Convertir km/h a mph
  const distanceLabel = distanceUnit === 'mi' ? 'mi' : 'km';
  const speedLabel = distanceUnit === 'mi' ? 'mph' : 'km/h';

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  const loadExercise = async () => {
    if (!exerciseId) return;
    setLoading(true);
    const data = await getExerciseById(exerciseId);
    setExercise(data);
    setLoading(false);
  };

  const formatTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}`;
    }
    return `${mins} min`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'running': return 'fitness';
      case 'walking': return 'walk';
      case 'cycling': return 'bicycle';
      case 'hiking': return 'trail-sign';
      case 'yoga': return 'heart-half-sharp';
      case 'calisthenics': return 'body';
      case 'soccer': return 'football';
      case 'custom': return 'star';
      default: return 'fitness';
    }
  };

  const getMapRegion = () => {
    if (!exercise?.route_points || exercise.route_points.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const points = exercise.route_points;
    const latitudes = points.map(p => p.latitude);
    const longitudes = points.map(p => p.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.3 || 0.01;
    const deltaLng = (maxLng - minLng) * 1.3 || 0.01;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.005),
      longitudeDelta: Math.max(deltaLng, 0.005),
    };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
        </View>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/exercise-detail' as any)}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      </View>
    );
  }

  const exerciseDate = new Date(exercise.date + 'T00:00:00');
  const formattedDate = exerciseDate.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  const hasRoute = exercise.route_points && exercise.route_points.length > 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/exercise-detail' as any)}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Ionicons name={getActivityIcon(exercise.activity_type) as any} size={24} color="#ffb300" />
          <Text style={styles.activityName}>{exercise.activity_name}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mapa */}
        <View style={styles.mapContainer}>
          {hasRoute ? (
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={getMapRegion()}
              showsUserLocation={false}
              showsMyLocationButton={false}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
              mapType="standard"
            >
              <Polyline
                coordinates={exercise.route_points!}
                strokeColor="#ffb300"
                strokeWidth={5}
              />
              
              {/* Punto de inicio */}
              <Marker
                coordinate={exercise.route_points![0]}
                title={t('common.start')}
                pinColor="#4CAF50"
              />
              
              {/* Punto final */}
              <Marker
                coordinate={exercise.route_points![exercise.route_points!.length - 1]}
                title={t('common.end')}
                pinColor="#f44336"
              />
            </MapView>
          ) : (
            <View style={styles.noMapContainer}>
              <Ionicons name="map-outline" size={60} color="#333" />
              <Text style={styles.noMapText}>
                {exercise.has_gps ? t('exerciseDetail.noRouteData') : t('exerciseDetail.manualActivity')}
              </Text>
            </View>
          )}
        </View>

        {/* Fecha */}
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Panel de estadísticas principal */}
        <View style={styles.mainStatsPanel}>
          {/* Tiempo */}
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>{formatTime(exercise.duration_minutes)}</Text>
            <Text style={styles.mainStatLabel}>{t('workout.stats.time')}</Text>
          </View>
        </View>

        {/* Estadísticas secundarias */}
        <View style={styles.statsGrid}>
          {/* Distancia */}
          {exercise.distance_km !== undefined && exercise.distance_km > 0 && (
            <View style={styles.statCard}>
              <Ionicons name="navigate-outline" size={24} color="#ffb300" />
              <Text style={styles.statValue}>
                {displayDistance(exercise.distance_km).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>{distanceLabel}</Text>
            </View>
          )}

          {/* Velocidad promedio */}
          {exercise.average_speed_kmh !== undefined && exercise.average_speed_kmh > 0 && (
            <View style={styles.statCard}>
              <Ionicons name="speedometer-outline" size={24} color="#ffb300" />
              <Text style={styles.statValue}>
                {displaySpeed(exercise.average_speed_kmh).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>{speedLabel}</Text>
            </View>
          )}

          {/* Desnivel positivo */}
          {exercise.elevation_gain !== undefined && exercise.elevation_gain > 0 && (
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{exercise.elevation_gain}</Text>
              <Text style={styles.statLabel}>m ↑</Text>
            </View>
          )}

          {/* Desnivel negativo */}
          {exercise.elevation_loss !== undefined && exercise.elevation_loss > 0 && (
            <View style={styles.statCard}>
              <Ionicons name="trending-down" size={24} color="#f44336" />
              <Text style={styles.statValue}>{exercise.elevation_loss}</Text>
              <Text style={styles.statLabel}>m ↓</Text>
            </View>
          )}
        </View>

        {/* Notas */}
        {exercise.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>{t('common.notes')}</Text>
            <Text style={styles.notesText}>{exercise.notes}</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0a0a0a',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: 16,
    height: height * 0.35,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffb300',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  noMapContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  noMapText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    textTransform: 'capitalize',
  },
  mainStatsPanel: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  mainStat: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#ffb300',
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: (width - 56) / 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  notesContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
