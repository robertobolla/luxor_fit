import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LogBox,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../src/services/supabase';
import { useCustomAlert } from '../../../src/components/CustomAlert';
import Constants from 'expo-constants';

// ============================================================================
// 🚀 DRAG & DROP - DETECCIÓN AUTOMÁTICA DE ENTORNO
// ============================================================================
// Detectar automáticamente si estamos en Expo Go o en un build nativo
const isExpoGo = Constants.appOwnership === 'expo';
const DRAG_DROP_ENABLED = !isExpoGo; // Solo activar si NO es Expo Go

// Imports condicionales - solo cargar si no es Expo Go
let DraggableFlatList: any;
let ScaleDecorator: any;
let GestureHandlerRootView: any;

if (DRAG_DROP_ENABLED) {
  const draggable = require('react-native-draggable-flatlist');
  const gesture = require('react-native-gesture-handler');
  DraggableFlatList = draggable.default;
  ScaleDecorator = draggable.ScaleDecorator;
  GestureHandlerRootView = gesture.GestureHandlerRootView;
}

console.log('🎯 Entorno detectado:', {
  isExpoGo,
  DRAG_DROP_ENABLED,
  appOwnership: Constants.appOwnership
});

// Suprimir warning de keys - todas las keys están implementadas correctamente
LogBox.ignoreLogs([
  'Each child in a list should have a unique "key" prop',
  /Each child in a list should have a unique/,
]);

type SetType = 'warmup' | 'normal' | 'failure' | 'drop';

interface SetInfo {
  type: SetType;
  reps: number | null; // null para series al fallo
  rir: number | null; // Reps In Reserve para intensidad (opcional)
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number[]; // Mantener para compatibilidad
  setTypes?: SetInfo[]; // Nuevo campo para tipos de series
  rest_seconds?: number; // Tiempo de descanso en segundos
  notes?: string; // Notas del entrenador o usuario para este ejercicio
}

export default function CustomPlanDayDetailScreen() {
  const router = useRouter();
  const { t, i18n  } = useTranslation();
  const params = useLocalSearchParams();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  // Parsear parámetros con validación
  const parseDayNumber = (value: string | undefined): number => {
    if (!value) return 1;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed;
  };

  const parseSafeJSON = (value: string | undefined, defaultValue: any): any => {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Error parseando JSON:', e);
      return defaultValue;
    }
  };

  const weekNumber = parseDayNumber(params.weekNumber as string);
  const dayNumber = parseDayNumber(params.dayNumber as string);
  const equipment = parseSafeJSON(params.equipment as string, []);
  const dayData = parseSafeJSON(params.dayData as string, { exercises: [] });

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dayName, setDayName] = useState<string>(
    t('customPlan.dayWithNumber', { number: dayNumber })
  );
    const [isEditingDayName, setIsEditingDayName] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState<string[]>([]);
  const [rirValues, setRirValues] = useState<string[]>([]); // RIR para cada serie
  const [setTypes, setSetTypes] = useState<SetInfo[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [exerciseNotes, setExerciseNotes] = useState<string>(''); // Notas del ejercicio
  
  // Ref para saber si hay cambios sin guardar (para no sobrescribir con AsyncStorage)
  const hasLocalChanges = React.useRef(false);
  // Ref para mantener siempre la referencia actualizada de exercises
  const exercisesRef = React.useRef<Exercise[]>([]);
  // Refs para prevenir race conditions en AsyncStorage
  const isSavingToStorage = React.useRef(false);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const modalTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Mantener exercisesRef actualizado
  React.useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);
  
  // Estados para el modal de cambio de tipo de serie
  const [showSetTypeModal, setShowSetTypeModal] = useState(false);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number>(-1);

  // Estados para el modal de configuración de tiempo de descanso
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);
  const [editingRestExerciseId, setEditingRestExerciseId] = useState<string | null>(null);
  const [tempRestTime, setTempRestTime] = useState(120); // 2 minutos por defecto
  const [showRestTimers, setShowRestTimers] = useState(true); // Mostrar temporizadores por defecto

  // Debug: Verificar estado del modal en cada render
  useEffect(() => {
    console.log('🔍 Estado modal cambió:', { showSetTypeModal, selectedSetIndex });
  }, [showSetTypeModal, selectedSetIndex]);

  // Cleanup: Limpiar todos los timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        console.log('🧹 Timeout de modal limpiado al desmontar');
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        console.log('🧹 Timeout de auto-guardado limpiado al desmontar');
      }
    };
  }, []);

  // Guardar automáticamente en AsyncStorage cuando cambian los ejercicios
  // Con debounce para evitar guardados excesivos y race conditions
  useEffect(() => {
    if (hasLocalChanges.current && exercises.length > 0) {
      // Cancelar guardado anterior si existe
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        console.log('⏸️ Guardado anterior cancelado (debounce)');
      }

      // Programar nuevo guardado con debounce de 500ms
      saveTimeoutRef.current = setTimeout(async () => {
        // Prevenir race condition: no guardar si ya hay guardado en proceso
        if (isSavingToStorage.current) {
          console.log('⏳ Ya hay un guardado en proceso, saltando...');
          return;
        }

        isSavingToStorage.current = true;
        try {
          const dayDataToSave = {
            dayNumber,
            name: dayName,
            exercises,
          };
          await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
          console.log('💾 Auto-guardado en AsyncStorage:', { dayNumber, exercisesCount: exercises.length });
        } catch (error) {
          console.error('❌ Error auto-guardando:', error);
          // No mostrar alert en auto-guardado, es automático y no crítico
          // El usuario puede guardar manualmente el plan completo
        } finally {
          isSavingToStorage.current = false;
        }
      }, 500); // Debounce de 500ms
    }

    // Cleanup: cancelar timeout al desmontar
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        console.log('🧹 Timeout de auto-guardado limpiado');
      }
    };
  }, [exercises, dayNumber, weekNumber, dayName]);

  // Inicializar estados del modal cuando se abre para editar un ejercicio
  useEffect(() => {
    if (editingExercise) {
      console.log('📝 Inicializando modal con datos del ejercicio:', editingExercise.name);
      
      // Resetear modal de tipos al abrir configuración
      setShowSetTypeModal(false);
      setSelectedSetIndex(-1);
      
      // Verificar si el ejercicio tiene setTypes configurados
      const exerciseSetTypes = editingExercise.setTypes || [];
      const hasConfiguredSets = exerciseSetTypes.length > 0;
      
      if (hasConfiguredSets) {
        // Ejercicio existente con configuración - copiar profundamente
        console.log('📋 Cargando configuración existente');
        const exerciseReps = exerciseSetTypes.map(st => st.reps?.toString() || '');
        const exerciseRir = exerciseSetTypes.map(st => st.rir?.toString() || '');
        
        // Crear copias profundas para evitar referencias compartidas
        const copiedSetTypes = exerciseSetTypes.map(st => ({
          type: st.type,
          reps: st.reps,
          rir: st.rir,
        }));
        
        setSetTypes(copiedSetTypes);
        setReps([...exerciseReps]);
        setRirValues([...exerciseRir]);
        setSets(editingExercise.sets?.toString() || copiedSetTypes.length.toString());
      } else {
        // Ejercicio nuevo sin configurar - crear valores por defecto
        console.log('✨ Inicializando ejercicio nuevo con valores por defecto');
        const defaultSets = 3;
        const defaultSetTypes: SetInfo[] = Array(defaultSets).fill(null).map(() => ({
          type: 'normal',
          reps: null,
          rir: null,
        }));
        
        setSetTypes(defaultSetTypes);
        setReps(Array(defaultSets).fill(''));
        setRirValues(Array(defaultSets).fill(''));
        setSets(defaultSets.toString());
      }
      
      // Inicializar notas del ejercicio
      setExerciseNotes(editingExercise.notes || '');
      
      console.log('✅ Estados inicializados para:', editingExercise.name);
    } else {
      // Limpiar estados cuando se cierra el modal
      console.log('🧹 Limpiando estados del modal');
      setSetTypes([]);
      setReps([]);
      setRirValues([]);
      setSets('');
      setExerciseNotes('');
      setShowSetTypeModal(false);
      setSelectedSetIndex(-1);
    }
  }, [editingExercise]);

  // Resetear estado cuando cambia el dayNumber
  useEffect(() => {
    setExercises([]);
    setDayName(t('workout.dayName', { day: dayNumber }));

    setIsEditingDayName(false);
    setEditingExercise(null);
    setSets('');
    setReps([]);
    setRirValues([]);
  }, [dayNumber]);


  const handleAddExercise = () => {
    router.push({
      pathname: '/(tabs)/workout/custom-plan-select-exercise',
      params: {
        equipment: JSON.stringify(equipment),
        dayNumber: dayNumber.toString(),
        daysPerWeek: params.daysPerWeek as string || '',
        dayData: JSON.stringify({ dayNumber, exercises }),
      },
    });
  };

  const handleAddSet = () => {
    const newReps = [...reps, ''];
    const newRirValues = [...rirValues, ''];
    const newSetTypes: SetInfo[] = [...setTypes, { type: 'normal' as SetType, reps: null, rir: null }];
    
    setReps(newReps);
    setRirValues(newRirValues);
    setSetTypes(newSetTypes);
    setSets(newSetTypes.length.toString());
    
    console.log('➕ Serie agregada, total:', newSetTypes.length);
  };

  const handleRemoveSet = (index: number) => {
    if (setTypes.length <= 1) {
      showAlert(
        t('common.error'),
        t('customPlan.minOneSetRequired'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      
      return;
    }
    
    const newReps = reps.filter((_, i) => i !== index);
    const newRirValues = rirValues.filter((_, i) => i !== index);
    const newSetTypes = setTypes.filter((_, i) => i !== index);
    
    setReps(newReps);
    setRirValues(newRirValues);
    setSetTypes(newSetTypes);
    setSets(newSetTypes.length.toString());
    
    console.log('➖ Serie eliminada, total:', newSetTypes.length);
  };

  const handleRepsChange = (index: number, text: string) => {
    const newReps = [...reps];
    newReps[index] = text;
    setReps(newReps);
    
    // Actualizar también el tipo de serie
    const newSetTypes = [...setTypes];
    if (newSetTypes[index]) {
      newSetTypes[index] = {
        ...newSetTypes[index],
        reps: parseInt(text) || null,
      };
      setSetTypes(newSetTypes);
    }
  };

  const handleRirChange = (index: number, text: string) => {
    const newRirValues = [...rirValues];
    newRirValues[index] = text;
    setRirValues(newRirValues);
    
    const rirValue = text ? parseInt(text) : null;
    
    // Actualizar también el tipo de serie
    const newSetTypes = [...setTypes];
    if (newSetTypes[index]) {
      const currentType = newSetTypes[index].type;
      
      // Lógica automática: RIR 0 = al fallo, RIR >= 1 = normal
      let newType = currentType;
      if (rirValue === 0) {
        // Cambiar a "failure" si RIR es 0
        newType = 'failure';
      } else if (currentType === 'failure' && rirValue !== null && rirValue > 0) {
        // Si está al fallo y cambias RIR a >= 1, volver a normal
        newType = 'normal';
      }
      
      newSetTypes[index] = {
        ...newSetTypes[index],
        type: newType,
        rir: rirValue,
      };
      setSetTypes(newSetTypes);
      
      console.log(`🔄 RIR cambiado a ${rirValue}, tipo ahora es: ${newType}`);
    }
  };

  const getSetLabel = (setType: SetInfo, index: number): string => {
    // Para warmup y drop, devolver letra directamente
    if (setType.type === 'warmup') return 'C';
    if (setType.type === 'drop') return 'D';
    
    // Para series normales y al fallo: contar cuántas series normales + failure hay hasta este índice
    let seriesCount = 0;
    for (let i = 0; i <= index; i++) {
      const type = setTypes[i]?.type || 'normal';
      if (type === 'normal' || type === 'failure') {
        seriesCount++;
      }
    }
    
    // Para failure: mostrar número + "F"
    if (setType.type === 'failure') {
      return `${seriesCount} F`;
    }
    
    // Para series normales: mostrar solo el número
    return `${seriesCount}`;
  };

  const getSetButtonColor = (setType: SetInfo): string => {
    switch (setType.type) {
      case 'warmup':
        return '#4CAF50'; // Verde
      case 'failure':
        return '#ff4444'; // Rojo
      case 'drop':
        return '#9C27B0'; // Morado
      case 'normal':
      default:
        return '#ffb300'; // Amarillo
    }
  };

  const handleChangeSetType = (newType: SetType) => {
    console.log('🔄 Cambiando tipo de serie:', { selectedSetIndex, newType });
    
    if (selectedSetIndex === -1) {
      console.error('❌ Índice de serie inválido');
      setShowSetTypeModal(false);
      return;
    }
    
    const newSetTypes = [...setTypes];
    const currentReps = newSetTypes[selectedSetIndex]?.reps || null;
    const currentRir = newSetTypes[selectedSetIndex]?.rir || null;
    
    // Si cambia a 'warmup', limpiar reps y RIR (no se necesitan)
    // Si cambia a 'failure', actualizar RIR a 0 automáticamente
    const updatedReps = newType === 'warmup' ? null : currentReps;
    const updatedRir = newType === 'warmup' ? null : (newType === 'failure' ? 0 : currentRir);
    
    newSetTypes[selectedSetIndex] = {
      type: newType,
      reps: updatedReps,
      rir: updatedRir,
    };
    
    // Actualizar valores visuales
    if (newType === 'failure') {
      const newRirValues = [...rirValues];
      newRirValues[selectedSetIndex] = '0';
      setRirValues(newRirValues);
    } else if (newType === 'warmup') {
      // Limpiar valores visuales para calentamiento
      const newRepsValues = [...reps];
      const newRirValues = [...rirValues];
      newRepsValues[selectedSetIndex] = '';
      newRirValues[selectedSetIndex] = '';
      setReps(newRepsValues);
      setRirValues(newRirValues);
    }
    
    console.log('✅ Nuevo array de setTypes:', newSetTypes);
    setSetTypes(newSetTypes);
    
    // Cerrar modal
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
  };

  const handleSaveExercise = () => {
    if (!editingExercise) return;
    
    // Cerrar modal de tipos si está abierto
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
    
    const numSets = setTypes.length;
    if (numSets === 0) {
      showAlert(
        t('common.error'),
        t('customPlan.atLeastOneSet'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      return;
    }

    // Validar que todas las series (excepto calentamiento) tengan reps
    for (let i = 0; i < setTypes.length; i++) {
      const setType = setTypes[i].type;
      
      // Las series de calentamiento no requieren reps
      if (setType === 'warmup') {
        continue;
      }
      
      const repsValue = parseInt(reps[i]);
      if (!repsValue || repsValue === 0) {
        showAlert(
          t('common.error'),
          t('customPlan.repsRequiredForSet', { setNumber: i + 1 }),
          [{ text: t('common.ok') }],
          { icon: 'alert-circle', iconColor: '#F44336' }
        );
        return;
      }
    }

    // Actualizar setTypes con las reps y RIR finales
    const finalSetTypes = setTypes.map((st, idx) => ({
      type: st.type,
      // Las series de calentamiento no tienen reps ni RIR
      reps: st.type === 'warmup' ? null : (parseInt(reps[idx]) || 0),
      rir: st.type === 'warmup' ? null : (rirValues[idx] ? parseInt(rirValues[idx]) || null : null),
    }));

    // Mantener compatibilidad con repsArray
    const repsArray = finalSetTypes.map(st => st.reps || 0);

    const updatedExercises = exercises.map(ex =>
      ex.id === editingExercise.id
        ? { 
            ...ex, 
            sets: numSets, 
            reps: repsArray, 
            setTypes: finalSetTypes,
            // Mantener rest_seconds si existe
            rest_seconds: ex.rest_seconds || 120,
            // Guardar notas del ejercicio
            notes: exerciseNotes.trim() || undefined,
          }
        : ex
    );
    setExercises(updatedExercises);
    
    // Marcar que hay cambios locales sin guardar
    hasLocalChanges.current = true;
    console.log('✏️ Ejercicio modificado, marcando cambios locales');
    
    setEditingExercise(null);
    setSets('');
    setReps([]);
    setSetTypes([]);
    setExerciseNotes('');
  };

  const toggleExerciseExpansion = (exerciseId: string) => {
    console.log('🔄 Toggle expansion para ejercicio:', exerciseId);
    console.log('📊 Estado actual de expandedExercises:', Array.from(expandedExercises));
    
    const newExpanded = new Set(expandedExercises);
    
    if (newExpanded.has(exerciseId)) {
      console.log('📦 Contrayendo ejercicio:', exerciseId);
      newExpanded.delete(exerciseId);
    } else {
      console.log('📂 Expandiendo ejercicio:', exerciseId);
      newExpanded.add(exerciseId);
    }
    
    console.log('📊 Nuevo estado de expandedExercises:', Array.from(newExpanded));
    setExpandedExercises(newExpanded);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    showAlert(
      t('customPlan.deleteExerciseTitle'),
  t('customPlan.deleteExerciseConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive',
          onPress: () => {
            setExercises(exercises.filter(ex => ex.id !== exerciseId));
            // Marcar que hay cambios locales sin guardar
            hasLocalChanges.current = true;
            console.log('🗑️ Ejercicio eliminado, marcando cambios locales');
          },
        },
      ],
      { icon: 'trash', iconColor: '#F44336' }
    );
  };

  const handleReorderExercises = (data: Exercise[]) => {
    console.log('🔄 Reordenando ejercicios');
    setExercises(data);
    // Marcar que hay cambios locales sin guardar
    hasLocalChanges.current = true;
    console.log('✅ Orden de ejercicios actualizado');
  };

  const handleOpenRestTimerModal = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setTempRestTime(exercise.rest_seconds || 120); // Valor actual o 2 min por defecto
      setEditingRestExerciseId(exerciseId);
      setShowRestTimerModal(true);
    }
  };

  const handleSaveRestTime = () => {
    if (editingRestExerciseId) {
      const updatedExercises = exercises.map(ex =>
        ex.id === editingRestExerciseId
          ? { ...ex, rest_seconds: tempRestTime }
          : ex
      );
      setExercises(updatedExercises);
      hasLocalChanges.current = true;
      console.log('⏱️ Tiempo de descanso guardado:', tempRestTime, 'segundos');
    }
    setShowRestTimerModal(false);
    setEditingRestExerciseId(null);
  };

  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Guardar los ejercicios del día en AsyncStorage para que la pantalla de días los pueda leer
    try {
      console.log('💾 Guardando día con ejercicios:', exercises.map(ex => ({ name: ex.name, id: ex.id })));
      
      const dayDataToSave = {
        dayNumber,
        name: dayName,
        exercises,
      };
      await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
      
      // Resetear flag de cambios locales después de guardar
      hasLocalChanges.current = false;
      console.log('✅ Cambios guardados, reseteando flag de cambios locales');
      
      // Navegar de vuelta a la pantalla de días
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
          planId: params.planId as string || '',
        },
      });
    } catch (error) {
      console.error('Error saving day data:', error);
      // En caso de error, intentar navegar de todas formas
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
          planId: params.planId as string || '',
        },
      });
    }
  };

  // Cargar datos del día y detectar cuando se selecciona un ejercicio
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const loadDayData = async () => {
        try {
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            if (isMounted) {
              setExercises(paramDayData.exercises || []);
              if (paramDayData.name) {
                setDayName(paramDayData.name);
              }
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          // Prevenir race condition: no cargar si hay guardado en proceso
          if (isSavingToStorage.current) {
            console.log('⏳ Guardado en proceso, usando datos de parámetros solamente');
          } else {
            const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
            if (dayDataStr) {
            const savedDayData = parseSafeJSON(dayDataStr, {});
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber && isMounted) {
              if (savedDayData.name) {
                setDayName(savedDayData.name);
              } else {
                setDayName(t('customPlan.dayWithNumber', { day: dayNumber }));
              }
              if (savedDayData.exercises) {
                setExercises(savedDayData.exercises);
              } else {
                setExercises([]);
              }
            }
            } else if (isMounted) {
              // Si no hay datos guardados, usar los valores por defecto
              setDayName(t('customPlan.dayWithNumber', { day: dayNumber }));
              setExercises([]);
            }
          }
        } catch (error) {
          console.error('Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(t('customPlan.dayWithNumber', { day: dayNumber }));
            setExercises([]);
          }
        }
      };

      const checkSelectedExercise = async (currentExercises: Exercise[]) => {
        try {
          const selectedExerciseData = await AsyncStorage.getItem('selectedExercise');
          if (selectedExerciseData && isMounted) {
            const selectedExercise = parseSafeJSON(selectedExerciseData, null);
            if (!selectedExercise) return;
            // Agregar el ejercicio a la lista con valores por defecto
            // Generar ID único basado en timestamp + random + nombre para evitar colisiones
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${selectedExercise.name.replace(/\s/g, '')}`;
            const newExercise: Exercise = {
              id: uniqueId,
              name: selectedExercise.name,
              sets: selectedExercise.sets || 3,
              reps: selectedExercise.reps || [10, 10, 10],
              rest_seconds: selectedExercise.rest_seconds || 120, // 2 minutos por defecto
              setTypes: selectedExercise.setTypes || [], // Inicializar setTypes vacío
            };
            console.log('✨ Nuevo ejercicio creado con ID único:', uniqueId);
            
            // Verificar que no esté ya agregado usando los ejercicios actuales
            const exerciseExists = currentExercises.find(ex => ex.id === newExercise.id && ex.name === newExercise.name);
            if (!exerciseExists) {
              const updatedExercises = [...currentExercises, newExercise];
              
              // Actualizar el estado
              if (isMounted) {
                setExercises(updatedExercises);
                // Marcar que hay cambios locales sin guardar
                hasLocalChanges.current = true;
                console.log('✏️ Nuevo ejercicio agregado, marcando cambios locales');
              }
              
              // Guardar inmediatamente en AsyncStorage para evitar pérdida de datos
              // Prevenir race condition
              if (!isSavingToStorage.current) {
                isSavingToStorage.current = true;
                try {
                  const currentDayName = dayName || t('workout.dayName', { day: dayNumber });
                  const dayDataToSave = {
                    dayNumber,
                    name: currentDayName,
                    exercises: updatedExercises,
                  };
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                  console.log('💾 Ejercicio guardado inmediatamente en AsyncStorage');
                } catch (error) {
                  console.error('Error saving updated day data:', error);
                } finally {
                  isSavingToStorage.current = false;
                }
              }
              
              // Abrir modal de edición inmediatamente para configurar series y repeticiones
              // Guardar referencia del timeout para poder limpiarlo
              modalTimeoutRef.current = setTimeout(() => {
                if (isMounted) {
                  setEditingExercise(newExercise);
                  modalTimeoutRef.current = null; // Limpiar referencia después de ejecutar
                }
              }, 100);
            }
            
            // Limpiar el storage después de usarlo
            await AsyncStorage.removeItem('selectedExercise');
          }
        } catch (error) {
          console.error('Error loading selected exercise:', error);
        }
      };
      
      // Primero cargar datos, luego verificar si hay un ejercicio seleccionado
      const initialize = async () => {
        let loadedExercises: Exercise[] = [];
        
        // Si hay cambios locales sin guardar, usar el estado actual en lugar de recargar
        if (hasLocalChanges.current) {
          console.log('⚠️ Hay cambios locales sin guardar, usando estado actual');
          console.log('📊 Ejercicios en estado actual:', exercisesRef.current.length);
          // Verificar si hay ejercicio seleccionado usando los ejercicios actuales
          await checkSelectedExercise(exercisesRef.current);
          return;
        }
        
        // Cargar datos primero
        try {
          console.log('📥 Iniciando carga de datos para día:', dayNumber, 'semana:', weekNumber);
          
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          console.log('📦 Datos de parámetros:', JSON.stringify(paramDayData, null, 2));
          
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            // Hacer copia profunda de ejercicios para evitar referencias compartidas
            loadedExercises = (paramDayData.exercises || []).map((ex: Exercise, idx: number) => ({
              ...ex,
              id: ex.id || `${Date.now()}_${idx}_${Math.random()}`, // Asegurar ID único
              reps: [...(ex.reps || [])],
              setTypes: (ex.setTypes || []).map((st: SetInfo) => ({
                type: st.type,
                reps: st.reps,
                rir: st.rir,
              })),
            }));
            console.log('✅ Cargados', loadedExercises.length, 'ejercicios desde parámetros (copia profunda)');
            console.log('📂 IDs de ejercicios desde params:', loadedExercises.map(ex => ({ name: ex.name, id: ex.id })));
            if (isMounted && paramDayData.name) {
              setDayName(paramDayData.name);
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          const asyncKey = `week_${weekNumber}_day_${dayNumber}_data`;
          console.log('🔑 Buscando en AsyncStorage con key:', asyncKey);
          const dayDataStr = await AsyncStorage.getItem(asyncKey);
          
          if (dayDataStr) {
            console.log('📦 Datos encontrados en AsyncStorage');
            const savedDayData = parseSafeJSON(dayDataStr, {});
            console.log('📦 Datos parseados:', JSON.stringify(savedDayData, null, 2));
            
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber) {
              // Hacer copia profunda de ejercicios para evitar referencias compartidas
              loadedExercises = (savedDayData.exercises || []).map((ex: Exercise, idx: number) => ({
                ...ex,
                id: ex.id || `${Date.now()}_${idx}_${Math.random()}`, // Asegurar ID único
                reps: [...(ex.reps || [])],
                setTypes: (ex.setTypes || []).map((st: SetInfo) => ({
                  type: st.type,
                  reps: st.reps,
                  rir: st.rir,
                })),
              }));
              console.log('✅ Cargados', loadedExercises.length, 'ejercicios desde AsyncStorage (copia profunda)');
              console.log('📂 IDs de ejercicios cargados:', loadedExercises.map(ex => ({ name: ex.name, id: ex.id })));
              if (isMounted) {
                if (savedDayData.name) {
                  setDayName(savedDayData.name);
                }
                setExercises(loadedExercises);
              }
            }
          } else {
            console.log('⚠️ No hay datos en AsyncStorage para esta key');
            if (isMounted && loadedExercises.length === 0) {
              // Si no hay datos guardados, usar los valores por defecto
              console.log('📝 Inicializando día vacío');
              setDayName(t('workout.dayName', { day: dayNumber }));
              setExercises([]);
            } else if (isMounted) {
              console.log('✅ Usando ejercicios de parámetros:', loadedExercises.length);
              setExercises(loadedExercises);
            }
          }
        } catch (error) {
          console.error('❌ Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(t('workout.dayName', { day: dayNumber }));
            setExercises([]);
            loadedExercises = [];
          }
        }
        
        // Ahora verificar si hay un ejercicio seleccionado usando los ejercicios cargados
        await checkSelectedExercise(loadedExercises);
      };
      
      initialize();
      
      return () => {
        isMounted = false;
      };
    }, [dayNumber, params.dayData])
  );

  // Componente wrapper condicional
  const WrapperComponent = DRAG_DROP_ENABLED && GestureHandlerRootView 
    ? GestureHandlerRootView 
    : React.Fragment;
  const wrapperProps = (DRAG_DROP_ENABLED && GestureHandlerRootView) 
    ? { style: { flex: 1 } } 
    : {};

  return (
    <WrapperComponent {...wrapperProps}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Navegar directamente a custom-plan-days con los parámetros correctos
            router.push({
              pathname: '/(tabs)/workout/custom-plan-days',
              params: {
                daysPerWeek: params.daysPerWeek as string || '',
                equipment: JSON.stringify(equipment),
                planId: params.planId as string || '',
                weekNumber: weekNumber.toString(),
              },
            } as any);
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        {isEditingDayName ? (
          <TextInput
            style={styles.dayNameInput}
            value={dayName}
            onChangeText={setDayName}
            onBlur={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se sale del campo
              try {
                const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() || t('workout.dayName', { day: dayNumber });
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || t('workout.dayName', { day: dayNumber }),
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            onSubmitEditing={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se presiona Enter
              try {
                const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() ||  t('workout.dayName', { day: dayNumber }),
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || t('workout.dayName', { day: dayNumber }),
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            autoFocus
            placeholder={t('workout.dayPlaceholder', { day: dayNumber })}
            placeholderTextColor="#999"
          />
        ) : (
          <TouchableOpacity
            style={styles.dayNameContainer}
            onPress={() => setIsEditingDayName(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {dayName}
            </Text>
            <Ionicons name="create-outline" size={16} color="#ffb300" style={styles.editIcon} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{t('customPlan.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Toggle para mostrar/ocultar temporizadores */}
        {exercises.length > 0 && (
          <TouchableOpacity
            style={styles.restTimerToggleContainer}
            onPress={() => setShowRestTimers(!showRestTimers)}
            activeOpacity={0.7}
          >
            <View style={styles.restTimerToggleContent}>
              <Ionicons name="timer-outline" size={20} color="#ffb300" />
              <Text style={styles.restTimerToggleText}>
  {t('customPlan.enableRestTimer')}
</Text>
            </View>
            <View style={[
              styles.toggleSwitch,
              showRestTimers && styles.toggleSwitchActive
            ]}>
              <View style={[
                styles.toggleKnob,
                showRestTimers && styles.toggleKnobActive
              ]} />
            </View>
          </TouchableOpacity>
        )}

        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>{t('customPlan.noExercisesAdded')}</Text>
<Text style={styles.emptyStateSubtext}>{t('customPlan.addExercisesForThisDay')}</Text>

          </View>
        ) : (
          <View style={styles.exercisesList}>
            {DRAG_DROP_ENABLED ? (
              // ============================================================================
              // VERSIÓN CON DRAG & DROP (Solo para builds de producción)
              // ============================================================================
              <DraggableFlatList
                data={exercises}
                onDragEnd={({ data }: { data: Exercise[] }) => handleReorderExercises(data)}
                keyExtractor={(item: Exercise) => item.id}
                renderItem={({ item: exercise, drag, isActive, getIndex }: { item: Exercise; drag: () => void; isActive: boolean; getIndex: () => number | undefined }) => {
                  const exerciseIdx = getIndex() ?? 0;
                  console.log(`🏋️ Renderizando ejercicio ${exerciseIdx + 1}: ${exercise.name} (ID: ${exercise.id})`);
                  return (
                  <ScaleDecorator>
                    <View 
                      key={exercise.id} 
                      style={[
                        styles.exerciseCard,
                        isActive && styles.exerciseCardDragging
                      ]}
                    >
                      <View style={styles.exerciseHeader}>
                        <TouchableOpacity
                          onLongPress={drag}
                          style={styles.dragHandle}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="reorder-three" size={24} color="#666" />
                        </TouchableOpacity>
                        <View style={styles.exerciseTitleContainer}>
                          <View style={styles.exerciseNumberBadge}>
                            <Text style={styles.exerciseNumberText}>{exerciseIdx + 1}</Text>
                          </View>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                        </View>
                        <View style={styles.exerciseActions}>
                          <TouchableOpacity
                            onPress={() => setEditingExercise(exercise)}
                            style={styles.editButton}
                          >
                            <Ionicons name="create-outline" size={20} color="#ffb300" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteExercise(exercise.id)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={20} color="#F44336" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Temporizador de Descanso */}
                      {showRestTimers && (
                        <TouchableOpacity
                          style={styles.restTimerContainer}
                          onPress={() => handleOpenRestTimerModal(exercise.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="timer-outline" size={18} color="#ffb300" />
                          <Text style={styles.restTimerLabel}>{t('customPlan.restTimerLabel')}</Text>
                          <Text style={styles.restTimerValue}>
                            {formatRestTime(exercise.rest_seconds || 120)}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color="#666" />
                        </TouchableOpacity>
                      )}

                      <View style={styles.exerciseDetails}>
                        <TouchableOpacity
                          style={styles.setsHeader}
                          onPress={() => toggleExerciseExpansion(exercise.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.setsHeaderLeft}>
                            <Ionicons name="list" size={16} color="#999" />
                            <Text style={styles.setsHeaderText}>
                            {t('customPlan.setsCount', {
  count: exercise.sets,
  unit: exercise.sets === 1 ? t('customPlan.set_singular') : t('customPlan.set_plural'),
})}
                            </Text>
                            <Ionicons
                              name={expandedExercises.has(exercise.id) ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#ffb300"
                            />
                          </View>
                        </TouchableOpacity>
                        {expandedExercises.has(exercise.id) && (
                          <View style={styles.setsGrid}>
                            {(exercise.setTypes || []).map((setInfo: SetInfo, idx: number) => {
                            // Calcular label de la serie
                            const label = (() => {
                              switch (setInfo.type) {
                                case 'warmup': return 'C';
                                case 'drop': return 'D';
                                case 'failure':
                                case 'normal':
                                default:
                                  let seriesCount = 0;
                                  for (let i = 0; i <= idx; i++) {
                                    const type = (exercise.setTypes || [])[i]?.type || 'normal';
                                    if (type === 'normal' || type === 'failure') {
                                      seriesCount++;
                                    }
                                  }
                                  return setInfo.type === 'failure' ? `${seriesCount}` : `${seriesCount}`;
                              }
                            })();
                            
                            // Determinar color y estilo del badge
                            const badgeStyle = (() => {
                              switch (setInfo.type) {
                                case 'warmup': return styles.setBadgeWarmup;
                                case 'failure': return styles.setBadgeFailure;
                                case 'drop': return styles.setBadgeDrop;
                                default: return styles.setBadgeNormal;
                              }
                            })();
                            
                              return (
                                <View key={`${exercise.id}_set_${idx}`} style={styles.setBadge}>
                                  <View style={[styles.setBadgeNumber, badgeStyle]}>
                                    <Text style={styles.setBadgeNumberText}>
                                      {label}{setInfo.type === 'failure' ? ' F' : ''}
                                    </Text>
                                  </View>
                                  <View style={styles.setBadgeContent}>
                                    {setInfo.type === 'warmup' ? (
                                      <Text style={styles.setBadgeReps}>{t('customPlan.warmupLabel')}</Text>
                                    ) : setInfo.type === 'failure' ? (
                                      <View style={styles.setBadgeInfo}>
                                        <Text style={styles.setBadgeReps}>
                                          {setInfo.reps || 0} reps
                                        </Text>
                                        <Text style={styles.setBadgeFailureText}>{t('customPlan.toFailure')}</Text>
                                        </View>
                                    ) : (
                                      <View style={styles.setBadgeInfo}>
                                        <Text style={styles.setBadgeReps}>
                                        {t('customPlan.repsShort', { reps: setInfo.reps || 0 })}
                                        </Text>
                                        {setInfo.rir !== null && setInfo.rir !== undefined && (
                                          <Text style={styles.setBadgeRir}>RIR {setInfo.rir}</Text>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  </ScaleDecorator>
                  );
                }}
                scrollEnabled={false}
                containerStyle={{ flexGrow: 0 }}
              />
            ) : (
              // ============================================================================
              // VERSIÓN SIMPLE (Para desarrollo en Expo Go)
              // ============================================================================
              <>
                {exercises.map((exercise, exerciseIdx) => {
                  console.log(`🏋️ Renderizando ejercicio ${exerciseIdx + 1}: ${exercise.name} (ID: ${exercise.id})`);
                  return (
                    <View 
                      key={exercise.id} 
                      style={styles.exerciseCard}
                    >
                      <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseTitleContainer}>
                    <View style={styles.exerciseNumberBadge}>
                      <Text style={styles.exerciseNumberText}>{exerciseIdx + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => setEditingExercise(exercise)}
                      style={styles.editButton}
                    >
                      <Ionicons name="create-outline" size={20} color="#ffb300" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(exercise.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Temporizador de Descanso */}
                {showRestTimers && (
                  <TouchableOpacity
                    style={styles.restTimerContainer}
                    onPress={() => handleOpenRestTimerModal(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="timer-outline" size={18} color="#ffb300" />
                    <Text style={styles.restTimerLabel}>Temporizador de Descanso:</Text>
                    <Text style={styles.restTimerValue}>
                      {formatRestTime(exercise.rest_seconds || 120)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                )}

                <View style={styles.exerciseDetails}>
                  <TouchableOpacity
                    style={styles.setsHeader}
                    onPress={() => toggleExerciseExpansion(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.setsHeaderLeft}>
                      <Ionicons name="list" size={16} color="#999" />
                      <Text style={styles.setsHeaderText}>
                        {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
                      </Text>
                      <Ionicons
                        name={expandedExercises.has(exercise.id) ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#ffb300"
                      />
                    </View>
                  </TouchableOpacity>
                  {expandedExercises.has(exercise.id) && (
                    <View style={styles.setsGrid}>
                      {(exercise.setTypes || []).map((setInfo, idx) => {
                      // Calcular label de la serie
                      const label = (() => {
                        switch (setInfo.type) {
                          case 'warmup': return 'C';
                          case 'drop': return 'D';
                          case 'failure':
                          case 'normal':
                          default:
                            let seriesCount = 0;
                            for (let i = 0; i <= idx; i++) {
                              const type = (exercise.setTypes || [])[i]?.type || 'normal';
                              if (type === 'normal' || type === 'failure') {
                                seriesCount++;
                              }
                            }
                            return setInfo.type === 'failure' ? `${seriesCount}` : `${seriesCount}`;
                        }
                      })();
                      
                      // Determinar color y estilo del badge
                      const badgeStyle = (() => {
                        switch (setInfo.type) {
                          case 'warmup': return styles.setBadgeWarmup;
                          case 'failure': return styles.setBadgeFailure;
                          case 'drop': return styles.setBadgeDrop;
                          default: return styles.setBadgeNormal;
                        }
                      })();
                      
                        return (
                          <View key={`${exercise.id}_set_${idx}`} style={styles.setBadge}>
                            <View style={[styles.setBadgeNumber, badgeStyle]}>
                              <Text style={styles.setBadgeNumberText}>
                                {label}{setInfo.type === 'failure' ? ' F' : ''}
                              </Text>
                            </View>
                            <View style={styles.setBadgeContent}>
                              {setInfo.type === 'warmup' ? (
                                <Text style={styles.setBadgeReps}>
  {t('customPlan.warmup')}
</Text>
                              ) : setInfo.type === 'failure' ? (
                                <View style={styles.setBadgeInfo}>
                                  <Text style={styles.setBadgeReps}>
                                    {setInfo.reps || 0} reps
                                  </Text>
                                  <Text style={styles.setBadgeFailureText}>
  {t('customPlan.toFailure')}
</Text>
                                </View>
                              ) : (
                                <View style={styles.setBadgeInfo}>
                                  <Text style={styles.setBadgeReps}>
                                    {setInfo.reps || 0} reps
                                  </Text>
                                  {setInfo.rir !== null && setInfo.rir !== undefined && (
                                    <Text style={styles.setBadgeRir}>RIR {setInfo.rir}</Text>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
                  
                  {/* Mostrar notas del ejercicio si existen */}
                  {exercise.notes && (
                    <View style={styles.exerciseNotesContainer}>
                      <Ionicons name="document-text-outline" size={14} color="#ffb300" />
                      <Text style={styles.exerciseNotesText} numberOfLines={2}>
                        {exercise.notes}
                      </Text>
                    </View>
                  )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddExercise}
        >
          <Ionicons name="add-circle" size={24} color="#ffb300" />
          <Text style={styles.addButtonText}>{t('customPlan.addExercise')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para editar series y repeticiones */}
      <Modal
        visible={editingExercise !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingExercise(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingExercise(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <ScrollView
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <Text style={styles.modalTitle}>
                {t('customPlan.configureExercise', { name: editingExercise?.name ?? '' })}
                </Text>

                <View style={styles.inputGroup}>
                 
<Text style={styles.label}>{t('customPlan.setsLabel')}</Text>
                  
                  {setTypes.length > 0 ? (
                    <View>
                      {/* Fila de encabezados */}
                      <View style={styles.seriesHeaderRow}>
                        <View style={styles.seriesHeaderCell}>
                          <Text style={styles.seriesHeaderText}>#</Text>
                        </View>
                        <View style={[styles.seriesHeaderCell, styles.seriesHeaderCellReps]}>
                          <Text style={styles.seriesHeaderText}>REPS</Text>
                        </View>
                        <View style={styles.seriesHeaderCell}>
                          <Text style={styles.seriesHeaderText}>RIR</Text>
                        </View>
                        <View style={styles.seriesHeaderCellAction} />
                      </View>
                      
                      {/* Filas de series */}
                      {setTypes.map((setType, idx) => {
                        const setLabel = getSetLabel(setType, idx);
                        const buttonColor = getSetButtonColor(setType);
                        const isWarmup = setType.type === 'warmup';
                        
                        return (
                          <View key={idx} style={styles.repInputRow}>
                            <Pressable
                              style={[styles.setTypeButton, { backgroundColor: buttonColor }]}
                              onPress={() => {
                                console.log('✅ PRESS detectado para serie', idx);
                                setSelectedSetIndex(idx);
                                setShowSetTypeModal(true);
                              }}
                              onPressIn={() => console.log('👆 PRESS IN detectado')}
                              onPressOut={() => console.log('👆 PRESS OUT detectado')}
                            >
                              {({ pressed }) => (
                                <Text style={[styles.setTypeButtonText, pressed && { opacity: 0.7 }]}>
                                  {setLabel}
                                </Text>
                              )}
                            </Pressable>
                            {isWarmup ? (
                              // Para calentamiento, mostrar texto informativo en lugar de inputs
                              <View style={styles.warmupPlaceholder}>
                                <Text style={styles.warmupPlaceholderText}>
                                {t('customPlan.warmupHint')}

                                </Text>
                              </View>
                            ) : (
                              <>
                                <TextInput
                                  style={styles.repInput}
                                  value={reps[idx] || ''}
                                  onChangeText={(text) => handleRepsChange(idx, text)}
                                  keyboardType="number-pad"
                                  placeholder="0"
                                />
                                <TextInput
                                  style={styles.rirInput}
                                  value={rirValues[idx] || ''}
                                  onChangeText={(text) => handleRirChange(idx, text)}
                                  keyboardType="number-pad"
                                  placeholder="-"
                                  placeholderTextColor="#666"
                                />
                              </>
                            )}
                            <TouchableOpacity
                              style={styles.removeSetButton}
                              onPress={() => handleRemoveSet(idx)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptySeriesText}>
  {t('customPlan.addSetsForThisExercise')}
</Text>

                  )}
                  
                  {/* Botón Agregar Serie abajo */}
                  <TouchableOpacity
                    style={styles.addSetButtonBottom}
                    onPress={handleAddSet}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={22} color="#ffb300" />
                    <Text style={styles.addSetButtonText}>{t('customPlan.addSet')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Campo de notas del ejercicio */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('customPlan.exerciseNotes')}</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={exerciseNotes}
                    onChangeText={setExerciseNotes}
                    placeholder={t('customPlan.exerciseNotesPlaceholder')}
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setEditingExercise(null);
                      setSets('');
                      setReps([]);
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleSaveExercise}
                  >
                    <Text style={styles.modalButtonSaveText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>

        {/* Modal ANIDADO para seleccionar tipo de serie */}
        <Modal
          key={`setTypeModal-${selectedSetIndex}`}
          visible={showSetTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('⛔ Cerrando modal de tipo de serie');
            setShowSetTypeModal(false);
            setSelectedSetIndex(-1);
          }}
          onShow={() => {
            console.log('✅ Modal de tipo de serie MOSTRADO');
            console.log('📊 selectedSetIndex:', selectedSetIndex);
          }}
        >
        <Pressable
          style={styles.setTypeModalOverlay}
          onPress={() => {
            console.log('🚪 Click en overlay - cerrando modal');
            setShowSetTypeModal(false);
            setSelectedSetIndex(-1);
          }}
        >
          <Pressable
            style={styles.setTypeModalContent}
            onPress={(e) => {
              e.stopPropagation();
              console.log('🛑 Click dentro del contenido - no cerrar');
            }}
          >
            <Text style={styles.setTypeModalTitle}>{t('customPlan.selectSetType')}</Text>
            
            <View style={styles.setTypeOptionsContainer}>
              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟡 Seleccionado: Calentamiento');
                  handleChangeSetType('warmup');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconWarmup]}>
                <Text style={styles.setTypeIconTextLarge}>
  {i18n.language.startsWith('en') ? 'W' : 'C'}
</Text>
                </View>
                <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>
  {t('customPlan.setTypeWarmup')}
</Text>
<Text style={styles.setTypeOptionDesc}>
  {t('customPlan.setTypeWarmupDesc')}
</Text>

                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟢 Seleccionado: Normal');
                  handleChangeSetType('normal');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconNormal]}>
                  <Text style={styles.setTypeIconTextLarge}>1</Text>
                </View>
                <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>
  {t('customPlan.setType.normal')}
</Text>
<Text style={styles.setTypeOptionDesc}>
  {t('customPlan.setType.normalDesc')}
</Text>

                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🔴 Seleccionado: Al Fallo');
                  handleChangeSetType('failure');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconFailure]}>
                  <Text style={styles.setTypeIconTextLarge}>F</Text>
                </View>
                <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>
  {t('customPlan.setType.failure')}
</Text>
<Text style={styles.setTypeOptionDesc}>
  {t('customPlan.setType.failureDesc')}
</Text>

                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟣 Seleccionado: Drop');
                  handleChangeSetType('drop');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconDrop]}>
                  <Text style={styles.setTypeIconTextLarge}>D</Text>
                </View>
                <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>
  {t('customPlan.setType.drop')}
</Text>
<Text style={styles.setTypeOptionDesc}>
  {t('customPlan.setType.dropDesc')}
</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.setTypeModalCloseButton}
              onPress={() => {
                console.log('❌ Cancelar presionado');
                setShowSetTypeModal(false);
                setSelectedSetIndex(-1);
              }}
            >
<Text style={styles.setTypeModalCloseText}>
  {t('common.cancel')}
</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </Modal>
      </Modal>

      {/* Modal de Configuración de Tiempo de Descanso */}
      <Modal
        visible={showRestTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestTimerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRestTimerModal(false)}
        >
          <Pressable
            style={styles.restTimerModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.restTimerModalHeader}>
              <Ionicons name="settings" size={24} color="#ffb300" />
              <Text style={styles.restTimerModalTitle}>
  {t('workout.restTimerTitle')}
</Text>
            </View>

            {/* Selector de Tiempo */}
            <View style={styles.timePickerContainer}>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeDisplayText}>
                  {formatRestTime(tempRestTime)}
                </Text>
              </View>
              
              <View style={styles.timeAdjustButtons}>
                <TouchableOpacity
                  style={styles.timeAdjustButton}
                  onPress={() => setTempRestTime(Math.max(15, tempRestTime - 15))}
                >
                  <Text style={styles.timeAdjustButtonText}>-15s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeAdjustButton}
                  onPress={() => setTempRestTime(tempRestTime + 15)}
                >
                  <Text style={styles.timeAdjustButtonText}>+15s</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.restTimerModalActions}>
              <TouchableOpacity
                style={styles.restTimerCancelButton}
                onPress={() => setShowRestTimerModal(false)}
              >
                <Text style={styles.restTimerCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restTimerSaveButton}
                onPress={handleSaveRestTime}
              >
                <Text style={styles.restTimerSaveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AlertComponent />
      </SafeAreaView>
    </WrapperComponent>
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
    gap: 12,
  },
  backButton: {
    padding: 8,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  dayNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 8,
    maxWidth: '60%',
  },
  dayNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    maxWidth: '60%',
    borderColor: '#ffb300',
  },
  editIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffb300',
    borderRadius: 8,
    flexShrink: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
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
  },
  exercisesList: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseCardDragging: {
    backgroundColor: '#2a2a2a',
    borderColor: '#ffb300',
    borderWidth: 2,
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  exerciseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exerciseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  exerciseDetails: {
    gap: 0,
  },
  exerciseNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  exerciseNotesText: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  setsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  setsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#333',
    gap: 10,
  },
  setBadgeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setBadgeWarmup: {
    backgroundColor: '#4CAF50',
  },
  setBadgeNormal: {
    backgroundColor: '#ffb300',
  },
  setBadgeFailure: {
    backgroundColor: '#F44336',
  },
  setBadgeDrop: {
    backgroundColor: '#9C27B0',
  },
  setBadgeNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  setBadgeContent: {
    flexDirection: 'column',
  },
  setBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setBadgeReps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  setBadgeRir: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffb300',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  setBadgeFailureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 20,
    width: '95%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  repInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addSetButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb300',
    marginTop: 8,
  },
  addSetButtonText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSetButton: {
    padding: 4,
  },
  emptySeriesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  seriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  seriesHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  seriesHeaderCellReps: {
    flex: 1,
  },
  seriesHeaderCellAction: {
    width: 40,
  },
  seriesHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffb300',
    textTransform: 'uppercase',
  },
  repInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#444',
  },
  notesInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 80,
    textAlign: 'center',
    minHeight: 52,
  },
  rirInput: {
    width: 70,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffb300',
    borderWidth: 1,
    borderColor: '#ffb300',
    textAlign: 'center',
    minHeight: 52,
  },
  warmupPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    minHeight: 52,
    marginRight: 8,
  },
  warmupPlaceholderText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonSave: {
    backgroundColor: '#ffb300',
  },
  modalButtonCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  setTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 60,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeButtonText: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
  },
  setTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  setTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeIconWarmup: {
    backgroundColor: '#4CAF50',
  },
  setTypeIconNormal: {
    backgroundColor: '#ffb300',
  },
  setTypeIconFailure: {
    backgroundColor: '#ff4444',
  },
  setTypeIconDrop: {
    backgroundColor: '#9C27B0',
  },
  setTypeIconText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setTypeInfo: {
    flex: 1,
  },
  setTypeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  setTypeOptionDesc: {
    fontSize: 12,
    color: '#888',
  },
  setTypeOptionDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    justifyContent: 'center',
    gap: 8,
  },
  setTypeOptionTextDelete: {
    color: '#ff4444',
    flex: 0,
  },
  // Estilos para modal de tipo de serie (compacto)
  setTypeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Más oscuro para destacar
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  setTypeModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400, // Más compacto
    borderWidth: 2,
    borderColor: '#ffb300',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setTypeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 16,
    textAlign: 'center',
  },
  setTypeOptionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  setTypeIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeIconTextLarge: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setTypeModalCloseButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  setTypeModalCloseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Estilos para el temporizador de descanso
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 14,
    gap: 8,
  },
  restTimerLabel: {
    fontSize: 15,
    color: '#ffb300',
    fontWeight: '500',
  },
  restTimerValue: {
    fontSize: 15,
    color: '#ffb300',
    fontWeight: '600',
    marginRight: 4,
  },
  restTimerModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  restTimerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  restTimerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timePickerContainer: {
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  timeDisplay: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1a1a1a',
    borderWidth: 8,
    borderColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timeAdjustButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  timeAdjustButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  timeAdjustButtonText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: '600',
  },
  restTimerModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  restTimerCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  restTimerCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  restTimerSaveButton: {
    flex: 1,
    backgroundColor: '#ffb300',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  restTimerSaveButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para el toggle de temporizadores
  restTimerToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  restTimerToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restTimerToggleText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#ffb300',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    backgroundColor: '#1a1a1a',
    transform: [{ translateX: 22 }],
  },
});

