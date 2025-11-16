import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '@clerk/clerk-expo';
import { saveExercise } from '@/services/exerciseService';

const { width, height } = Dimensions.get('window');

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function TrackingScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  
  const activityName = params.activityName as string;
  const activityType = params.activityType as string;

  // Estados
  const [isTracking, setIsTracking] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [trackingTime, setTrackingTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  // Referencias
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const lastLocation = useRef<Location.LocationObject | null>(null);
  const totalDistance = useRef(0);
  const mapRef = useRef<MapView>(null);

  // Función para calcular distancia (Haversine)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Iniciar tracking GPS
  const startGPSTracking = async () => {
    try {
      // Iniciar timer
      timerInterval.current = setInterval(() => {
        setTrackingTime((prev) => prev + 1);
      }, 1000);

      // Iniciar tracking de ubicación
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (location) => {
          console.log('📍 Nueva ubicación:', location.coords);
          
          setCurrentLocation(location);
          
          // Agregar punto a la ruta
          const newPoint: RoutePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setRoutePoints((prev) => [...prev, newPoint]);
          
          // Calcular distancia si tenemos una ubicación previa
          if (lastLocation.current && !isPaused) {
            const dist = calculateDistance(
              lastLocation.current.coords.latitude,
              lastLocation.current.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            
            totalDistance.current += dist;
            setDistance(totalDistance.current);
          }
          
          // Actualizar velocidad
          if (location.coords.speed !== null && location.coords.speed >= 0) {
            const speedKmh = location.coords.speed * 3.6;
            setCurrentSpeed(speedKmh);
          }
          
          // Guardar ubicación actual
          lastLocation.current = location;
          
          // Centrar mapa en ubicación actual
          if (mapRef.current && location.coords) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 1000);
          }
        }
      );
      
      console.log('✅ Tracking GPS iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar tracking GPS:', error);
    }
  };

  // Detener tracking GPS
  const stopGPSTracking = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    console.log('🛑 Tracking GPS detenido');
  };

  // Pausar/Reanudar
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused) {
      // Pausar
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      console.log('⏸️ Tracking pausado');
    } else {
      // Reanudar
      timerInterval.current = setInterval(() => {
        setTrackingTime((prev) => prev + 1);
      }, 1000);
      console.log('▶️ Tracking reanudado');
    }
  };

  // Terminar entrenamiento
  const handleFinish = async () => {
    Alert.alert(
      'Terminar entrenamiento',
      '¿Deseas guardar este entrenamiento?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            stopGPSTracking();
            router.back();
          },
        },
        {
          text: 'Guardar',
          onPress: async () => {
            stopGPSTracking();
            setIsTracking(false);
            
            // Guardar en la base de datos
            if (user) {
              const today = new Date().toISOString().split('T')[0];
              const avgSpeed = trackingTime > 0 ? ((distance / (trackingTime / 3600)) || 0) : 0;
              
              const result = await saveExercise({
                user_id: user.id,
                activity_type: activityType,
                activity_name: activityName,
                date: today,
                duration_minutes: Math.ceil(trackingTime / 60),
                distance_km: distance,
                has_gps: true,
                average_speed_kmh: avgSpeed,
              });
              
              if (result.success) {
                Alert.alert(
                  '¡Guardado! ✅',
                  `Entrenamiento de ${activityName.toLowerCase()} guardado correctamente`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Error', 'No se pudo guardar el entrenamiento');
              }
            }
          },
        },
      ]
    );
  };

  // Formatear tiempo
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  // Iniciar tracking al montar
  useEffect(() => {
    startGPSTracking();
    
    return () => {
      stopGPSTracking();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Header con actividad */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="fitness" size={24} color="#ffb300" />
          <Text style={styles.activityName}>{activityName}</Text>
        </View>
        {isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>PAUSADO</Text>
          </View>
        )}
      </View>

      {/* Contenedor del Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.coords.latitude || 37.78825,
            longitude: currentLocation?.coords.longitude || -122.4324,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation
          mapType="standard"
        >
          {/* Ruta recorrida */}
          {routePoints.length > 1 && (
            <Polyline
              coordinates={routePoints}
              strokeColor="#ffb300"
              strokeWidth={5}
            />
          )}
          
          {/* Punto de inicio */}
          {routePoints.length > 0 && (
            <Marker
              coordinate={routePoints[0]}
              title="Inicio"
              pinColor="#ffb300"
            />
          )}
        </MapView>
      </View>

      {/* Panel de estadísticas */}
      <View style={styles.statsPanel}>
        {/* Estadística principal: Tiempo */}
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{formatTime(trackingTime)}</Text>
          <Text style={styles.mainStatLabel}>Tiempo</Text>
        </View>

        {/* Estadísticas secundarias */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Ionicons name="navigate" size={20} color="#ffb300" />
            <Text style={styles.secondaryStatValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.secondaryStatLabel}>km</Text>
          </View>

          <View style={styles.secondaryStat}>
            <Ionicons name="speedometer" size={20} color="#ffb300" />
            <Text style={styles.secondaryStatValue}>{currentSpeed.toFixed(1)}</Text>
            <Text style={styles.secondaryStatLabel}>km/h</Text>
          </View>

          <View style={styles.secondaryStat}>
            <Ionicons name="analytics" size={20} color="#ffb300" />
            <Text style={styles.secondaryStatValue}>
              {trackingTime > 0 ? ((distance / (trackingTime / 3600)) || 0).toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.secondaryStatLabel}>prom</Text>
          </View>
        </View>
      </View>

      {/* Botones de control */}
      <View style={styles.controlsPanel}>
        <TouchableOpacity
          style={[styles.controlButton, styles.pauseButton]}
          onPress={handlePauseResume}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={24}
            color="#ffffff"
          />
          <Text style={styles.controlButtonText}>
            {isPaused ? 'Reanudar' : 'Pausar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.finishButton]}
          onPress={handleFinish}
        >
          <Ionicons name="stop" size={24} color="#ffffff" />
          <Text style={styles.controlButtonText}>Terminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mapContainer: {
    marginTop: 100,
    marginHorizontal: 20,
    height: height * 0.35, // 35% de la altura de la pantalla
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffb300',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  pausedBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsPanel: {
    marginTop: 15,
    marginHorizontal: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 20,
    padding: 16,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#999',
    marginTop: 2,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  secondaryStat: {
    alignItems: 'center',
    gap: 4,
  },
  secondaryStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryStatLabel: {
    fontSize: 12,
    color: '#999',
  },
  controlsPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  finishButton: {
    backgroundColor: '#f44336',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
