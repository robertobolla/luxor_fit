import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../src/services/supabase';
import { getExerciseVideoUrl } from '../../../src/services/exerciseVideoService';
import ExerciseVideoModal from '../../../src/components/ExerciseVideoModal';

// Músculos del dashboard
const MUSCLES = [
  'pecho', 'espalda', 'hombros', 'bíceps', 'tríceps', 'antebrazos', 'trapecio',
  'cuádriceps', 'isquiotibiales', 'glúteos', 'pantorrillas', 'gemelos',
  'abdominales', 'oblicuos', 'lumbares', 'cuerpo_completo'
];

const MUSCLE_LABELS: Record<string, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  bíceps: 'Bíceps',
  tríceps: 'Tríceps',
  antebrazos: 'Antebrazos',
  trapecio: 'Trapecio',
  cuádriceps: 'Cuádriceps',
  isquiotibiales: 'Isquiotibiales',
  glúteos: 'Glúteos',
  pantorrillas: 'Pantorrillas',
  gemelos: 'Gemelos',
  abdominales: 'Abdominales',
  oblicuos: 'Oblicuos',
  lumbares: 'Lumbares',
  cuerpo_completo: 'Cuerpo Completo',
};

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
  const router = useRouter();
  const params = useLocalSearchParams();
  const equipment = JSON.parse((params.equipment as string) || '[]');
  const dayNumber = params.dayNumber as string;
  const weekNumber = params.weekNumber as string;
  const daysPerWeek = params.daysPerWeek as string;

  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');

  // Resetear el músculo seleccionado y limpiar caché cada vez que la pantalla recibe el foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Pantalla de selección de ejercicio enfocada, limpiando caché');
      setSelectedMuscle(null);
      setExercises([]);
      
      // Limpiar cualquier caché de Supabase forzando una nueva sesión
      // Esto asegura que siempre obtenemos datos frescos del servidor
      supabase.removeAllChannels();
    }, [])
  );

  // Resetear el músculo seleccionado cuando cambia el día
  useEffect(() => {
    setSelectedMuscle(null);
    setExercises([]);
  }, [dayNumber]);

  useEffect(() => {
    if (selectedMuscle) {
      loadExercises(selectedMuscle);
    }
  }, [selectedMuscle]);

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
        Alert.alert('Error', 'No se pudieron cargar los ejercicios');
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
      Alert.alert('Error', 'Ocurrió un error al cargar los ejercicios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExercise = async (exercise: ExerciseVideo) => {
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
          },
        });
      } else {
        // Si no hay parámetros, intentar volver
        router.back();
      }
    } catch (error) {
      console.error('Error saving selected exercise:', error);
      // En caso de error, intentar navegar de todas formas
      if (dayNumber && daysPerWeek) {
        router.push({
          pathname: '/(tabs)/workout/custom-plan-day-detail',
          params: {
            dayNumber: dayNumber,
            weekNumber: weekNumber || '1',
            daysPerWeek: daysPerWeek,
            equipment: JSON.stringify(equipment),
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
        Alert.alert('Video no disponible', 'Este ejercicio no tiene video disponible');
      }
    } catch (error) {
      console.error('Error al obtener video:', error);
      Alert.alert('Error', 'No se pudo cargar el video');
    }
  };

  if (selectedMuscle === null) {
    // Mostrar selección de músculos
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
          <Text style={styles.headerTitle}>Seleccionar Músculo</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            Selecciona el grupo muscular para ver los ejercicios disponibles
          </Text>

          <View style={styles.musclesGrid}>
            {MUSCLES.map((muscle) => (
              <TouchableOpacity
                key={muscle}
                style={styles.muscleButton}
                onPress={() => setSelectedMuscle(muscle)}
              >
                <Text style={styles.muscleButtonText}>
                  {MUSCLE_LABELS[muscle] || muscle}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
          {MUSCLE_LABELS[selectedMuscle] || selectedMuscle}
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

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffb300" />
            <Text style={styles.loadingText}>Cargando ejercicios...</Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>No hay ejercicios disponibles</Text>
            <Text style={styles.emptyStateSubtext}>
              No se encontraron ejercicios para este músculo con el equipamiento seleccionado
            </Text>
          </View>
        ) : (
          <View style={styles.exercisesList}>
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
  videoButton: {
    padding: 4,
  },
});

