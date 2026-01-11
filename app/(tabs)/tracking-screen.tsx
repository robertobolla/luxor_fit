import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '@clerk/clerk-expo';
import { saveExercise } from '@/services/exerciseService';
import { useTranslation } from 'react-i18next';
import { useUnitsStore, conversions } from '../../src/store/unitsStore';

const { width, height } = Dimensions.get('window');

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function TrackingScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const { t } = useTranslation();
  const { distanceUnit } = useUnitsStore();
  
  // Helpers para conversión de unidades
  const displayDistance = (km: number) => distanceUnit === 'mi' ? conversions.kmToMi(km) : km;
  const displaySpeed = (kmh: number) => distanceUnit === 'mi' ? conversions.kmToMi(kmh) : kmh;
  const distanceLabel = distanceUnit === 'mi' ? 'mi' : 'km';
  const speedLabel = distanceUnit === 'mi' ? 'mph' : 'km/h';
  
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
  
  // Estados para modales
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStats, setSavedStats] = useState<{ time: string; distance: number; speed: number } | null>(null);

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
            
            // Solo sumar distancia si es mayor a 3 metros (filtrar ruido del GPS)
            if (dist > 0.003) { // 0.003 km = 3 metros
              totalDistance.current += dist;
              setDistance(totalDistance.current);
            }
          }
          
          // Actualizar velocidad (filtrar ruido del GPS - ignorar velocidades menores a 0.5 km/h)
          if (location.coords.speed !== null && location.coords.speed >= 0) {
            const speedKmh = location.coords.speed * 3.6;
            // Solo mostrar velocidad si es mayor a 0.5 km/h (el GPS tiene ruido cuando estás quieto)
            setCurrentSpeed(speedKmh > 0.5 ? speedKmh : 0);
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
  const handleFinish = () => {
    // Pausar el timer mientras se muestra el modal
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setShowFinishModal(true);
  };

  // Cancelar el modal y reanudar el timer
  const handleCancelFinish = () => {
    setShowFinishModal(false);
    // Reanudar el timer si no está pausado
    if (!isPaused) {
      timerInterval.current = setInterval(() => {
        setTrackingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleDiscard = () => {
    setShowFinishModal(false);
    stopGPSTracking();
    router.push('/(tabs)/workout' as any);
  };

  const handleSave = async () => {
    setShowFinishModal(false);
    setIsSaving(true);
    stopGPSTracking();
    setIsTracking(false);

    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const avgSpeed = trackingTime > 0 ? distance / (trackingTime / 3600) || 0 : 0;

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

      setIsSaving(false);

      if (result.success) {
        setSavedStats({
          time: formatTime(trackingTime),
          distance: distance,
          speed: avgSpeed,
        });
        setShowSuccessModal(true);
      } else {
        // En caso de error, mostrar modal de error
        setSavedStats(null);
        setShowSuccessModal(true);
      }
    } else {
      setIsSaving(false);
    }
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
<Text style={styles.pausedText}>
  {t('workout.status.paused')}
</Text>
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
          <Text style={styles.mainStatLabel}>
  {t('workout.stats.time')}
</Text>
        </View>

        {/* Estadísticas secundarias */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Ionicons name="navigate" size={20} color="#ffb300" />
            <Text style={styles.secondaryStatValue}>{displayDistance(distance).toFixed(2)}</Text>
            <Text style={styles.secondaryStatLabel}>{distanceLabel}</Text>
          </View>

          <View style={styles.secondaryStat}>
            <Ionicons name="speedometer" size={20} color="#ffb300" />
            <Text style={styles.secondaryStatValue}>{displaySpeed(currentSpeed).toFixed(1)}</Text>
            <Text style={styles.secondaryStatLabel}>{speedLabel}</Text>
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
  {isPaused ? t('common.resume') : t('common.pause')}
</Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.finishButton]}
          onPress={handleFinish}
        >
          <Ionicons name="stop" size={24} color="#ffffff" />
          <Text style={styles.controlButtonText}>{t('common.finish')}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Finalizar Entrenamiento */}
      <Modal
        visible={showFinishModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelFinish}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="flag" size={40} color="#ffb300" />
            </View>
            
            <Text style={styles.modalTitle}>{t('workout.finishWorkout.title')}</Text>
            <Text style={styles.modalMessage}>{t('workout.finishWorkout.message')}</Text>
            
            {/* Resumen del entrenamiento */}
            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryItem}>
                <Ionicons name="time" size={20} color="#ffb300" />
                <Text style={styles.modalSummaryValue}>{formatTime(trackingTime)}</Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Ionicons name="navigate" size={20} color="#ffb300" />
                <Text style={styles.modalSummaryValue}>
                  {displayDistance(distance).toFixed(2)} {distanceLabel}
                </Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Ionicons name="speedometer" size={20} color="#ffb300" />
                <Text style={styles.modalSummaryValue}>
                  {displaySpeed(trackingTime > 0 ? distance / (trackingTime / 3600) : 0).toFixed(1)} {speedLabel}
                </Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancelFinish}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonDiscard}
                onPress={handleDiscard}
              >
                <Ionicons name="trash" size={18} color="#f44336" />
                <Text style={styles.modalButtonDiscardText}>{t('workout.finishWorkout.discard')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={18} color="#1a1a1a" />
                <Text style={styles.modalButtonSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Guardando */}
      <Modal visible={isSaving} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.savingContainer}>
            <ActivityIndicator size="large" color="#ffb300" />
            <Text style={styles.savingText}>{t('common.saving')}...</Text>
          </View>
        </View>
      </Modal>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.push('/(tabs)/workout' as any);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {savedStats ? (
              <>
                <View style={[styles.modalIconContainer, styles.successIconContainer]}>
                  <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                </View>
                
                <Text style={styles.modalTitle}>{t('workout.finishWorkout.savedTitle')}</Text>
                <Text style={styles.modalMessage}>
                  {t('workout.finishWorkout.savedMessage', { activity: activityName.toLowerCase() })}
                </Text>
                
                {/* Resumen final */}
                <View style={styles.successSummary}>
                  <View style={styles.successSummaryRow}>
                    <View style={styles.successSummaryItem}>
                      <Ionicons name="time-outline" size={24} color="#ffb300" />
                      <Text style={styles.successSummaryLabel}>{t('workout.time')}</Text>
                      <Text style={styles.successSummaryValue}>{savedStats.time}</Text>
                    </View>
                    <View style={styles.successSummaryItem}>
                      <Ionicons name="navigate-outline" size={24} color="#ffb300" />
                      <Text style={styles.successSummaryLabel}>{t('dashboard.distance')}</Text>
                      <Text style={styles.successSummaryValue}>
                        {displayDistance(savedStats.distance).toFixed(2)} {distanceLabel}
                      </Text>
                    </View>
                    <View style={styles.successSummaryItem}>
                      <Ionicons name="speedometer-outline" size={24} color="#ffb300" />
                      <Text style={styles.successSummaryLabel}>{t('workout.avgSpeed')}</Text>
                      <Text style={styles.successSummaryValue}>
                        {displaySpeed(savedStats.speed).toFixed(1)} {speedLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.modalIconContainer, styles.errorIconContainer]}>
                  <Ionicons name="close-circle" size={50} color="#f44336" />
                </View>
                <Text style={styles.modalTitle}>{t('common.error')}</Text>
                <Text style={styles.modalMessage}>{t('workout.couldNotSaveWorkout')}</Text>
              </>
            )}
            
            <TouchableOpacity
              style={styles.modalButtonOk}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/(tabs)/workout' as any);
              }}
            >
              <Text style={styles.modalButtonOkText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Estilos de Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  errorIconContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalSummaryItem: {
    alignItems: 'center',
    gap: 6,
  },
  modalSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  modalButtonDiscard: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  modalButtonDiscardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  modalButtonSave: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalButtonSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  savingContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  savingText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  successSummary: {
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  successSummaryItem: {
    alignItems: 'center',
    gap: 6,
  },
  successSummaryLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  successSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalButtonOk: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    alignItems: 'center',
  },
  modalButtonOkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
