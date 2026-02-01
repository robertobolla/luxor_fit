import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';
import { useCustomAlert } from '../../../src/components/CustomAlert';
import { updateStudentWorkoutPlan } from '../../../src/services/trainerService';
import { useTutorial } from '../../../src/contexts/TutorialContext';
import { TutorialTooltip } from '../../../src/components/TutorialTooltip';

interface DayData {
  dayNumber: number;
  name?: string;
  exercises: any[];
}

interface WeekData {
  weekNumber: number;
  days: DayData[];
}

export default function CustomPlanDaysScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const equipment = JSON.parse((params.equipment as string) || '[]');
  const editingPlanId = params.planId as string | undefined;
  const isTrainerView = params.isTrainerView === 'true';
  const studentId = params.studentId as string | undefined;
  const { showAlert, AlertComponent } = useCustomAlert();

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [planName, setPlanName] = useState<string>('');
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isPlanCurrentlyActive, setIsPlanCurrentlyActive] = useState(false);

  // Tutorial states
  const { 
    shouldShowTooltip,
    completeTutorial,
    markTooltipShown 
  } = useTutorial();
  const [showCustomPlanTooltips, setShowCustomPlanTooltips] = useState(false);
  
  // Refs para prevenir race conditions en AsyncStorage
  const isLoadingFromStorage = React.useRef(false);
  const isSavingToStorage = React.useRef(false);
  
  // Días de la semana actual
  const currentWeekDays = weeks[currentWeekIndex]?.days || [];

  useEffect(() => {
    // Si estamos editando un plan existente, cargarlo desde Supabase
    const loadExistingPlan = async () => {
      if (!editingPlanId || !user) {
        // Si no hay planId, inicializar plan vacío
        initializeEmptyPlan();
        return;
      }

      try {
        console.log('🔄 Cargando plan existente desde Supabase:', editingPlanId);
        console.log('👨‍🏫 Modo entrenador:', isTrainerView, 'StudentId:', studentId);
        
        // Cargar el plan desde Supabase
        // Si es modo entrenador, cargar el plan del alumno
        const targetUserId = isTrainerView && studentId ? studentId : user.id;
        
        const { data: plan, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('id', editingPlanId)
          .eq('user_id', targetUserId)
          .single();

        if (error) {
          console.error('❌ Error cargando plan:', error);
          showAlert(
            'Error al cargar plan',
            'No se pudo cargar el plan desde la base de datos. Se iniciará un plan vacío.',
            [{ text: 'OK' }],
            { icon: 'alert-circle', iconColor: '#F44336' }
          );
          
          initializeEmptyPlan();
          return;
        }

        if (!plan) {
          console.error('❌ Plan no encontrado');
          initializeEmptyPlan();
          return;
        }

        console.log('✅ Plan cargado:', plan.plan_name);
        console.log('📦 plan_data:', JSON.stringify(plan.plan_data, null, 2));

        // Verificar si este plan es el activo actualmente
        // Consultamos directamente is_active de workout_plans
        const { data: currentPlan, error: planError } = await supabase
          .from('workout_plans')
          .select('is_active')
          .eq('id', editingPlanId)
          .single();

        const isActive = currentPlan?.is_active === true;
        
        setIsPlanCurrentlyActive(isActive);
        console.log('🔍 Verificación plan activo:', {
          planId: editingPlanId,
          is_active_from_db: currentPlan?.is_active,
          isActive,
          planError
        });

        // Extraer datos del plan
        const planData = plan.plan_data as { multi_week_structure?: any[]; weekly_structure?: any[] } | null;
        setPlanName(plan.plan_name);

        // Guardar planId en AsyncStorage
        await AsyncStorage.setItem('editing_plan_id', editingPlanId);
        await AsyncStorage.setItem('custom_plan_name', plan.plan_name);

        // Cargar estructura multi-semana si existe, sino usar weekly_structure
        const multiWeekStructure = planData?.multi_week_structure;
        const weeklyStructure = planData?.weekly_structure;
        
        console.log('🔍 ========================================');
        console.log('🔍 ANALIZANDO ESTRUCTURA DEL PLAN');
        console.log('🔍 ========================================');
        console.log('  - Tiene multi_week_structure:', !!multiWeekStructure && multiWeekStructure.length > 0);
        console.log('  - Semanas en multi_week:', multiWeekStructure?.length || 0);
        console.log('  - Tiene weekly_structure:', !!weeklyStructure && weeklyStructure.length > 0);
        console.log('  - Días en weekly:', weeklyStructure?.length || 0);
        
        // Detectar si es un plan de IA (tiene campos específicos)
        const isAIPlan = !!(planData?.training_base || planData?.key_principles || planData?.progression);
        console.log('  - Es plan de IA:', isAIPlan);
        
        if (weeklyStructure && weeklyStructure.length > 0) {
          const sampleDay = weeklyStructure[0];
          console.log('  - Primer día (muestra):');
          console.log('    - day:', sampleDay?.day);
          console.log('    - focus:', sampleDay?.focus);
          console.log('    - exercises:', sampleDay?.exercises?.length || 0);
          if (sampleDay?.exercises?.[0]) {
            console.log('    - Primer ejercicio (muestra):');
            console.log('      - name:', sampleDay.exercises[0].name);
            console.log('      - reps (tipo):', typeof sampleDay.exercises[0].reps, '=', sampleDay.exercises[0].reps);
            console.log('      - rest:', sampleDay.exercises[0].rest);
            console.log('      - rest_seconds:', sampleDay.exercises[0].rest_seconds);
          }
        }
        console.log('🔍 ========================================');

        if (multiWeekStructure && multiWeekStructure.length > 0) {
          // Plan multi-semana
          console.log('📅 Cargando plan multi-semana:', multiWeekStructure.length, 'semanas');
          
          const loadedWeeks: WeekData[] = [];
          
          for (const weekData of multiWeekStructure) {
            console.log(`  📅 Semana ${weekData.week_number}: ${weekData.days?.length || 0} días`);
            const weekDays: DayData[] = [];
            
            for (const dayData of weekData.days || []) {
              const dayNumber = weekDays.length + 1;
              
              // Validar que dayData tenga datos (permitir tanto 'day' como 'focus' para planes de IA)
              if (!dayData) {
                console.log(`⚠️ Día ${dayNumber} es null/undefined, saltando`);
                continue;
              }
              
              // Los planes de IA usan 'day' como "Día 1" y 'focus' como "Pecho y Tríceps"
              const dayName = dayData.day || dayData.focus || `Día ${dayNumber}`;
              
              console.log(`    📆 Cargando día ${dayNumber}: "${dayName}" con ${dayData.exercises?.length || 0} ejercicios`);
              
              // Hacer copia profunda de ejercicios y convertir formato de IA a formato personalizado
              const exercises = (dayData.exercises || []).map((ex: any, idx: number) => {
                // Los planes de IA tienen 'reps' como string (ej: "8-10 @ RIR 2")
                // Convertir a array de números
                let repsArray: number[] = [10, 10, 10];
                let rirValue: number | null = null;
                
                if (Array.isArray(ex.reps)) {
                  // Ya es array (formato personalizado)
                  repsArray = [...ex.reps];
                } else if (typeof ex.reps === 'string') {
                  // Formato de IA: "8-10 @ RIR 2" o "8-10"
                  const repsMatch = ex.reps.match(/(\d+)(?:-(\d+))?/);
                  const rirMatch = ex.reps.match(/RIR\s*(\d+)/i);
                  
                  if (repsMatch) {
                    const minReps = parseInt(repsMatch[1]);
                    const maxReps = repsMatch[2] ? parseInt(repsMatch[2]) : minReps;
                    const baseReps = Math.round((minReps + maxReps) / 2);
                    repsArray = Array(ex.sets || 3).fill(baseReps);
                  }
                  
                  if (rirMatch) {
                    rirValue = parseInt(rirMatch[1]);
                  }
                }
                
                // Convertir 'rest' (string como "90s") a 'rest_seconds' (número)
                let restSeconds = 120;
                if (typeof ex.rest_seconds === 'number') {
                  restSeconds = ex.rest_seconds;
                } else if (typeof ex.rest === 'string') {
                  const restMatch = ex.rest.match(/(\d+)/);
                  if (restMatch) {
                    restSeconds = parseInt(restMatch[1]);
                  }
                }
                
                // Crear setTypes si no existe
                const numSets = ex.sets || 3;
                let setTypesArray = [];
                if (Array.isArray(ex.setTypes) && ex.setTypes.length > 0) {
                  setTypesArray = ex.setTypes.map((st: any) => ({
                    type: st.type || 'normal',
                    reps: st.reps || repsArray[0] || 10,
                    rir: st.rir ?? rirValue,
                  }));
                } else {
                  setTypesArray = repsArray.map((rep) => ({
                    type: 'normal' as const,
                    reps: rep,
                    rir: rirValue,
                  }));
                }
                
                // Si es una superserie, mantener su estructura especial
                if (ex.type === 'superset') {
                  return {
                    id: ex.id || `superset_${weekData.week_number}_${dayNumber}_${idx}_${Date.now()}`,
                    type: 'superset',
                    exercises: ex.exercises || [],
                    sets: ex.sets || 1,
                    rest_seconds: ex.rest_seconds || 90,
                  };
                }
                
                return {
                  id: ex.id || `${ex.name}_${weekData.week_number}_${dayNumber}_${idx}_${Date.now()}`,
                  name: ex.name || 'Ejercicio sin nombre',
                  sets: numSets,
                  reps: repsArray,
                  rest_seconds: restSeconds,
                  setTypes: setTypesArray,
                };
              });
              
              console.log(`      ✅ ${exercises.length} ejercicios convertidos`);

              weekDays.push({
                dayNumber,
                name: dayName,
                exercises,
              });

              // Guardar en AsyncStorage
              const key = `week_${weekData.week_number}_day_${dayNumber}_data`;
              await AsyncStorage.setItem(key, JSON.stringify({
                dayNumber,
                name: dayName,
                exercises,
              }));
            }

            loadedWeeks.push({
              weekNumber: weekData.week_number,
              days: weekDays,
            });
          }

          // No agregamos días vacíos - cada semana mantiene su cantidad de días
          setWeeks(loadedWeeks);
          await AsyncStorage.setItem('custom_plan_weeks_count', loadedWeeks.length.toString());
          setInitialLoadComplete(true);
          
        } else if (weeklyStructure && weeklyStructure.length > 0) {
          // Plan de una semana (compatibilidad con planes de IA)
          console.log('📅 Cargando plan de una semana:', weeklyStructure.length, 'días');
          
          const weekDays: DayData[] = [];
          
          for (let i = 0; i < weeklyStructure.length; i++) {
            const dayData = weeklyStructure[i];
            const dayNumber = i + 1;
            
            // Validar que dayData tenga datos (permitir tanto 'day' como 'focus' para planes de IA)
            if (!dayData) {
              console.log(`⚠️ Día ${dayNumber} es null/undefined, saltando`);
              continue;
            }
            
            // Los planes de IA usan 'day' como "Día 1" y 'focus' como "Pecho y Tríceps"
            // Si no hay 'day', usar 'focus' o un nombre por defecto
            const dayName = dayData.day || dayData.focus || `Día ${dayNumber}`;
            
            console.log(`  📆 Cargando día ${dayNumber}: "${dayName}" con ${dayData.exercises?.length || 0} ejercicios`);
            
            // Hacer copia profunda de ejercicios y convertir formato de IA a formato personalizado
            const exercises = (dayData.exercises || []).map((ex: any, idx: number) => {
              // Los planes de IA tienen 'reps' como string (ej: "8-10 @ RIR 2")
              // Convertir a array de números
              let repsArray: number[] = [10, 10, 10];
              let rirValue: number | null = null;
              
              if (Array.isArray(ex.reps)) {
                // Ya es array (formato personalizado)
                repsArray = [...ex.reps];
              } else if (typeof ex.reps === 'string') {
                // Formato de IA: "8-10 @ RIR 2" o "8-10"
                const repsMatch = ex.reps.match(/(\d+)(?:-(\d+))?/);
                const rirMatch = ex.reps.match(/RIR\s*(\d+)/i);
                
                if (repsMatch) {
                  const minReps = parseInt(repsMatch[1]);
                  const maxReps = repsMatch[2] ? parseInt(repsMatch[2]) : minReps;
                  // Usar el promedio o el máximo como base para las series
                  const baseReps = Math.round((minReps + maxReps) / 2);
                  repsArray = Array(ex.sets || 3).fill(baseReps);
                }
                
                if (rirMatch) {
                  rirValue = parseInt(rirMatch[1]);
                }
              }
              
              // Convertir 'rest' (string como "90s") a 'rest_seconds' (número)
              let restSeconds = 120;
              if (typeof ex.rest_seconds === 'number') {
                restSeconds = ex.rest_seconds;
              } else if (typeof ex.rest === 'string') {
                const restMatch = ex.rest.match(/(\d+)/);
                if (restMatch) {
                  restSeconds = parseInt(restMatch[1]);
                }
              }
              
              // Crear setTypes si no existe (para ejercicios de IA)
              const numSets = ex.sets || 3;
              let setTypesArray = [];
              if (Array.isArray(ex.setTypes) && ex.setTypes.length > 0) {
                setTypesArray = ex.setTypes.map((st: any) => ({
                  type: st.type || 'normal',
                  reps: st.reps || repsArray[0] || 10,
                  rir: st.rir ?? rirValue,
                }));
              } else {
                // Crear setTypes basados en las reps calculadas
                setTypesArray = repsArray.map((rep, repIdx) => ({
                  type: 'normal' as const,
                  reps: rep,
                  rir: rirValue,
                }));
              }
              
              // Si es una superserie, mantener su estructura especial
              if (ex.type === 'superset') {
                return {
                  id: ex.id || `superset_${dayNumber}_${idx}_${Date.now()}`,
                  type: 'superset',
                  exercises: ex.exercises || [],
                  sets: ex.sets || 1,
                  rest_seconds: ex.rest_seconds || 90,
                };
              }
              
              return {
                id: ex.id || `${ex.name}_${dayNumber}_${idx}_${Date.now()}`,
                name: ex.name || 'Ejercicio sin nombre',
                sets: numSets,
                reps: repsArray,
                rest_seconds: restSeconds,
                setTypes: setTypesArray,
              };
            });
            
            console.log(`    ✅ ${exercises.length} ejercicios convertidos`);

            weekDays.push({
              dayNumber,
              name: dayName,
              exercises,
            });

            // Guardar en AsyncStorage
            const key = `week_1_day_${dayNumber}_data`;
            await AsyncStorage.setItem(key, JSON.stringify({
              dayNumber,
              name: dayName,
              exercises,
            }));
          }

          // No agregar días vacíos automáticamente

          setWeeks([{
            weekNumber: 1,
            days: weekDays,
          }]);
          await AsyncStorage.setItem('custom_plan_weeks_count', '1');
          setInitialLoadComplete(true);
        } else {
          // Plan vacío
          console.log('❌ Plan sin estructura');
          initializeEmptyPlan();
        }
        
      } catch (error) {
        console.error('❌ Error cargando plan:', error);
        showAlert(
          t('customPlan.unexpectedError'),
          t('customPlan.errorLoadingPlanEmpty'),
          [{ text: t('common.ok') }],
          { icon: 'alert-circle', iconColor: '#F44336' }
        );
        initializeEmptyPlan();
      }
    };

    // Función para inicializar un plan vacío
    const initializeEmptyPlan = async () => {
      console.log('🆕 Inicializando plan vacío con 1 día por defecto');
      
      // Siempre iniciar con 1 día
      const initialDays: DayData[] = [{
        dayNumber: 1,
        exercises: [],
      }];
      
      const initialWeek: WeekData = {
        weekNumber: 1,
        days: initialDays,
      };
      
      setWeeks([initialWeek]);
      setCurrentWeekIndex(0);
      
      // Cargar nombre del plan desde AsyncStorage si existe
      try {
        const savedPlanName = await AsyncStorage.getItem('custom_plan_name');
        if (savedPlanName) {
          setPlanName(savedPlanName);
        } else {
          setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
        }
        
        // Cargar número de semanas guardadas
        const savedWeeksCount = await AsyncStorage.getItem('custom_plan_weeks_count');
        if (savedWeeksCount) {
          const weeksCount = parseInt(savedWeeksCount);
          if (weeksCount > 1) {
            // Cargar múltiples semanas - cada semana puede tener diferente cantidad de días
            const loadedWeeks: WeekData[] = [];
            for (let w = 1; w <= weeksCount; w++) {
              // Por defecto, cada semana tendrá 1 día (el usuario puede agregar más)
              const weekDays: DayData[] = [{
                dayNumber: 1,
                exercises: [],
              }];
              loadedWeeks.push({
                weekNumber: w,
                days: weekDays,
              });
            }
            setWeeks(loadedWeeks);
          }
        }
      } catch (error) {
        console.error('Error loading plan data from AsyncStorage:', error);
        showAlert(
          'Aviso',
          'No se pudieron cargar algunos datos guardados. Se usarán valores por defecto.',
          [{ text: 'OK' }],
          { icon: 'warning', iconColor: '#ffb300' }
        );
        setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
      }
      
      setInitialLoadComplete(true);
    };
    
    loadExistingPlan();
  }, [editingPlanId, user]);

  // Mostrar tutorial la primera vez (usando ref para evitar reactivaciones)
  const tutorialShownRef = React.useRef(false);
  useEffect(() => {
    if (!tutorialShownRef.current && shouldShowTooltip('CUSTOM_PLAN') && initialLoadComplete) {
      tutorialShownRef.current = true;
      const timer = setTimeout(() => {
        setShowCustomPlanTooltips(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, initialLoadComplete]);

  // Recargar datos cuando se regresa de la pantalla de detalle del día
  useFocusEffect(
    useCallback(() => {
      const loadWeekData = async () => {
        // Solo recargar desde AsyncStorage si ya se completó la carga inicial
        if (!initialLoadComplete) {
          console.log('⏭️ Saltando useFocusEffect: carga inicial aún no completada');
          return;
        }

        // Prevenir race condition: no cargar si hay guardado en proceso
        if (isSavingToStorage.current) {
          console.log('⏳ Guardado en proceso, esperando para cargar...');
          return;
        }

        // Prevenir race condition: no cargar si ya hay carga en proceso
        if (isLoadingFromStorage.current) {
          console.log('⏳ Ya hay una carga en proceso, saltando...');
          return;
        }

        isLoadingFromStorage.current = true;
        console.log('🔄 useFocusEffect: recargando datos desde AsyncStorage');

        try {
          // Si estamos editando un plan existente, recargar is_active desde Supabase
          if (editingPlanId && user) {
            console.log('🔄 Recargando estado activo del plan...');
            
            // Consultamos directamente is_active de workout_plans
            const { data: currentPlan } = await supabase
              .from('workout_plans')
              .select('is_active')
              .eq('id', editingPlanId)
              .single();
            
            const isActive = currentPlan?.is_active === true;
            
            console.log('🔄 ======================================');
            console.log('🔄 RECARGA DE ESTADO (useFocusEffect)');
            console.log('🔄 ======================================');
            console.log('  - planId:', editingPlanId);
            console.log('  - is_active from DB:', currentPlan?.is_active);
            console.log('  - isActive (booleano):', isActive);
            console.log('  - Estableciendo isPlanCurrentlyActive =', isActive);
            console.log('🔄 ======================================');
            
            setIsPlanCurrentlyActive(isActive);
          }
          
          // Primero verificar si hay datos en AsyncStorage
          const savedWeeksCount = await AsyncStorage.getItem('custom_plan_weeks_count');
          const hasAsyncStorageData = savedWeeksCount !== null;
          
          // Si no hay datos en AsyncStorage pero tenemos editingPlanId, recargar desde Supabase
          if (!hasAsyncStorageData && editingPlanId && user) {
            console.log('📭 No hay datos en AsyncStorage, recargando desde Supabase...');
            
            // Recargar el plan directamente desde Supabase
            const targetUserId = isTrainerView && studentId ? studentId : user.id;
            
            const { data: plan, error } = await supabase
              .from('workout_plans')
              .select('*')
              .eq('id', editingPlanId)
              .eq('user_id', targetUserId)
              .single();
              
            if (error || !plan) {
              console.error('❌ Error recargando plan desde Supabase:', error);
              isLoadingFromStorage.current = false;
              return;
            }
            
            console.log('✅ Plan recargado desde Supabase:', plan.plan_name);
            
            const planData = plan.plan_data as { multi_week_structure?: any[]; weekly_structure?: any[] } | null;
            setPlanName(plan.plan_name);
            
            // Guardar planId en AsyncStorage
            await AsyncStorage.setItem('editing_plan_id', editingPlanId);
            await AsyncStorage.setItem('custom_plan_name', plan.plan_name);
            
            const multiWeekStructure = planData?.multi_week_structure;
            const weeklyStructure = planData?.weekly_structure;
            
            if (multiWeekStructure && multiWeekStructure.length > 0) {
              console.log('📅 Recargando plan multi-semana:', multiWeekStructure.length, 'semanas');
              
              const loadedWeeks: WeekData[] = [];
              
              for (const weekData of multiWeekStructure) {
                const weekDays: DayData[] = [];
                
                for (const dayData of weekData.days || []) {
                  const dayNumber = weekDays.length + 1;
                  if (!dayData) continue;
                  
                  const dayName = dayData.day || dayData.focus || `Día ${dayNumber}`;
                  
                  // Convertir ejercicios al formato correcto
                  const exercises = (dayData.exercises || []).map((ex: any, idx: number) => {
                    if (ex.type === 'superset') {
                      return {
                        id: ex.id || `superset_${weekData.week_number}_${dayNumber}_${idx}_${Date.now()}`,
                        type: 'superset',
                        exercises: ex.exercises || [],
                        sets: ex.sets || 1,
                        rest_seconds: ex.rest_seconds || 90,
                      };
                    }
                    
                    let repsArray: number[] = [10, 10, 10];
                    if (Array.isArray(ex.reps)) {
                      repsArray = [...ex.reps];
                    }
                    
                    return {
                      id: ex.id || `${ex.name}_${weekData.week_number}_${dayNumber}_${idx}_${Date.now()}`,
                      name: ex.name || 'Ejercicio sin nombre',
                      sets: ex.sets || 3,
                      reps: repsArray,
                      rest_seconds: ex.rest_seconds || 120,
                      setTypes: ex.setTypes || [],
                    };
                  });
                  
                  weekDays.push({
                    dayNumber,
                    name: dayName,
                    exercises,
                  });
                  
                  // Guardar en AsyncStorage
                  const key = `week_${weekData.week_number}_day_${dayNumber}_data`;
                  await AsyncStorage.setItem(key, JSON.stringify({
                    dayNumber,
                    name: dayName,
                    exercises,
                  }));
                }
                
                loadedWeeks.push({
                  weekNumber: weekData.week_number,
                  days: weekDays,
                });
              }
              
              setWeeks(loadedWeeks);
              await AsyncStorage.setItem('custom_plan_weeks_count', loadedWeeks.length.toString());
              
            } else if (weeklyStructure && weeklyStructure.length > 0) {
              console.log('📅 Recargando plan de una semana:', weeklyStructure.length, 'días');
              
              const weekDays: DayData[] = [];
              
              for (let i = 0; i < weeklyStructure.length; i++) {
                const dayData = weeklyStructure[i];
                const dayNumber = i + 1;
                if (!dayData) continue;
                
                const dayName = dayData.day || dayData.focus || `Día ${dayNumber}`;
                
                const exercises = (dayData.exercises || []).map((ex: any, idx: number) => {
                  if (ex.type === 'superset') {
                    return {
                      id: ex.id || `superset_${dayNumber}_${idx}_${Date.now()}`,
                      type: 'superset',
                      exercises: ex.exercises || [],
                      sets: ex.sets || 1,
                      rest_seconds: ex.rest_seconds || 90,
                    };
                  }
                  
                  let repsArray: number[] = [10, 10, 10];
                  if (Array.isArray(ex.reps)) {
                    repsArray = [...ex.reps];
                  }
                  
                  return {
                    id: ex.id || `${ex.name}_${dayNumber}_${idx}_${Date.now()}`,
                    name: ex.name || 'Ejercicio sin nombre',
                    sets: ex.sets || 3,
                    reps: repsArray,
                    rest_seconds: ex.rest_seconds || 120,
                    setTypes: ex.setTypes || [],
                  };
                });
                
                weekDays.push({
                  dayNumber,
                  name: dayName,
                  exercises,
                });
                
                const key = `week_1_day_${dayNumber}_data`;
                await AsyncStorage.setItem(key, JSON.stringify({
                  dayNumber,
                  name: dayName,
                  exercises,
                }));
              }
              
              setWeeks([{
                weekNumber: 1,
                days: weekDays,
              }]);
              await AsyncStorage.setItem('custom_plan_weeks_count', '1');
            }
            
            isLoadingFromStorage.current = false;
            console.log('✅ Recarga desde Supabase completada');
            return;
          }
          
          // Si hay datos en AsyncStorage, cargarlos normalmente
          const totalWeeks = savedWeeksCount ? parseInt(savedWeeksCount) : 1;
          
          const loadedWeeks: WeekData[] = [];
          let foundAnyExercise = false;
          
          for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
            const weekDays: DayData[] = [];
            
            // Intentar cargar días hasta que no encontremos más
            let dayNum = 1;
            let foundDay = true;
            
            while (foundDay) {
              const key = `week_${weekNum}_day_${dayNum}_data`;
              const dayDataStr = await AsyncStorage.getItem(key);
              
              if (dayDataStr) {
                try {
                  const dayData = JSON.parse(dayDataStr);
                  weekDays.push(dayData);
                  if (dayData.exercises && dayData.exercises.length > 0) {
                    foundAnyExercise = true;
                  }
                  dayNum++;
                } catch (parseError) {
                  console.error('Error parsing day data:', parseError);
                  foundDay = false;
                }
              } else {
                foundDay = false;
              }
            }
            
            // Si no se encontró ningún día en AsyncStorage, crear al menos el día 1
            if (weekDays.length === 0) {
              weekDays.push({
                dayNumber: 1,
                exercises: [],
              });
            }
            
            loadedWeeks.push({
              weekNumber: weekNum,
              days: weekDays,
            });
          }
          
          // Si tenemos editingPlanId pero no encontramos ejercicios, recargar desde Supabase
          if (editingPlanId && user && !foundAnyExercise) {
            console.log('⚠️ No se encontraron ejercicios en AsyncStorage para plan existente, recargando desde Supabase...');
            
            const targetUserId = isTrainerView && studentId ? studentId : user.id;
            
            const { data: plan, error } = await supabase
              .from('workout_plans')
              .select('*')
              .eq('id', editingPlanId)
              .eq('user_id', targetUserId)
              .single();
              
            if (!error && plan) {
              const planData = plan.plan_data as { multi_week_structure?: any[]; weekly_structure?: any[] } | null;
              const multiWeekStructure = planData?.multi_week_structure;
              const weeklyStructure = planData?.weekly_structure;
              
              // Verificar si el plan tiene ejercicios en la base de datos
              const hasExercisesInDB = 
                (multiWeekStructure && multiWeekStructure.some((w: any) => w.days?.some((d: any) => d.exercises?.length > 0))) ||
                (weeklyStructure && weeklyStructure.some((d: any) => d.exercises?.length > 0));
              
              if (hasExercisesInDB) {
                console.log('📥 Plan tiene ejercicios en DB, recargando...');
                // Forzar recarga completa del componente
                setInitialLoadComplete(false);
                isLoadingFromStorage.current = false;
                
                // Re-ejecutar loadExistingPlan en el próximo ciclo
                setTimeout(() => {
                  setInitialLoadComplete(true);
                }, 100);
                return;
              }
            }
          }
          
          setWeeks(loadedWeeks);
          
          // Cargar nombre del plan desde AsyncStorage
          const savedPlanName = await AsyncStorage.getItem('custom_plan_name');
          if (savedPlanName) {
            setPlanName(savedPlanName);
          }
        } catch (error) {
          console.error('Error loading week data:', error);
          showAlert(
            'Error al cargar',
            'No se pudieron cargar los datos de las semanas guardadas.',
            [{ text: 'OK' }],
            { icon: 'alert-circle', iconColor: '#F44336' }
          );
        } finally {
          isLoadingFromStorage.current = false;
          console.log('✅ Carga desde AsyncStorage completada');
        }
      };
      
      loadWeekData();
    }, [initialLoadComplete, editingPlanId, user, isTrainerView, studentId])
  );

  const handleDayPress = (dayNumber: number) => {
    const currentWeek = weeks[currentWeekIndex];
    const dayData = currentWeek.days.find(d => d.dayNumber === dayNumber) || { dayNumber, exercises: [] };
    
    console.log(`📍 Editando día ${dayNumber} (semana ${currentWeek.weekNumber}): ${dayData.exercises?.length || 0} ejercicios`);
    
    router.push({
      pathname: '/(tabs)/workout/custom-plan-day-detail',
      params: {
        weekNumber: currentWeek.weekNumber.toString(),
        dayNumber: dayNumber.toString(),
        daysPerWeek: currentWeek.days.length.toString(),
        equipment: JSON.stringify(equipment),
        dayData: JSON.stringify(dayData),
        planId: editingPlanId || '', // Pasar planId para guardar directamente en DB
        isTrainerView: isTrainerView ? 'true' : 'false',
        studentId: studentId || '',
      },
    });
  };
  
  const toggleDayExpansion = (weekNumber: number, dayNumber: number) => {
    const key = `${weekNumber}-${dayNumber}`;
    const newExpanded = new Set(expandedDays);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    setExpandedDays(newExpanded);
  };

  const handleAddDay = async () => {
    const updatedWeeks = [...weeks];
    const currentWeek = updatedWeeks[currentWeekIndex];
    
    if (!currentWeek) return;
    
    const newDayNumber = currentWeek.days.length + 1;
    const newDay: DayData = {
      dayNumber: newDayNumber,
      exercises: [],
    };
    
    currentWeek.days.push(newDay);
    setWeeks(updatedWeeks);
    
    // Guardar el nuevo día vacío en AsyncStorage
    try {
      const key = `week_${currentWeek.weekNumber}_day_${newDayNumber}_data`;
      await AsyncStorage.setItem(key, JSON.stringify(newDay));
    } catch (error) {
      console.error('❌ Error guardando día en AsyncStorage:', error);
      showAlert(
        'Aviso',
        'El día se agregó pero hubo un problema al guardar. Intenta guardar el plan completo.',
        [{ text: 'OK' }],
        { icon: 'warning', iconColor: '#ffb300' }
      );
    }
    
    showAlert(
      t('customPlan.dayAddedTitle'),
      t('customPlan.dayAddedMessage', {
        day: newDayNumber,
        week: currentWeek.weekNumber,
      }),
      [{ text: t('common.ok') }],
      { icon: 'checkmark-circle', iconColor: '#4CAF50' }
    );
    
  };

  const handleDeleteDay = async (dayNumber: number) => {
    const currentWeek = weeks[currentWeekIndex];
    if (!currentWeek) return;
    
    // No permitir eliminar si es el único día
    if (currentWeek.days.length === 1) {
      showAlert(
        t('customPlan.cannotDeleteDayTitle'),
        t('customPlan.cannotDeleteDayMessage'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#ffb300' }
      );
      return;
    }
    
    const dayToDelete = currentWeek.days.find(d => d.dayNumber === dayNumber);
    const dayName =
  dayToDelete?.name ||
  t('customPlan.dayFallbackName', { day: dayNumber });

    
    showAlert(
      t('alerts.confirm'),
      t('alerts.cannotUndo'),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar el día del estado
              const updatedWeeks = [...weeks];
              const weekToUpdate = updatedWeeks[currentWeekIndex];
              
              // Filtrar el día eliminado
              weekToUpdate.days = weekToUpdate.days.filter(d => d.dayNumber !== dayNumber);
              
              // Renumerar los días restantes
              weekToUpdate.days.forEach((day, index) => {
                day.dayNumber = index + 1;
              });
              
              setWeeks(updatedWeeks);
              
              // Eliminar del AsyncStorage
              const key = `week_${currentWeek.weekNumber}_day_${dayNumber}_data`;
              await AsyncStorage.removeItem(key);
              
              showAlert(
                t('common.deleted'),
                t('customPlan.dayDeleted', { dayName }),
                [{ text: t('common.ok') }],
                { icon: 'checkmark-circle', iconColor: '#4CAF50' }
              );
              
            } catch (error) {
              console.error('Error eliminando día:', error);
              showAlert(
                t('common.error'),
                t('customPlan.couldNotDeleteDayTryAgain'),
                [{ text: t('common.ok') }],
                { icon: 'alert-circle', iconColor: '#F44336' }
              );
              
            }
          },
        },
      ],
      { icon: 'trash', iconColor: '#F44336' }
    );
  };
  
  const handleAddWeek = async () => {
    setShowWeekDropdown(false);
    
    showAlert(
      t('customPlan.addWeekTitle'),
      t('customPlan.addWeekConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.add'),
          onPress: async () => {
            const newWeekNumber = weeks.length + 1;
    
            // Nueva semana empieza con 1 día (el usuario puede agregar más)
            const newWeekDays: DayData[] = [
              {
                dayNumber: 1,
                exercises: [],
              },
            ];
    
            const newWeek: WeekData = {
              weekNumber: newWeekNumber,
              days: newWeekDays,
            };
    
            const updatedWeeks = [...weeks, newWeek];
            setWeeks(updatedWeeks);
            setCurrentWeekIndex(updatedWeeks.length - 1); // Ir a la nueva semana
    
            // Guardar el número de semanas
            try {
              await AsyncStorage.setItem(
                'custom_plan_weeks_count',
                updatedWeeks.length.toString()
              );
            } catch (error) {
              console.error('Error saving weeks count:', error);
              // Error menor: no mostrar alert (la semana ya se agregó)
            }
    
            showAlert(
              t('customPlan.weekAddedTitle'),
              t('customPlan.weekAddedMessage', { week: newWeekNumber }),
              [{ text: t('common.ok') }],
              { icon: 'checkmark-circle', iconColor: '#4CAF50' }
            );
          },
        },
      ],
      { icon: 'add-circle', iconColor: '#ffb300' }
    );
  };

  const handleDuplicateWeek = async (weekIndex: number) => {
    const weekToDuplicate = weeks[weekIndex];
    
    showAlert(
      t('customPlan.duplicateWeekTitle'),
      t('customPlan.duplicateWeekConfirm', { week: weekToDuplicate.weekNumber }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('customPlan.duplicate'),
          onPress: async () => {
            try {
              const newWeekNumber = weeks.length + 1;
    
              // Crear copia profunda de la semana con sus días y ejercicios
              const duplicatedWeek: WeekData = {
                weekNumber: newWeekNumber,
                days: weekToDuplicate.days.map((day) => ({
                  ...day,
                  exercises: day.exercises.map((ex) => ({ ...ex })), // Copia profunda de ejercicios
                })),
              };
    
              // Agregar la nueva semana
              const updatedWeeks = [...weeks, duplicatedWeek];
              setWeeks(updatedWeeks);
    
              // Guardar datos duplicados en AsyncStorage
              for (const day of duplicatedWeek.days) {
                const storageKey = `week_${newWeekNumber}_day_${day.dayNumber}_data`;
                await AsyncStorage.setItem(storageKey, JSON.stringify(day));
              }
    
              // Actualizar contador de semanas
              await AsyncStorage.setItem(
                'custom_plan_weeks_count',
                updatedWeeks.length.toString()
              );
    
              // Cambiar a la nueva semana duplicada
              setCurrentWeekIndex(updatedWeeks.length - 1);
              setShowWeekDropdown(false);
    
              showAlert(
                t('customPlan.duplicatedTitle'),
                t('customPlan.duplicatedMessage', {
                  newWeek: newWeekNumber,
                  sourceWeek: weekToDuplicate.weekNumber,
                }),
                [{ text: t('common.ok') }],
                { icon: 'checkmark-circle', iconColor: '#4CAF50' }
              );
            } catch (error) {
              console.error('Error duplicating week:', error);
              showAlert(
                t('customPlan.duplicateWeekErrorTitle'),
                t('customPlan.duplicateWeekErrorMessage'),
                [{ text: t('common.ok') }],
                { icon: 'alert-circle', iconColor: '#F44336' }
              );
            }
          },
        },
      ],
      { icon: 'copy', iconColor: '#ffb300' }
    );
    
  };

  const handleDeleteWeek = async (weekIndex: number) => {
    if (weeks.length === 1) {
      showAlert(
        t('customPlan.cannotDeleteWeekTitle'),
        t('customPlan.cannotDeleteWeekMessage'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#ffb300' }
      );
      
      return;
    }

    const weekToDelete = weeks[weekIndex];
    
    showAlert(
      t('customPlan.deleteWeekTitle'),
      t('customPlan.deleteWeekConfirm', { week: weekToDelete.weekNumber }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('customPlan.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar la semana del estado
              const updatedWeeks = weeks.filter((_, index) => index !== weekIndex);
    
              // Renumerar las semanas restantes
              updatedWeeks.forEach((week, index) => {
                week.weekNumber = index + 1;
              });
    
              setWeeks(updatedWeeks);
    
              // Ajustar el índice de la semana actual
              if (currentWeekIndex >= updatedWeeks.length) {
                setCurrentWeekIndex(updatedWeeks.length - 1);
              } else if (currentWeekIndex > weekIndex) {
                setCurrentWeekIndex(currentWeekIndex - 1);
              }
    
              // Limpiar AsyncStorage para la semana eliminada
              const weekNumber = weekToDelete.weekNumber;
              for (let day = 1; day <= 7; day++) {
                await AsyncStorage.removeItem(`week_${weekNumber}_day_${day}_data`);
              }
    
              // Actualizar el contador de semanas
              await AsyncStorage.setItem(
                'custom_plan_weeks_count',
                updatedWeeks.length.toString()
              );
    
              setShowWeekDropdown(false);
              showAlert(
                t('customPlan.deletedTitle'),
                t('customPlan.deletedWeekSuccess'),
                [{ text: t('common.ok') }],
                { icon: 'checkmark-circle', iconColor: '#4CAF50' }
              );
            } catch (error) {
              console.error('Error deleting week:', error);
              showAlert(
                t('customPlan.deleteWeekErrorTitle'),
                t('customPlan.deleteWeekErrorMessage'),
                [{ text: t('common.ok') }],
                { icon: 'alert-circle', iconColor: '#F44336' }
              );
            }
          },
        },
      ],
      { icon: 'trash', iconColor: '#F44336' }
    );
    
  };

  const handleSavePlan = () => {
    // Verificar que al menos un día de alguna semana tenga ejercicios
    const hasAnyExercises = weeks.some(week => 
      week.days.some(day => day.exercises.length > 0)
    );
    
    if (!hasAnyExercises) {
      showAlert(
        t('customPlan.emptyPlan'),
        t('customPlan.emptyPlanMessage'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#ffb300' }
      );
      return;
    }

    // Contar días completados en todas las semanas
    const totalDays = weeks.reduce((count, week) => count + week.days.length, 0);
    const completedDays = weeks.reduce((count, week) => 
      count + week.days.filter(day => day.exercises.length > 0).length, 0
    );
    
    const hasEmptyDays = completedDays < totalDays;
    
    if (hasEmptyDays) {
      // Plan parcial - preguntar si quiere guardarlo así
      showAlert(
        t('customPlan.partialPlan'),
        t('customPlan.partialPlanMessage', { completed: completedDays, total: totalDays, weeks: weeks.length, weekLabel: weeks.length === 1 ? t('common.week') : t('common.weeks') }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('customPlan.saveAsDraft'),
            // Si el plan ya es activo, mantenerlo activo; si no, guardar como inactivo
            onPress: () => savePlanToDatabase(isPlanCurrentlyActive || false),
          },
        ],
        { icon: 'document-text', iconColor: '#ffb300' }
      );
    } else {
      // Plan completo
      // Solo preguntar si quiere activarlo si NO es actualmente activo
      console.log('💾 ======================================');
      console.log('💾 VERIFICACIÓN DE ESTADO DE PLAN ACTIVO');
      console.log('💾 ======================================');
      console.log('  - editingPlanId:', editingPlanId, '(tipo:', typeof editingPlanId, ')');
      console.log('  - isPlanCurrentlyActive:', isPlanCurrentlyActive, '(tipo:', typeof isPlanCurrentlyActive, ')');
      console.log('  - Comparación estricta (isPlanCurrentlyActive === true):', isPlanCurrentlyActive === true);
      console.log('  - Comparación flexible (isPlanCurrentlyActive == true):', isPlanCurrentlyActive == true);
      console.log('  - Condición completa:', editingPlanId && isPlanCurrentlyActive === true);
      console.log('💾 ======================================');
      
      // Si estamos editando un plan Y ese plan es actualmente activo, no preguntar
      if (editingPlanId && isPlanCurrentlyActive === true) {
        // El plan ya es activo, guardar sin preguntar
        console.log('✅ Plan ya activo - guardar sin preguntar');
        savePlanToDatabase(true);
      } else {
        // Plan nuevo o plan existente pero no activo - preguntar si quiere activarlo
        console.log('❓ Plan NO activo o es nuevo - preguntar al usuario');
        console.log('   Razón: editingPlanId=' + editingPlanId + ', isPlanCurrentlyActive=' + isPlanCurrentlyActive);
        showAlert(
          t('customPlan.activatePlanTitle'),
          t('customPlan.activatePlanMessage'),
          [
            {
              text: t('common.no'),
              style: 'cancel',
              onPress: () => {
                console.log('👤 Usuario eligió NO activar');
                savePlanToDatabase(false);
              },
            },
            {
              text: t('common.yes'),
              onPress: () => {
                console.log('👤 Usuario eligió SÍ activar');
                savePlanToDatabase(true);
              },
            },
          ],
          { icon: 'checkmark-done-circle', iconColor: '#4CAF50' }
        );
        ;
      }
    }
  };

  const savePlanToDatabase = async (isActive: boolean) => {
    if (!user) {
      showAlert(
        t('auth.errorTitle'),
        t('auth.unauthenticated'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      
      return;
    }

    // Validar que el plan tenga un nombre
    if (!planName || planName.trim().length === 0) {
      showAlert(
        t('customPlan.nameRequired'),
        t('customPlan.nameRequiredMessage'),
        [{ text: t('common.ok') }],
        { icon: 'create-outline', iconColor: '#ffb300' }
      );
      return;
    }

    setIsSaving(true);
    try {
      // Cargar todas las semanas desde AsyncStorage
      const totalWeeks = weeks.length;
      const allWeeksData: WeekData[] = [];
      
      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weekDays: DayData[] = [];
        const currentWeekData = weeks.find(w => w.weekNumber === weekNum);
        const maxDays = currentWeekData?.days.length || 7;
        
        for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
          const key = `week_${weekNum}_day_${dayNum}_data`;
          const dayDataStr = await AsyncStorage.getItem(key);
          
          if (dayDataStr) {
            const dayData = JSON.parse(dayDataStr);
            if (dayData.exercises && dayData.exercises.length > 0) {
              weekDays.push(dayData);
            }
          }
        }
        
        if (weekDays.length > 0) {
          allWeeksData.push({
            weekNumber: weekNum,
            days: weekDays,
          });
        }
      }

      if (allWeeksData.length === 0) {
        showAlert(
          t('common.error'),
          t('customPlan.noDaysWithExercises'),
          [{ text: t('common.ok') }],
          { icon: 'alert-circle', iconColor: '#F44336' }
        );
        
        setIsSaving(false);
        return;
      }

      // Calcular el máximo de días por semana
      const maxDaysInAnyWeek = Math.max(...allWeeksData.map(w => w.days.length));
      
      // Formatear el plan con estructura multi-semana
      const planData = {
        // Estructura multi-semana (nueva)
        multi_week_structure: allWeeksData.map(week => ({
          week_number: week.weekNumber,
          days: week.days.map(day => ({
            day: day.name || t('customPlan.dayWithNumber', { number: day.dayNumber }),
            focus: day.name || t('customPlan.dayWithNumber', { number: day.dayNumber }),            
            exercises: day.exercises.map((ex: any) => ({
              id: ex.id, // ← IMPORTANTE: Mantener el ID
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: ex.rest_seconds || 120,
              setTypes: ex.setTypes || [],
              // Campos para superseries
              ...(ex.type === 'superset' && {
                type: 'superset',
                exercises: ex.exercises,
              }),
            })),
            duration: 45,
          })),
        })),
        // Mantener weekly_structure para compatibilidad (primera semana)
        weekly_structure: allWeeksData[0]?.days.map(day => ({
          day: day.name || t('customPlan.dayFallbackName', { day: day.dayNumber }),
          focus: day.name || t('customPlan.dayFallbackName', { day: day.dayNumber }),
          exercises: day.exercises.map((ex: any) => ({
            id: ex.id, // ← IMPORTANTE: Mantener el ID
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds || 120,
            setTypes: ex.setTypes || [],
          })),
          duration: 45,
        })) || [],
        days_per_week: maxDaysInAnyWeek,
        equipment: equipment,
        duration_weeks: totalWeeks,
        total_weeks: totalWeeks,
      };

      // Si se va a activar, desactivar otros planes primero
      if (isActive) {
        const { error: updateError } = await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error desactivando planes anteriores:', updateError);
          showAlert(
            'Aviso',
            'El plan se guardará pero hubo un problema al desactivar otros planes. Es posible que tengas múltiples planes activos.',
            [{ text: 'Continuar' }],
            { icon: 'warning', iconColor: '#ffb300' }
          );
        }
      }

      const finalPlanName = planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`;
      
      // Obtener planId de params o AsyncStorage
      const planIdToUpdate = editingPlanId || await AsyncStorage.getItem('editing_plan_id');
      
      // Si estamos editando un plan existente, actualizar en lugar de insertar
      if (planIdToUpdate) {
        // Si es modo entrenador, usar la función especial para actualizar plan del alumno
        if (isTrainerView && studentId) {
          console.log('👨‍🏫 Actualizando plan del alumno como entrenador');
        
          const weekUnit =
            totalWeeks === 1
              ? t('customPlan.week_singular')
              : t('customPlan.week_plural');
        
          const result = await updateStudentWorkoutPlan(
            user.id,
            studentId,
            planIdToUpdate,
            {
              plan_name: finalPlanName,
              description: t('customPlan.planDescription', {
                count: totalWeeks,
                unit: weekUnit,
              }),
              plan_data: planData,
            }
          );
          if (!result.success) {
            console.error('Error al actualizar plan del alumno:', result.error);
            showAlert(
              'Error',
              result.error || 'No se pudo actualizar el plan. Intenta nuevamente.',
              [{ text: 'OK' }],
              { icon: 'alert-circle', iconColor: '#F44336' }
            );
            setIsSaving(false);
            return;
          }
        } else {
          // Actualización normal para el propio usuario
          const weekUnit =
            totalWeeks === 1
              ? t('customPlan.week_singular')
              : t('customPlan.week_plural');
        
          const { data, error } = await supabase
            .from('workout_plans')
            .update({
              plan_name: finalPlanName,
              description: t('customPlan.planDescription', {
                count: totalWeeks,
                unit: weekUnit,
              }),
              duration_weeks: planData.duration_weeks,
              plan_data: planData,
              is_active: isActive,
            })
            .eq('id', planIdToUpdate)
            .eq('user_id', user.id)
            .select('id')
            .single();
        
          if (error) {
            console.error('Error al actualizar plan:', error);
            showAlert(
              t('common.error'),
              t('customPlan.updatePlanErrorMessage'),
              [{ text: t('common.ok') }],
              { icon: 'alert-circle', iconColor: '#F44336' }
            );
            setIsSaving(false);
            return;
          }
        }
        

        // Limpiar AsyncStorage después de actualizar
        for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
          const weekData = weeks.find(w => w.weekNumber === weekNum);
          const maxDays = weekData?.days.length || 10;
          for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
            await AsyncStorage.removeItem(`week_${weekNum}_day_${dayNum}_data`);
          }
        }
        await AsyncStorage.removeItem('custom_plan_name');
        await AsyncStorage.removeItem('custom_plan_weeks_count');
        await AsyncStorage.removeItem('editing_plan_id');

        // Importante: Establecer isSaving a false ANTES del alert
        setIsSaving(false);

        const successMessage = isTrainerView
        ? t('customPlan.trainerPlanUpdated')
        : isActive
          ? t('customPlan.planUpdatedAndActivated')
          : t('customPlan.planUpdatedNotActivated');
      
      showAlert(
        t('customPlan.successTitle'),
        successMessage,
        [
          {
            text: t('common.ok'),
            onPress: () => {
              if (isTrainerView && studentId) {
                // Modo entrenador: volver a la pantalla del alumno
                router.back();
              } else {
                // Modo normal: ir a entrenamientos
                router.push('/(tabs)/workout' as any);
              }
            },
          },
        ],
        { icon: 'checkmark-circle', iconColor: '#4CAF50' }
      );
      
        return;
      }

      // Insertar el nuevo plan
      const weekUnit =
      totalWeeks === 1
        ? t('customPlan.week_singular')
        : t('customPlan.week_plural');
    
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        plan_name: finalPlanName,
        description: t('customPlan.planDescription', {
          count: totalWeeks,
          unit: weekUnit,
        }),
        duration_weeks: planData.duration_weeks,
        plan_data: planData,
        is_active: isActive,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
      if (error) {
        console.error('Error al guardar plan:', error);
        showAlert(
          t('common.error'),
          t('customPlan.savePlanErrorMessage'),
          [{ text: t('common.ok') }],
          { icon: 'alert-circle', iconColor: '#F44336' }
        );
        
        setIsSaving(false);
        return;
      }

      // Limpiar AsyncStorage después de guardar
      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weekData = weeks.find(w => w.weekNumber === weekNum);
        const maxDays = weekData?.days.length || 10;
        for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
          await AsyncStorage.removeItem(`week_${weekNum}_day_${dayNum}_data`);
        }
      }
      await AsyncStorage.removeItem('custom_plan_name');
      await AsyncStorage.removeItem('custom_plan_weeks_count');
      await AsyncStorage.removeItem('editing_plan_id');

      const newPlanId = data?.id;
      
      // Importante: Establecer isSaving a false ANTES del alert
      setIsSaving(false);
      
      const savedMessage = isActive
  ? t('customPlan.planSavedAndActivated')
  : t('customPlan.planSavedNotActivated');

showAlert(
  t('customPlan.successTitle'), // o t('common.success') si preferís
  savedMessage,
  [
    {
      text: t('common.ok'),
      onPress: () => {
        router.push('/(tabs)/workout' as any);
      },
    },
  ],
  { icon: 'checkmark-circle', iconColor: '#4CAF50' }
);
} catch (error) {
  console.error('Error inesperado al guardar plan:', error);
  setIsSaving(false);
  showAlert(
    t('common.error'),
    t('customPlan.unexpectedSaveError'),
    [{ text: t('common.ok') }],
    { icon: 'alert-circle', iconColor: '#F44336' }
  );
}

  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Si estamos editando un plan existente, volver al detalle de ese plan
            // Si estamos creando uno nuevo, volver al setup
            if (editingPlanId) {
              router.push(`/(tabs)/workout-plan-detail?planId=${editingPlanId}` as any);
            } else {
              router.push({
                pathname: '/(tabs)/workout/custom-plan-setup',
              } as any);
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('customPlan.daysTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Nombre del plan editable */}
        <View style={styles.planNameContainer}>
          {isEditingPlanName ? (
            <View style={[
              styles.planNameEditContainer,
              planName.trim().length === 0 && styles.planNameEditContainerEmpty
            ]}>
              <TextInput
                style={styles.planNameInput}
                value={planName}
                onChangeText={setPlanName}
                placeholder={t('customPlan.planNamePlaceholder')}
                placeholderTextColor="#666"
                autoFocus
                onBlur={async () => {
                  // Si el nombre está vacío, mostrar alerta
                  if (planName.trim().length === 0) {
                    showAlert(
                      t('customPlan.nameRequired'),
                      t('customPlan.nameEmptyDefault'),
                      [{ text: t('common.ok') }],
                      { icon: 'alert-circle', iconColor: '#ffb300' }
                    );
                    setPlanName(`${t('customPlan.defaultPlanName')} - ${new Date().toLocaleDateString()}`);
                  }
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `${t('customPlan.defaultPlanName')} - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
                onSubmitEditing={async () => {
                  // Si el nombre está vacío, mostrar alerta
                  if (planName.trim().length === 0) {
                    showAlert(
                      t('customPlan.nameRequired'),
                      t('customPlan.nameEmptyDefault'),
                      [{ text: t('common.ok') }],
                      { icon: 'alert-circle', iconColor: '#ffb300' }
                    );
                    setPlanName(`${t('customPlan.defaultPlanName')} - ${new Date().toLocaleDateString()}`);
                  }
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
              />
              <TouchableOpacity
                onPress={async () => {
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    const formattedDate = new Date().toLocaleDateString();

                    await AsyncStorage.setItem(
                      'custom_plan_name',
                      planName.trim() ||
                        t('customPlan.defaultPlanNameWithDate', {
                          date: formattedDate,
                        })
                    );
                                      } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
                style={styles.planNameSaveButton}
              >
                <Ionicons name="checkmark" size={20} color="#ffb300" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.planNameDisplayContainer}
              onPress={() => setIsEditingPlanName(true)}
              activeOpacity={0.7}
            >
              <View style={styles.planNameDisplayContent}>
                <Ionicons name="fitness" size={20} color="#ffb300" />
                <Text style={styles.planNameDisplayText} numberOfLines={1}>
                {planName ||  t('customPlan.defaultPlanNameWithDate', {    date: new Date().toLocaleDateString(),  })}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selector de semana con dropdown personalizado */}
        <View style={styles.weekSelectorContainer}>
          <TouchableOpacity 
            style={styles.weekSelectorButton}
            onPress={() => setShowWeekDropdown(!showWeekDropdown)}
            activeOpacity={0.7}
          >
            <View style={styles.weekSelectorContent}>
            <Text style={styles.weekSelectorTitle}>
  {t('customPlan.weekTitle', {
    week: weeks[currentWeekIndex]?.weekNumber || 1,
  })}
</Text>

              <Ionicons 
                name={showWeekDropdown ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#ffb300" 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Dropdown de semanas */}
        {showWeekDropdown && (
          <View style={styles.weekDropdownContainer}>
            <ScrollView 
              style={styles.weekDropdownScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {weeks.map((week, index) => {
                const isLastItem = index === weeks.length - 1;
                return (
                  <View 
                    key={week.weekNumber}
                    style={[
                      styles.weekDropdownItem,
                      currentWeekIndex === index && styles.weekDropdownItemActive,
                      isLastItem && styles.weekDropdownItemLast
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.weekDropdownItemButton}
                      onPress={() => {
                        setCurrentWeekIndex(index);
                        setShowWeekDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.weekDropdownItemContent}>
                        <Ionicons 
                          name={currentWeekIndex === index ? "checkmark-circle" : "radio-button-off"} 
                          size={24} 
                          color={currentWeekIndex === index ? "#ffb300" : "#666"} 
                        />
                       <Text
  style={[
    styles.weekDropdownItemText,
    currentWeekIndex === index && styles.weekDropdownItemTextActive,
  ]}
>
  {t('customPlan.weekTitle', { week: week.weekNumber })}
</Text>

<Text style={styles.weekDropdownItemDays}>
  {t('customPlan.daysCount', {
    count: week.days.length,
    unit:
      week.days.length === 1
        ? t('customPlan.day_singular')
        : t('customPlan.day_plural'),
  })}
</Text>

                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.weekDropdownActions}>
                      <TouchableOpacity
                        style={styles.weekDropdownDuplicateButton}
                        onPress={() => handleDuplicateWeek(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="copy-outline" size={20} color="#ffb300" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.weekDropdownDeleteButton}
                        onPress={() => handleDeleteWeek(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={20} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              
              {/* Botón agregar semana en el dropdown */}
              <TouchableOpacity
                style={styles.weekDropdownAddButton}
                onPress={handleAddWeek}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={28} color="#ffb300" />
                <Text style={styles.weekDropdownAddButtonText}>
  {t('customPlan.addWeek')}
</Text>

              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={styles.weekInfo}>
        <Text style={styles.description}>
  {t('customPlan.selectDayDescription')}
</Text>

        </View>

        <View style={styles.daysList}>
          {currentWeekDays.map((day) => (
            <View
              key={day.dayNumber}
              style={styles.dayCard}
            >
              <View style={styles.dayCardHeader}>
              <Text style={styles.dayCardTitle}>
  {day.name || t('customPlan.dayWithNumber', { number: day.dayNumber })}
</Text>

                <View style={styles.dayCardActions}>
                  <TouchableOpacity
                    style={styles.dayActionButton}
                    onPress={() => handleDayPress(day.dayNumber)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="create-outline" size={22} color="#ffb300" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dayActionButton}
                    onPress={() => handleDeleteDay(day.dayNumber)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
              {day.exercises.length > 0 ? (
                <View>
                  <TouchableOpacity
                    style={styles.exerciseCountContainer}
                    onPress={() => toggleDayExpansion(weeks[currentWeekIndex].weekNumber, day.dayNumber)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="barbell" size={16} color="#ffb300" />
                    <Text style={styles.exerciseCount}>
  {t('customPlan.exercisesCount', {
    count: day.exercises.length,
    unit:
      day.exercises.length === 1
        ? t('customPlan.exercise_singular')
        : t('customPlan.exercise_plural'),
  })}
</Text>

                    <Ionicons 
                      name={expandedDays.has(`${weeks[currentWeekIndex].weekNumber}-${day.dayNumber}`) ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#ffb300" 
                    />
                  </TouchableOpacity>
                  
                  {expandedDays.has(`${weeks[currentWeekIndex].weekNumber}-${day.dayNumber}`) && (
                    <View style={styles.exercisePreview}>
                      {day.exercises.map((exercise, idx) => (
                        exercise.type === 'superset' ? (
                          // Superserie expandible
                          <View key={idx} style={styles.supersetItem}>
                            <TouchableOpacity
                              style={styles.supersetHeader}
                              onPress={() => {
                                const key = `superset-${weeks[currentWeekIndex].weekNumber}-${day.dayNumber}-${idx}`;
                                setExpandedDays(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(key)) {
                                    newSet.delete(key);
                                  } else {
                                    newSet.add(key);
                                  }
                                  return newSet;
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.exerciseNumberBadge}>
                                <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                              </View>
                              <View style={styles.exerciseInfo}>
                                <Text style={styles.supersetTitle}>SUPERSERIE</Text>
                                <View style={styles.exerciseDetailsRow}>
                                  <View style={styles.exerciseDetailChip}>
                                    <Ionicons name="barbell-outline" size={12} color="#999" />
                                    <Text style={styles.exerciseDetailText}>
                                      {exercise.exercises?.length || 0} {(exercise.exercises?.length || 0) === 1 ? 'ejercicio' : 'ejercicios'}
                                    </Text>
                                  </View>
                                  <View style={styles.exerciseDetailChip}>
                                    <Ionicons name="sync" size={12} color="#999" />
                                    <Text style={styles.exerciseDetailText}>
                                      {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <Ionicons 
                                name={expandedDays.has(`superset-${weeks[currentWeekIndex].weekNumber}-${day.dayNumber}-${idx}`) ? "chevron-up" : "chevron-down"} 
                                size={18} 
                                color="#9C27B0" 
                              />
                            </TouchableOpacity>
                            {expandedDays.has(`superset-${weeks[currentWeekIndex].weekNumber}-${day.dayNumber}-${idx}`) && (
                              <View style={styles.supersetExercisesList}>
                                {exercise.exercises?.map((ssExercise: any, ssIdx: number) => (
                                  <View key={ssIdx} style={styles.supersetExerciseItem}>
                                    <Text style={styles.supersetBullet}>•</Text>
                                    <Text style={styles.supersetExerciseName} numberOfLines={1}>
                                      {ssExercise.name}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ) : (
                          // Ejercicio normal
                          <View key={idx} style={styles.exerciseItem}>
                            <View style={styles.exerciseNumberBadge}>
                              <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                            </View>
                            <View style={styles.exerciseInfo}>
                              <Text style={styles.exerciseName} numberOfLines={1}>
                                {exercise.name}
                              </Text>
                              <View style={styles.exerciseDetailsRow}>
                                <View style={styles.exerciseDetailChip}>
                                  <Ionicons name="sync" size={12} color="#999" />
                                  <Text style={styles.exerciseDetailText}>
                                    {t('customPlan.setsCount', {
                                      count: exercise.sets,
                                      unit: exercise.sets === 1
                                        ? t('customPlan.set_singular')
                                        : t('customPlan.set_plural'),
                                    })}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        )
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.emptyDay}
                  onPress={() => handleDayPress(day.dayNumber)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={32} color="#666" />
                  <Text style={styles.emptyDayText}>{t('customPlan.addExercises')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Botón Agregar Día */}
        <TouchableOpacity
          style={styles.addDayButton}
          onPress={handleAddDay}
          disabled={isSaving}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ffb300" />
          <Text style={styles.addDayButtonText}>{t('customPlan.addDay')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSavePlan}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#1a1a1a" />
              <Text style={styles.saveButtonText}>
  {t('common.saving')}
</Text>

            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>{t('customPlan.savePlan')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      
      <AlertComponent />

      {/* Tutorial de plan personalizado */}
      {showCustomPlanTooltips && (
        <TutorialTooltip
          visible={showCustomPlanTooltips}
          steps={[
            {
              element: <View />,
              title: t('tutorial.customPlan.title1'),
              content: t('tutorial.customPlan.content1'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title2'),
              content: t('tutorial.customPlan.content2'),
              placement: 'center',
              spotlightPosition: {
                x: 20,
                y: 141,
                width: SCREEN_WIDTH - 40,
                height: 57,
                borderRadius: 12,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title3'),
              content: t('tutorial.customPlan.content3'),
              placement: 'center',
              spotlightPosition: {
                x: 20,
                y: 220,
                width: SCREEN_WIDTH - 40,
                height: 60,
                borderRadius: 12,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title4'),
              content: t('tutorial.customPlan.content4'),
              placement: 'center',
              spotlightPosition: {
                x: 20,
                y: 370,
                width: SCREEN_WIDTH - 37,
                height: 165,
                borderRadius: 16,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title5'),
              content: t('tutorial.customPlan.content5'),
              placement: 'center',
              spotlightPosition: {
                x: SCREEN_WIDTH - 112,
                y: 373,
                width: 33,
                height: 33,
                borderRadius: 8,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title6'),
              content: t('tutorial.customPlan.content6'),
              placement: 'center',
              spotlightPosition: {
                x: SCREEN_WIDTH - 69,
                y: 372,
                width: 33,
                height: 33,
                borderRadius: 8,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title7'),
              content: t('tutorial.customPlan.content7'),
              placement: 'center',
              spotlightPosition: {
                x: 20,
                y: 548,
                width: SCREEN_WIDTH - 40,
                height: 60,
                borderRadius: 16,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title8'),
              content: t('tutorial.customPlan.content8'),
              placement: 'center',
              spotlightPosition: {
                x: 20,
                y: 632,
                width: SCREEN_WIDTH - 40,
                height: 56,
                borderRadius: 16,
              },
            },
            {
              element: <View />,
              title: t('tutorial.customPlan.title9'),
              content: t('tutorial.customPlan.content9'),
              placement: 'center',
            },
          ]}
          onComplete={() => {
            // Primero cerrar el modal, luego actualizar el contexto
            setShowCustomPlanTooltips(false);
            setTimeout(() => {
              completeTutorial('CUSTOM_PLAN');
              markTooltipShown('CUSTOM_PLAN');
            }, 100);
          }}
          onSkip={() => {
            // Primero cerrar el modal, luego actualizar el contexto
            setShowCustomPlanTooltips(false);
            setTimeout(() => {
              completeTutorial('CUSTOM_PLAN');
              markTooltipShown('CUSTOM_PLAN');
            }, 100);
          }}
        />
      )}
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
  daysList: {
    gap: 16,
  },
  dayCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  dayCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayActionButton: {
    padding: 4,
  },
  dayCardContent: {
    minHeight: 60,
  },
  exerciseCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  exerciseCount: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '600',
  },
  exercisePreview: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  // Estilos para superseries
  supersetItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9C27B0',
    overflow: 'hidden',
  },
  supersetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  supersetTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  supersetSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  supersetExercisesList: {
    backgroundColor: '#151515',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  supersetExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supersetBullet: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  supersetExerciseName: {
    fontSize: 14,
    color: '#ccc',
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
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  exerciseDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  exerciseDetailText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  moreExercisesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  moreExercises: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planNameContainer: {
    marginBottom: 24,
  },
  planNameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  planNameDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  planNameDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  planNameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 12,
  },
  planNameEditContainerEmpty: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  planNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 0,
  },
  planNameSaveButton: {
    padding: 4,
  },
  weeksNav: {
    marginBottom: 16,
    maxHeight: 50,
  },
  weeksNavContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  weekTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  weekTabActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  weekTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  weekTabTextActive: {
    color: '#1a1a1a',
  },
  weekInfo: {
    marginBottom: 16,
  },
  weekTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  weekSelectorContainer: {
    marginBottom: 16,
  },
  weekSelectorButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffb300',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  weekSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  weekDropdownContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 20,
    maxHeight: 350,
    borderWidth: 2,
    borderColor: '#ffb300',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  weekDropdownScroll: {
    flexGrow: 0,
  },
  weekDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
    backgroundColor: '#2a2a2a',
  },
  weekDropdownItemActive: {
    backgroundColor: '#353535',
    borderLeftWidth: 4,
    borderLeftColor: '#ffb300',
  },
  weekDropdownItemLast: {
    borderBottomWidth: 0,
  },
  weekDropdownItemButton: {
    flex: 1,
  },
  weekDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekDropdownItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  weekDropdownItemTextActive: {
    color: '#ffffff',
  },
  weekDropdownItemDays: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  weekDropdownActions: {
    flexDirection: 'row',
    gap: 4,
  },
  weekDropdownDuplicateButton: {
    padding: 8,
  },
  weekDropdownDeleteButton: {
    padding: 8,
  },
  weekDropdownAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    borderTopWidth: 2,
    borderTopColor: '#555',
    backgroundColor: '#1f1f1f',
  },
  weekDropdownAddButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
  },
  addDayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
});

