import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { getExerciseVideoUrl } from '../../../src/services/exerciseVideoService';
import ExerciseVideoModal from '../../../src/components/ExerciseVideoModal';
import {
  getFavoriteExerciseIds,
  toggleExerciseFavorite,
  getFavoriteExercises,
  getFavoritesByMuscle,
  FavoriteExercise,
} from '../../../src/services/exerciseFavoritesService';

type FilterMode = 'all' | 'favorites';

// Músculos (IDs internos, NO traducibles)
const MUSCLES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'trapezius',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
  'lowerBack',
  'fullBody',
] as const;

type Muscle = typeof MUSCLES[number];


interface ExerciseVideo {
  id: string;
  canonical_name: string;
  description?: string | null;
  muscles?: string[] | null;
  muscle_zones?: string[] | null;
  equipment?: string[] | null;
  video_url?: string | null;
  storage_path?: string | null;
  is_storage_video?: boolean | null;
}

export default function CustomPlanSelectExerciseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const equipment = JSON.parse((params.equipment as string) || '[]');
  const dayNumber = params.dayNumber as string;
  const weekNumber = params.weekNumber as string;
  const daysPerWeek = params.daysPerWeek as string;
  const isTrainerView = params.isTrainerView === 'true';
  const studentId = params.studentId as string | undefined;
  
  // Parámetros de superserie
  const supersetMode = params.supersetMode === 'true';
  const supersetTotal = parseInt(params.supersetTotal as string) || 0;
  const supersetCurrent = parseInt(params.supersetCurrent as string) || 1;
  const supersetSelected = JSON.parse((params.supersetSelected as string) || '[]') as Array<{ id: string; name: string }>;

  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Estados para favoritos
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);

  // Filtrar ejercicios por búsqueda y modo de filtro
  const filteredExercises = useMemo(() => {
    let result = exercises;
    
    // Si estamos en modo superserie, excluir ejercicios ya seleccionados
    if (supersetMode && supersetSelected.length > 0) {
      const selectedIds = new Set(supersetSelected.map(ex => ex.id));
      result = result.filter(ex => !selectedIds.has(ex.id));
    }
    
    // Filtrar por favoritos si está activo
    if (filterMode === 'favorites') {
      result = result.filter(ex => favoriteIds.has(ex.id));
    }
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(ex => 
        ex.canonical_name.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [exercises, searchQuery, filterMode, favoriteIds, supersetMode, supersetSelected]);

  // Cargar favoritos al iniciar
  const loadFavorites = useCallback(async () => {
    try {
      const ids = await getFavoriteExerciseIds();
      setFavoriteIds(ids);
      
      // Cargar lista completa de favoritos para la vista sin músculo seleccionado
      const favorites = await getFavoriteExercises();
      setFavoriteExercises(favorites);
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    }
  }, []);

  // Toggle favorito
  const handleToggleFavorite = async (exercise: ExerciseVideo) => {
    const muscle = selectedMuscle || (exercise.muscles && exercise.muscles[0]) || 'other';
    const isNowFavorite = await toggleExerciseFavorite(
      exercise.id,
      exercise.canonical_name,
      muscle
    );
    
    // Actualizar estado local
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (isNowFavorite) {
        newSet.add(exercise.id);
      } else {
        newSet.delete(exercise.id);
      }
      return newSet;
    });
    
    // Recargar lista de favoritos
    const favorites = await getFavoriteExercises();
    setFavoriteExercises(favorites);
  };

  // Resetear el músculo seleccionado y limpiar caché cada vez que la pantalla recibe el foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Pantalla de selección de ejercicio enfocada, limpiando caché');
      setSelectedMuscle(null);
      setExercises([]);
      setFilterMode('all');
      
      // Cargar favoritos
      loadFavorites();
      
      // Limpiar cualquier caché de Supabase forzando una nueva sesión
      // Esto asegura que siempre obtenemos datos frescos del servidor
      supabase.removeAllChannels();
    }, [loadFavorites])
  );

  // Resetear el músculo seleccionado cuando cambia el día
  useEffect(() => {
    setSelectedMuscle(null);
    setExercises([]);
    setSearchQuery('');
  }, [dayNumber]);

  // Resetear búsqueda cuando se cambia de músculo
  useEffect(() => {
    setSearchQuery('');
  }, [selectedMuscle]);

  useEffect(() => {
    if (selectedMuscle) {
      loadExercises(selectedMuscle);
    }
  }, [selectedMuscle]);

  // Búsqueda global cuando el usuario escribe sin seleccionar músculo
  useEffect(() => {
    if (!selectedMuscle && searchQuery.trim().length >= 2) {
      searchAllExercises(searchQuery.trim());
    } else if (!selectedMuscle && searchQuery.trim().length === 0) {
      setExercises([]);
    }
  }, [searchQuery, selectedMuscle]);

  // Buscar en todos los ejercicios (búsqueda global - nombre y descripción)
  const searchAllExercises = async (query: string) => {
    setLoading(true);
    try {
      console.log('🔍 Búsqueda global:', query);
      
      // Buscar en nombre O descripción
      const { data, error } = await supabase
        .from('exercise_videos')
        .select('id, canonical_name, description, muscles, muscle_zones, equipment, video_url, storage_path, is_storage_video')
        .or(`video_url.not.is.null,and(is_storage_video.eq.true,storage_path.not.is.null)`)
        .or(`canonical_name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('canonical_name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error en búsqueda global:', error);
        return;
      }

      const exercisesWithVideo = (data || []).filter(ex => {
        const hasVideo = (ex.is_storage_video && ex.storage_path) || ex.video_url;
        return hasVideo;
      });

      console.log(`✅ ${exercisesWithVideo.length} ejercicios encontrados para "${query}"`);
      setExercises(exercisesWithVideo);
    } catch (error) {
      console.error('❌ Error en búsqueda global:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async (muscle: string) => {
    setLoading(true);
    try {
      console.log('🔄 Cargando ejercicios frescos para músculo:', muscle);
      console.log('🎯 Equipamiento seleccionado:', equipment);
      
      // Construir query base - seleccionar updated_at para verificar datos frescos
      let query = supabase
        .from('exercise_videos')
        .select('id, canonical_name, description, muscles, muscle_zones, equipment, video_url, storage_path, is_storage_video, updated_at')
        .or(`video_url.not.is.null,and(is_storage_video.eq.true,storage_path.not.is.null)`);

      // Filtrar por músculo (puede estar en muscles o muscle_zones)
      query = query.or(`muscles.cs.{${muscle}},muscle_zones.cs.{${muscle}}`);

      // Filtrar por equipamiento - el ejercicio debe tener al menos uno de los equipamientos seleccionados
      if (equipment.length > 0) {
        // Crear condición OR para cada equipamiento
        const equipmentConditions = equipment.map((eq: string) => `equipment.cs.{${eq}}`).join(',');
        query = query.or(equipmentConditions);
      }

      // Ordenar por updated_at DESC para obtener los más recientes primero
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;
      
      console.log('📊 Ejercicios recibidos:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 Ejemplo de ejercicio:', {
          name: data[0].canonical_name,
          muscles: data[0].muscles,
          muscle_zones: data[0].muscle_zones,
          updated_at: data[0].updated_at
        });
      }

      if (error) {
        console.error('Error loading exercises:', error);
        Alert.alert(t('common.error'), t('customPlan.couldNotLoadExercises'));
        return;
      }

      // Filtrar solo los que tienen video válido
      const exercisesWithVideo = (data || []).filter(ex => {
        const hasVideo = (ex.is_storage_video && ex.storage_path) || ex.video_url;
        return hasVideo;
      });

      console.log(`✅ ${exercisesWithVideo.length} ejercicios cargados para ${muscle}`);
      setExercises(exercisesWithVideo);
    } catch (error) {
      console.error('❌ Error cargando ejercicios:', error);
      Alert.alert(t('common.error'), t('customPlan.errorLoadingExercises'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExercise = async (exercise: ExerciseVideo) => {
    // ============================================================================
    // MODO SUPERSERIE: Agregar ejercicio a la lista y continuar o abrir config
    // ============================================================================
    if (supersetMode) {
      const newSelected = [
        ...supersetSelected,
        { id: exercise.id, name: exercise.canonical_name }
      ];
      
      if (supersetCurrent < supersetTotal) {
        // Aún faltan ejercicios, navegar para seleccionar el siguiente
        router.push({
          pathname: '/(tabs)/workout/custom-plan-select-exercise',
          params: {
            equipment: JSON.stringify(equipment),
            dayNumber: dayNumber,
            weekNumber: weekNumber || '1',
            daysPerWeek: daysPerWeek,
            supersetMode: 'true',
            supersetTotal: supersetTotal.toString(),
            supersetCurrent: (supersetCurrent + 1).toString(),
            supersetSelected: JSON.stringify(newSelected),
          },
        });
      } else {
        // Todos los ejercicios seleccionados, guardar en AsyncStorage y volver
        await AsyncStorage.setItem('supersetExercises', JSON.stringify(newSelected));
        
        // Navegar de vuelta a la pantalla del día
        router.push({
          pathname: '/(tabs)/workout/custom-plan-day-detail',
          params: {
            dayNumber: dayNumber,
            weekNumber: weekNumber || '1',
            daysPerWeek: daysPerWeek,
            equipment: JSON.stringify(equipment),
            openSupersetConfig: 'true',
          },
        });
      }
      return;
    }
    
    // ============================================================================
    // MODO NORMAL: Comportamiento original
    // ============================================================================
    // Guardar el ejercicio seleccionado en AsyncStorage temporalmente
    const exerciseData = {
      id: exercise.id,
      name: exercise.canonical_name,
      sets: 3, // Valor por defecto
      reps: [10, 10, 10], // Valores por defecto
      rest_seconds: 120, // 2 minutos por defecto
    };
    
    try {
      await AsyncStorage.setItem('selectedExercise', JSON.stringify(exerciseData));
      
      // Navegar directamente a la pantalla del día en lugar de usar router.back()
      if (dayNumber && daysPerWeek) {
        router.push({
          pathname: '/(tabs)/workout/custom-plan-day-detail',
          params: {
            dayNumber: dayNumber,
            weekNumber: weekNumber || '1',
            daysPerWeek: daysPerWeek,
            equipment: JSON.stringify(equipment),
            isTrainerView: isTrainerView ? 'true' : 'false',
            studentId: studentId || '',
          },
        });
      } else {
        // Si no hay parámetros, intentar volver
        router.back();
      }
    } catch (error) {
      console.error('Error saving selected exercise:', error);
      Alert.alert(
        t('common.notice'),
        t('customPlan.problemSavingExerciseFallback'),
        [{ text: t('common.ok') }]
      );
      
      // En caso de error, intentar navegar de todas formas
      if (dayNumber && daysPerWeek) {
        router.push({
          pathname: '/(tabs)/workout/custom-plan-day-detail',
          params: {
            dayNumber: dayNumber,
            weekNumber: weekNumber || '1',
            daysPerWeek: daysPerWeek,
            equipment: JSON.stringify(equipment),
            isTrainerView: isTrainerView ? 'true' : 'false',
            studentId: studentId || '',
          },
        });
      } else {
        router.back();
      }
    }
  };

  const handleShowVideo = async (exercise: ExerciseVideo) => {
    try {
      // Obtener la URL del video
      let videoUrl: string | null = null;
      
      if (exercise.is_storage_video && exercise.storage_path) {
        // Si está en Supabase Storage, obtener URL pública
        const { data } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(exercise.storage_path);
        videoUrl = data.publicUrl;
      } else if (exercise.video_url) {
        videoUrl = exercise.video_url;
      } else {
        // Intentar obtener desde el servicio
        videoUrl = await getExerciseVideoUrl(exercise.canonical_name);
      }

      if (videoUrl) {
        setSelectedVideoUrl(videoUrl);
        setSelectedExerciseName(exercise.canonical_name);
        setVideoModalVisible(true);
      } else {
        Alert.alert(t('customPlan.videoNotAvailable'), t('customPlan.exerciseNoVideo'));
      }
    } catch (error) {
      console.error('Error al obtener video:', error);
      Alert.alert(t('common.error'), t('customPlan.couldNotLoadVideo'));
    }
  };

  if (selectedMuscle === null) {
    // Mostrar selección de músculos con buscador global
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navegar directamente a custom-plan-day-detail con los parámetros correctos
              router.push({
                pathname: '/(tabs)/workout/custom-plan-day-detail',
                params: {
                  dayNumber: dayNumber?.toString() || '',
                  weekNumber: weekNumber?.toString() || '1',
                  daysPerWeek: daysPerWeek || '',
                  equipment: JSON.stringify(equipment),
                },
              } as any);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('customPlan.selectMuscle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Indicador de progreso de superserie */}
        {supersetMode && (
          <View style={styles.supersetProgressContainer}>
            <View style={styles.supersetProgressHeader}>
              <Ionicons name="link" size={20} color="#9C27B0" />
              <Text style={styles.supersetProgressText}>
                {t('customPlan.supersetProgress', { current: supersetCurrent, total: supersetTotal })}
              </Text>
            </View>
            {supersetSelected.length > 0 && (
              <View style={styles.supersetSelectedList}>
                <Text style={styles.supersetSelectedLabel}>{t('customPlan.supersetSelected')}:</Text>
                {supersetSelected.map((ex, idx) => (
                  <Text key={ex.id} style={styles.supersetSelectedItem}>
                    {idx + 1}. {ex.name}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tabs de filtro: Todos / Favoritos */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
            onPress={() => setFilterMode('all')}
          >
            <Ionicons name="list" size={18} color={filterMode === 'all' ? '#1a1a1a' : '#888'} />
            <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
              {t('favorites.all')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'favorites' && styles.filterTabActive]}
            onPress={() => setFilterMode('favorites')}
          >
            <Ionicons name="heart" size={18} color={filterMode === 'favorites' ? '#1a1a1a' : '#888'} />
            <Text style={[styles.filterTabText, filterMode === 'favorites' && styles.filterTabTextActive]}>
              {t('favorites.favorites')} ({favoriteExercises.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buscador global de ejercicios */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={filterMode === 'favorites' ? t('favorites.searchFavorites') : t('customPlan.searchAllExercises')}
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          {/* Mostrar favoritos si está en modo favoritos */}
          {filterMode === 'favorites' ? (
            favoriteExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={64} color="#666" />
                <Text style={styles.emptyStateText}>
                  {t('favorites.noFavorites')}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {t('favorites.noFavoritesDescription')}
                </Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
                <Text style={styles.exercisesCount}>
                  {favoriteExercises.length} {favoriteExercises.length === 1 ? t('favorites.favorite') : t('favorites.favorites')}
                </Text>
                {favoriteExercises
                  .filter(fav => !searchQuery.trim() || fav.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((favorite) => (
                  <TouchableOpacity
                    key={favorite.id}
                    style={styles.exerciseCard}
                    onPress={() => handleSelectExercise({
                      id: favorite.id,
                      canonical_name: favorite.canonical_name,
                      muscles: [favorite.muscle],
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseCardContent}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>{favorite.canonical_name}</Text>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite({
                                id: favorite.id,
                                canonical_name: favorite.canonical_name,
                                muscles: [favorite.muscle],
                              });
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="heart" size={28} color="#ff4757" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.exerciseMuscle}>
                        {t(`muscles.${favorite.muscle}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : searchQuery.trim().length >= 2 ? (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffb300" />
                <Text style={styles.loadingText}>{t('customPlan.loadingExercises')}</Text>
              </View>
            ) : exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#666" />
                <Text style={styles.emptyStateText}>
                  {t('customPlan.noExercisesFound')}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {t('customPlan.tryDifferentSearch')}
                </Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
                <Text style={styles.exercisesCount}>
                  {exercises.length} {exercises.length === 1 ? t('customPlan.exercise') : t('customPlan.exercises')}
                </Text>
                {exercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.exerciseCard}
                    onPress={() => handleSelectExercise(exercise)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseCardContent}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>{exercise.canonical_name}</Text>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(exercise);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons 
                              name={favoriteIds.has(exercise.id) ? "heart" : "heart-outline"} 
                              size={28} 
                              color={favoriteIds.has(exercise.id) ? "#ff4757" : "#888"} 
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.videoButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleShowVideo(exercise);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="play-circle" size={32} color="#ffb300" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Mostrar el músculo del ejercicio */}
                      {exercise.muscles && exercise.muscles.length > 0 && (
                        <Text style={styles.exerciseMuscle}>
                          {t(`muscles.${exercise.muscles[0]}`)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : (
            <>
              <Text style={styles.description}>
                {t('customPlan.selectMuscleDescription')}
              </Text>

              <View style={styles.musclesGrid}>
                {MUSCLES.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={styles.muscleButton}
                    onPress={() => setSelectedMuscle(muscle)}
                  >
                    <Text style={styles.muscleButtonText}>
                    {t(`muscles.${muscle}`)}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Modal de video */}
        <ExerciseVideoModal
          visible={videoModalVisible}
          videoUrl={selectedVideoUrl}
          exerciseName={selectedExerciseName}
          onClose={() => {
            setVideoModalVisible(false);
            setSelectedVideoUrl(null);
            setSelectedExerciseName('');
          }}
        />
      </SafeAreaView>
    );
  }

  // Mostrar ejercicios del músculo seleccionado
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedMuscle(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
        {t(`muscles.${selectedMuscle}`)}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('🔄 Recargando ejercicios manualmente');
            loadExercises(selectedMuscle);
          }}
          disabled={loading}
        >
          <Ionicons 
            name="reload" 
            size={24} 
            color={loading ? "#666" : "#ffb300"} 
          />
        </TouchableOpacity>
      </View>

      {/* Indicador de progreso de superserie */}
      {supersetMode && (
        <View style={styles.supersetProgressContainer}>
          <View style={styles.supersetProgressHeader}>
            <Ionicons name="link" size={20} color="#9C27B0" />
            <Text style={styles.supersetProgressText}>
              {t('customPlan.supersetProgress', { current: supersetCurrent, total: supersetTotal })}
            </Text>
          </View>
          {supersetSelected.length > 0 && (
            <View style={styles.supersetSelectedList}>
              <Text style={styles.supersetSelectedLabel}>{t('customPlan.supersetSelected')}:</Text>
              {supersetSelected.map((ex, idx) => (
                <Text key={ex.id} style={styles.supersetSelectedItem}>
                  {idx + 1}. {ex.name}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tabs de filtro: Todos / Favoritos */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
          onPress={() => setFilterMode('all')}
        >
          <Ionicons name="list" size={18} color={filterMode === 'all' ? '#1a1a1a' : '#888'} />
          <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
            {t('favorites.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'favorites' && styles.filterTabActive]}
          onPress={() => setFilterMode('favorites')}
        >
          <Ionicons name="heart" size={18} color={filterMode === 'favorites' ? '#1a1a1a' : '#888'} />
          <Text style={[styles.filterTabText, filterMode === 'favorites' && styles.filterTabTextActive]}>
            {t('favorites.favorites')} ({exercises.filter(ex => favoriteIds.has(ex.id)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Buscador de ejercicios */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={filterMode === 'favorites' ? t('favorites.searchFavorites') : t('customPlan.searchExercise')}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffb300" />
            <Text style={styles.loadingText}>{t('customPlan.loadingExercises')}</Text>
            </View>
        ) : filteredExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? t('customPlan.noExercisesFound') : t('customPlan.noExercisesAvailable')}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? t('customPlan.tryDifferentSearch')
                : t('customPlan.noExercisesForMuscleAndEquipment')}
            </Text>
          </View>
        ) : (
          <View style={styles.exercisesList}>
            <Text style={styles.exercisesCount}>
              {filteredExercises.length} {filteredExercises.length === 1 ? t('customPlan.exercise') : t('customPlan.exercises')}
            </Text>
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => handleSelectExercise(exercise)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseCardContent}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.canonical_name}</Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(exercise);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons 
                          name={favoriteIds.has(exercise.id) ? "heart" : "heart-outline"} 
                          size={28} 
                          color={favoriteIds.has(exercise.id) ? "#ff4757" : "#888"} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.videoButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShowVideo(exercise);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="play-circle" size={32} color="#ffb300" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de video */}
      <ExerciseVideoModal
        visible={videoModalVisible}
        videoUrl={selectedVideoUrl}
        exerciseName={selectedExerciseName}
        onClose={() => {
          setVideoModalVisible(false);
          setSelectedVideoUrl(null);
          setSelectedExerciseName('');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    lineHeight: 20,
  },
  musclesGrid: {
    gap: 12,
  },
  muscleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  muscleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseCardContent: {
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  exerciseMuscle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  videoButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterTabActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  filterTabTextActive: {
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#ffffff',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  exercisesCount: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  // ============================================================================
  // ESTILOS DE INDICADOR DE SUPERSERIE
  // ============================================================================
  supersetProgressContainer: {
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  supersetProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supersetProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
  supersetSelectedList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  supersetSelectedLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  supersetSelectedItem: {
    fontSize: 14,
    color: '#ffffff',
    paddingVertical: 4,
  },
});

