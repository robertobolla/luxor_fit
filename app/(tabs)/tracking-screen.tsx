import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DeviceEventEmitter, Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { saveExercise } from '@/services/exerciseService';
import { useTranslation } from 'react-i18next';
import { useUnitsStore, conversions } from '../../src/store/unitsStore';

const { width, height } = Dimensions.get('window');

interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
}

const LOCATION_TASK_NAME = 'background-location-task';

// Definir la tarea en segundo plano fuera del componente
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Error en background task:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    // Emitir evento para que el componente lo reciba si está montado
    // Nota: En producción idealmente se guardaría en SQLite/AsyncStorage
    // pero para este fix rápido usamos eventos.
    DeviceEventEmitter.emit('onLocationUpdate', locations);
  }
});

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

  // Estado de la pantalla: 'tracking' | 'confirm' | 'saving' | 'success' | 'error'
  type ScreenState = 'tracking' | 'confirm' | 'saving' | 'success' | 'error';
  const [screenState, setScreenState] = useState<ScreenState>('tracking');

  // Estados de tracking
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [trackingTime, setTrackingTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [savedStats, setSavedStats] = useState<{ time: string; distance: number; speed: number } | null>(null);
  const [savedExerciseId, setSavedExerciseId] = useState<string | null>(null);

  // Referencias
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const lastLocation = useRef<Location.LocationObject | null>(null);
  const totalDistance = useRef(0);
  const mapRef = useRef<MapView>(null);
  const locationCount = useRef(0); // Contador de ubicaciones recibidas
  const gpsStabilized = useRef(false); // Indica si el GPS ya está estable
  const isStopped = useRef(false); // Para evitar actualizaciones después de detener
  const isSavingRef = useRef(false); // Para evitar doble-clicks
  const elevationGain = useRef(0); // Desnivel positivo acumulado
  const elevationLoss = useRef(0); // Desnivel negativo acumulado
  const lastAltitude = useRef<number | null>(null); // Última altitud registrada

  // Referencias para el cálculo robusto del tiempo
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0); // Tiempo acumulado antes de la última pausa
  const lastPauseTimeRef = useRef<number | null>(null);

  // Función para resetear y comenzar tracking
  const resetAndStartTracking = useCallback(() => {
    // Detener cualquier tracking anterior
    stopGPSTracking();

    // Resetear todos los estados a sus valores iniciales
    setScreenState('tracking');
    setIsPaused(false);
    setDistance(0);
    setTrackingTime(0);
    setCurrentSpeed(0);
    setRoutePoints([]);
    setCurrentLocation(null);
    setSavedStats(null);
    setSavedExerciseId(null);
    isSavingRef.current = false;
    isStopped.current = false;
    totalDistance.current = 0;
    locationCount.current = 0;
    gpsStabilized.current = false;
    lastLocation.current = null;
    elevationGain.current = 0;
    elevationLoss.current = 0;
    lastAltitude.current = null;

    // Resetear referencias de tiempo
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = null;

    // Iniciar nuevo tracking
    startGPSTracking();
  }, []);

  // Resetear estados cada vez que la pantalla obtiene foco
  useFocusEffect(
    useCallback(() => {
      resetAndStartTracking();

      return () => {
        // Limpieza al perder foco
        stopGPSTracking();
      };
    }, [resetAndStartTracking])
  );

  // Constantes para filtrado de GPS
  const MIN_ACCURACY_METERS = 20; // Precisión mínima aceptable
  const MIN_DISTANCE_METERS = 5; // Distancia mínima para contar (5 metros)
  const WARMUP_LOCATIONS = 3; // Número de ubicaciones a ignorar al inicio para estabilizar GPS
  const MIN_SPEED_KMH = 0.5; // Velocidad mínima para mostrar (evitar ruido cuando quieto)

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

  // Efecto para escuchar actualizaciones de ubicación desde la tarea en segundo plano
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onLocationUpdate', (locations: Location.LocationObject[]) => {
      // Procesar ubicaciones recibidas del background task
      // Esto funciona similar al callback de watchPositionAsync pero desacoplado
      locations.forEach(location => {
        handleNewLocation(location);
      });
    });

    return () => {
      subscription.remove();
    };
  }, []); // Se ejecuta una vez al montar

  // Lógica extractada para procesar una nueva ubicación
  const handleNewLocation = (location: Location.LocationObject) => {
    // Ignorar actualizaciones si el tracking está detenido o pausado
    // Nota: En background real, isStopped es false, pero isPaused podría ser true.
    // Si isPaused es true, ignoramos la data (o la guardamos pero no sumamos distancia)
    if (isStopped.current) return;

    // Si está pausado, no procesamos (ahorro batería logic handled by stopUpdates?)
    // Si queremos "hot resume", seguimos recibiendo pero no sumamos.
    if (isPaused) return;

    locationCount.current += 1;
    const accuracy = location.coords.accuracy || 999;

    // Filtro 1: Verificar precisión del GPS
    if (accuracy > MIN_ACCURACY_METERS) {
      return;
    }

    // Filtro 2: Período de calentamiento del GPS
    if (locationCount.current <= WARMUP_LOCATIONS) {
      setCurrentLocation(location);
      if (locationCount.current === WARMUP_LOCATIONS) {
        lastLocation.current = location;
        gpsStabilized.current = true;
        lastAltitude.current = location.coords.altitude || null;
        setRoutePoints([{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude || undefined,
        }]);
      }
      if (mapRef.current && !isStopped.current) {
        // Animar mapa solo si la app está activa (el ref existe)
        // En background esto simplemente no hará nada o lanzará warning safe
        try {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        } catch (e) { /* ignore */ }
      }
      return;
    }

    setCurrentLocation(location);

    // Calcular desnivel
    const currentAltitude = location.coords.altitude;
    if (currentAltitude !== null && currentAltitude !== undefined && lastAltitude.current !== null) {
      const altitudeDiff = currentAltitude - lastAltitude.current;
      if (Math.abs(altitudeDiff) > 1) {
        if (altitudeDiff > 0) {
          elevationGain.current += altitudeDiff;
        } else {
          elevationLoss.current += Math.abs(altitudeDiff);
        }
      }
      lastAltitude.current = currentAltitude;
    } else if (currentAltitude !== null && currentAltitude !== undefined) {
      lastAltitude.current = currentAltitude;
    }

    // Agregar punto a la ruta
    const newPoint: RoutePoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: currentAltitude || undefined,
    };
    setRoutePoints((prev) => [...prev, newPoint]);

    // Calcular distancia
    if (lastLocation.current && gpsStabilized.current) {
      const dist = calculateDistance(
        lastLocation.current.coords.latitude,
        lastLocation.current.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      const distMeters = dist * 1000;

      if (distMeters >= MIN_DISTANCE_METERS) {
        const timeDiff = (location.timestamp - (lastLocation.current?.timestamp || location.timestamp)) / 1000;
        // Evitar saltos irreales de velocidad (ej: > 50km/h corriendo)
        const impliedSpeedKmh = timeDiff > 0 ? (dist / timeDiff) * 3600 : 0;

        if (impliedSpeedKmh < 50) {
          totalDistance.current += dist;
          setDistance(totalDistance.current);
        }
      }
    }

    // Actualizar velocidad
    if (location.coords.speed !== null && location.coords.speed >= 0) {
      const speedKmh = location.coords.speed * 3.6;
      setCurrentSpeed(speedKmh > MIN_SPEED_KMH ? speedKmh : 0);
    }

    lastLocation.current = location;

    if (mapRef.current && location.coords && !isStopped.current) {
      try {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      } catch (e) { /* ignore */ }
    }
  };

  // Iniciar tracking GPS
  const startGPSTracking = async () => {
    try {
      // Resetear contadores y flags
      if (isStopped.current) {
        isStopped.current = false;
      }

      // Iniciar timer visual
      if (!timerInterval.current) {
        timerInterval.current = setInterval(() => {
          if (isStopped.current || isPaused) return;

          if (startTimeRef.current) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000);
            setTrackingTime(elapsedSeconds);
          }
        }, 1000);
      }

      // 1. Pedir permisos de Background Location si no se tienen
      // Nota: En Android primero se pide Foreground, luego Background.
      // expo-location maneja esto si se configuró en app.json, pero requestBackgroundPermissionsAsync ayuda.
      const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
      if (foreStatus !== 'granted') {
        console.error('❌ Permiso de ubicación foreground denegado');
        return;
      }

      const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backStatus !== 'granted') {
        console.warn('⚠️ Permiso de ubicación background denegado. El tracking podría detenerse al bloquear el teléfono.');
      } else {
        console.log('✅ Permiso background concedido');
      }

      // 2. Verificar si la tarea ya está corriendo y detenerla para reiniciar limpio
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // 3. Iniciar actualizaciones en Segundo Plano
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
        // Configuración Android Foreground Service
        foregroundService: {
          notificationTitle: "Entrenamiento en curso",
          notificationBody: "Rastreando tu ubicación en segundo plano...",
          notificationColor: "#ffb300",
        },
        // Configuración iOS
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      });

      console.log('✅ Tracking GPS iniciado (Background Mode)');
    } catch (error) {
      console.error('❌ Error al iniciar tracking GPS:', error);
    }
  };

  // Detener tracking GPS
  const stopGPSTracking = async () => {
    isStopped.current = true;

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.error('Error deteniendo actualizaciones de ubicación:', error);
    }

    // Ya no usamos locationSubscription con startLocationUpdatesAsync
    // pero por si acaso limpiamos si quedó algo
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    console.log('🛑 Tracking GPS detenido');
  };

  // Pausar/Reanudar
  const handlePauseResume = () => {
    if (!isPaused) {
      // PAUSAR
      setIsPaused(true);
      lastPauseTimeRef.current = Date.now();

      // Detener actualizaciones de ubicación para ahorrar batería
      // aunque si se quiere "hot resume" rápido, se podría dejar corriendo
      // pero para evitar que el task siga emitiendo y gastando, lo paramos.
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then(started => {
        if (started) Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      });

      console.log('⏸️ Tracking pausado');
    } else {
      // REANUDAR
      setIsPaused(false);
      if (lastPauseTimeRef.current) {
        const pauseDuration = Date.now() - lastPauseTimeRef.current;
        pausedTimeRef.current += pauseDuration;
        lastPauseTimeRef.current = null;
      }

      // Reiniciar actualizaciones
      startGPSTracking();

      console.log('▶️ Tracking reanudado');
    }
  };

  // Terminar entrenamiento
  const handleFinish = () => {
    // Detener timer visual
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    // No detenemos GPS aún por si cancela, pero isStopped visualmente 'freezes'
    // Actually, we should allow resume. 
    // Let's just switch state. The background timer/gps logic checks screenState?
    // Current implement checks isStopped. 
    // We'll set isStopped to true to freeze data collection while confirming.
    isStopped.current = true;
    setScreenState('confirm');
  };

  // Cancelar y volver a tracking
  const handleCancelFinish = () => {
    isStopped.current = false; // Re-enable tracking
    setScreenState('tracking');
    // Restart timer loop
    timerInterval.current = setInterval(() => {
      if (isStopped.current || isPaused) return;
      if (startTimeRef.current) {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000);
        setTrackingTime(elapsedSeconds);
      }
    }, 1000);
  };

  const handleDiscard = () => {
    stopGPSTracking();
    router.replace('/(tabs)/exercise-detail' as any);
  };

  const handleSave = async () => {
    // Prevenir doble-clicks
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    // Detener tracking y cambiar a pantalla de guardando
    stopGPSTracking();
    setScreenState('saving');

    // Capturar valores actuales
    const currentTrackingTime = trackingTime;
    const currentDistance = distance;
    const avgSpeed = currentTrackingTime > 0 ? currentDistance / (currentTrackingTime / 3600) || 0 : 0;
    const stats = {
      time: formatTime(currentTrackingTime),
      distance: currentDistance,
      speed: avgSpeed,
    };

    let saveSuccess = false;
    let exerciseId: string | null = null;

    if (user) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const result = await saveExercise({
          user_id: user.id,
          activity_type: activityType,
          activity_name: activityName,
          date: today,
          duration_minutes: Math.ceil(currentTrackingTime / 60),
          distance_km: currentDistance,
          has_gps: true,
          average_speed_kmh: avgSpeed,
          route_points: routePoints,
          elevation_gain: Math.round(elevationGain.current),
          elevation_loss: Math.round(elevationLoss.current),
        });
        saveSuccess = result.success;
        exerciseId = result.exerciseId || null;
      } catch (error) {
        console.error('Error guardando:', error);
      }
    }

    // Mostrar resultado
    setSavedStats(saveSuccess ? stats : null);
    setSavedExerciseId(exerciseId);
    setScreenState(saveSuccess ? 'success' : 'error');
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

  // Renderizar pantalla de guardando
  if (screenState === 'saving') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.fullScreenOverlay}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.savingText}>{t('common.saving')}...</Text>
        </View>
      </View>
    );
  }

  // Renderizar pantalla de éxito o error
  if (screenState === 'success' || screenState === 'error') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.fullScreenOverlay}>
          <View style={styles.resultContainer}>
            {screenState === 'success' && savedStats ? (
              <>
                <View style={[styles.modalIconContainer, styles.successIconContainer]}>
                  <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                </View>

                <Text style={styles.modalTitle}>{t('workout.finishWorkout.savedTitle')}</Text>
                <Text style={styles.modalMessage}>
                  {t('workout.finishWorkout.savedMessage', { activity: activityName.toLowerCase() })}
                </Text>

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
                  <Ionicons name="close-circle" size={60} color="#f44336" />
                </View>
                <Text style={styles.modalTitle}>{t('common.error')}</Text>
                <Text style={styles.modalMessage}>{t('workout.couldNotSaveWorkout')}</Text>
              </>
            )}

            <TouchableOpacity
              style={styles.modalButtonOk}
              onPress={() => {
                if (savedExerciseId) {
                  router.replace({
                    pathname: '/(tabs)/exercise-activity-detail',
                    params: { exerciseId: savedExerciseId }
                  } as any);
                } else {
                  router.replace('/(tabs)/exercise-detail' as any);
                }
              }}
            >
              <Text style={styles.modalButtonOkText}>{t('common.ok')}</Text>
            </TouchableOpacity>

            {savedExerciseId && screenState === 'success' && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/share-cardio',
                    params: { exerciseId: savedExerciseId, source: 'tracking' }
                  } as any);
                }}
              >
                <Ionicons name="share-outline" size={18} color="#0a0a0a" />
                <Text style={styles.shareButtonText}>{t('common.share')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Renderizar pantalla de confirmación
  if (screenState === 'confirm') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.fullScreenOverlay}>
          <View style={styles.resultContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="flag" size={40} color="#ffb300" />
            </View>

            <Text style={styles.modalTitle}>{t('workout.finishWorkout.title')}</Text>
            <Text style={styles.modalMessage}>{t('workout.finishWorkout.message')}</Text>

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
      </View>
    );
  }

  // Renderizar pantalla de tracking (estado por defecto)
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
            <Text style={styles.pausedText}>{t('workout.status.paused')}</Text>
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
          showsUserLocation={!isPaused}
          showsMyLocationButton={false}
          followsUserLocation={!isPaused}
          mapType="standard"
        >
          {routePoints.length > 1 && (
            <Polyline
              coordinates={routePoints}
              strokeColor="#ffb300"
              strokeWidth={5}
            />
          )}

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
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{formatTime(trackingTime)}</Text>
          <Text style={styles.mainStatLabel}>{t('workout.stats.time')}</Text>
        </View>

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
          <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#ffffff" />
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
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  modalButtonDiscard: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f44336',
    minHeight: 48,
  },
  modalButtonDiscardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f44336',
  },
  modalButtonSave: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
  },
  modalButtonSaveText: {
    fontSize: 13,
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
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 16,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
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
  shareButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD54A',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0a',
  },
});
