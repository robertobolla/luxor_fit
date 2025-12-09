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
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';
import { useCustomAlert } from '../../../src/components/CustomAlert';

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
  const params = useLocalSearchParams();
  const equipment = JSON.parse((params.equipment as string) || '[]');
  const editingPlanId = params.planId as string | undefined;
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
        
        // Cargar el plan desde Supabase
        const { data: plan, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('id', editingPlanId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('❌ Error cargando plan:', error);
          initializeEmptyPlan();
          return;
        }

        if (!plan) {
          console.error('❌ Plan no encontrado');
          initializeEmptyPlan();
          return;
        }

        console.log('✅ Plan cargado:', plan.plan_name);

        // Extraer datos del plan
        const planData = plan.plan_data;
        setPlanName(plan.plan_name);
        
        // Guardar si el plan es activo actualmente
        setIsPlanCurrentlyActive(plan.is_active || false);

        // Guardar planId en AsyncStorage
        await AsyncStorage.setItem('editing_plan_id', editingPlanId);
        await AsyncStorage.setItem('custom_plan_name', plan.plan_name);

        // Cargar estructura multi-semana si existe, sino usar weekly_structure
        const multiWeekStructure = planData.multi_week_structure;
        const weeklyStructure = planData.weekly_structure;

        if (multiWeekStructure && multiWeekStructure.length > 0) {
          // Plan multi-semana
          console.log('📅 Cargando plan multi-semana:', multiWeekStructure.length, 'semanas');
          
          const loadedWeeks: WeekData[] = [];
          
          for (const weekData of multiWeekStructure) {
            const weekDays: DayData[] = [];
            
            for (const dayData of weekData.days) {
              const dayNumber = weekDays.length + 1;
              // Hacer copia profunda de ejercicios para evitar referencias compartidas
              const exercises = dayData.exercises.map((ex: any) => ({
                name: ex.name,
                sets: ex.sets,
                reps: Array.isArray(ex.reps) ? [...ex.reps] : ex.reps,
                setTypes: Array.isArray(ex.setTypes) ? ex.setTypes.map((st: any) => ({
                  type: st.type,
                  reps: st.reps,
                  rir: st.rir,
                })) : [],
              }));

              weekDays.push({
                dayNumber,
                name: dayData.day,
                exercises,
              });

              // Guardar en AsyncStorage
              const key = `week_${weekData.week_number}_day_${dayNumber}_data`;
              await AsyncStorage.setItem(key, JSON.stringify({
                dayNumber,
                name: dayData.day,
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
          // Plan de una semana (compatibilidad)
          console.log('📅 Cargando plan de una semana:', weeklyStructure.length, 'días');
          
          const weekDays: DayData[] = [];
          
          for (let i = 0; i < weeklyStructure.length; i++) {
            const dayData = weeklyStructure[i];
            const dayNumber = i + 1;
            // Hacer copia profunda de ejercicios para evitar referencias compartidas
            const exercises = dayData.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets,
              reps: Array.isArray(ex.reps) ? [...ex.reps] : ex.reps,
              setTypes: Array.isArray(ex.setTypes) ? ex.setTypes.map((st: any) => ({
                type: st.type,
                reps: st.reps,
                rir: st.rir,
              })) : [],
            }));

            weekDays.push({
              dayNumber,
              name: dayData.day,
              exercises,
            });

            // Guardar en AsyncStorage
            const key = `week_1_day_${dayNumber}_data`;
            await AsyncStorage.setItem(key, JSON.stringify({
              dayNumber,
              name: dayData.day,
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
        setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
      }
      
      setInitialLoadComplete(true);
    };
    
    loadExistingPlan();
  }, [editingPlanId, user]);

  // Recargar datos cuando se regresa de la pantalla de detalle del día
  useFocusEffect(
    useCallback(() => {
      const loadWeekData = async () => {
        // Solo recargar desde AsyncStorage si ya se completó la carga inicial
        if (!initialLoadComplete) {
          console.log('⏭️ Saltando useFocusEffect: carga inicial aún no completada');
          return;
        }

        console.log('🔄 useFocusEffect: recargando datos desde AsyncStorage');

        try {
          // Cargar número de semanas guardadas
          const savedWeeksCount = await AsyncStorage.getItem('custom_plan_weeks_count');
          const totalWeeks = savedWeeksCount ? parseInt(savedWeeksCount) : 1;
          
          const loadedWeeks: WeekData[] = [];
          
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
          
          setWeeks(loadedWeeks);
          
          // Cargar nombre del plan desde AsyncStorage
          const savedPlanName = await AsyncStorage.getItem('custom_plan_name');
          if (savedPlanName) {
            setPlanName(savedPlanName);
          }
        } catch (error) {
          console.error('Error loading week data:', error);
        }
      };
      
      loadWeekData();
    }, [initialLoadComplete])
  );

  const handleDayPress = (dayNumber: number) => {
    const currentWeek = weeks[currentWeekIndex];
    const dayData = currentWeek.days.find(d => d.dayNumber === dayNumber) || { dayNumber, exercises: [] };
    
    router.push({
      pathname: '/(tabs)/workout/custom-plan-day-detail',
      params: {
        weekNumber: currentWeek.weekNumber.toString(),
        dayNumber: dayNumber.toString(),
        daysPerWeek: currentWeek.days.length.toString(),
        equipment: JSON.stringify(equipment),
        dayData: JSON.stringify(dayData),
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

  const handleAddDay = () => {
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
    
    showAlert(
      '¡Listo!',
      `Día ${newDayNumber} agregado a la Semana ${currentWeek.weekNumber}`,
      [{ text: 'OK' }],
      { icon: 'checkmark-circle', iconColor: '#4CAF50' }
    );
  };

  const handleDeleteDay = async (dayNumber: number) => {
    const currentWeek = weeks[currentWeekIndex];
    if (!currentWeek) return;
    
    // No permitir eliminar si es el único día
    if (currentWeek.days.length === 1) {
      showAlert(
        'No se puede eliminar',
        'Debe haber al menos un día en la semana. Si no quieres este día, elimina la semana completa.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#ffb300' }
      );
      return;
    }
    
    const dayToDelete = currentWeek.days.find(d => d.dayNumber === dayNumber);
    const dayName = dayToDelete?.name || `Día ${dayNumber}`;
    
    showAlert(
      'Eliminar Día',
      `¿Estás seguro de que quieres eliminar ${dayName}?\n\nEsta acción no se puede deshacer.`,
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
                '¡Eliminado!',
                `${dayName} ha sido eliminado correctamente.`,
                [{ text: 'OK' }],
                { icon: 'checkmark-circle', iconColor: '#4CAF50' }
              );
            } catch (error) {
              console.error('Error eliminando día:', error);
              showAlert(
                'Error',
                'No se pudo eliminar el día. Intenta nuevamente.',
                [{ text: 'OK' }],
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
      'Agregar Semana',
      '¿Quieres agregar una nueva semana a tu plan de entrenamiento?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Agregar',
          onPress: async () => {
            const newWeekNumber = weeks.length + 1;
            
            // Nueva semana empieza con 1 día (el usuario puede agregar más)
            const newWeekDays: DayData[] = [{
              dayNumber: 1,
              exercises: [],
            }];
            
            const newWeek: WeekData = {
              weekNumber: newWeekNumber,
              days: newWeekDays,
            };
            
            const updatedWeeks = [...weeks, newWeek];
            setWeeks(updatedWeeks);
            setCurrentWeekIndex(updatedWeeks.length - 1); // Ir a la nueva semana
            
            // Guardar el número de semanas
            try {
              await AsyncStorage.setItem('custom_plan_weeks_count', updatedWeeks.length.toString());
            } catch (error) {
              console.error('Error saving weeks count:', error);
            }
            
            showAlert(
              '¡Listo!',
              `Semana ${newWeekNumber} agregada exitosamente`,
              [{ text: 'OK' }],
              { icon: 'checkmark-circle', iconColor: '#4CAF50' }
            );
          },
        },
      ],
      { icon: 'add-circle', iconColor: '#ffb300' }
    );
  };

  const handleDeleteWeek = async (weekIndex: number) => {
    if (weeks.length === 1) {
      showAlert(
        'No se puede eliminar',
        'Debe haber al menos una semana en el plan.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#ffb300' }
      );
      return;
    }

    const weekToDelete = weeks[weekIndex];
    
    showAlert(
      'Eliminar Semana',
      `¿Estás seguro de que quieres eliminar la Semana ${weekToDelete.weekNumber}?\n\nSe perderán todos los ejercicios de esta semana.\n\nEsta acción no se puede deshacer.`,
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
              await AsyncStorage.setItem('custom_plan_weeks_count', updatedWeeks.length.toString());
              
              setShowWeekDropdown(false);
              showAlert(
                '¡Eliminado!',
                'Semana eliminada correctamente',
                [{ text: 'OK' }],
                { icon: 'checkmark-circle', iconColor: '#4CAF50' }
              );
            } catch (error) {
              console.error('Error deleting week:', error);
              showAlert(
                'Error',
                'No se pudo eliminar la semana',
                [{ text: 'OK' }],
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
        'Plan vacío',
        'Debes agregar al menos un ejercicio a algún día para guardar el plan.',
        [{ text: 'OK' }],
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
        'Plan parcial',
        `Has completado ${completedDays} de ${totalDays} días en ${weeks.length} ${weeks.length === 1 ? 'semana' : 'semanas'}.\n\n¿Quieres guardar el plan parcial? Podrás continuar editándolo después.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Guardar como Borrador',
            // Si el plan ya es activo, mantenerlo activo
            onPress: () => savePlanToDatabase(editingPlanId && isPlanCurrentlyActive),
          },
        ],
        { icon: 'document-text', iconColor: '#ffb300' }
      );
    } else {
      // Plan completo
      // Solo preguntar si quiere activarlo si NO es actualmente activo
      if (editingPlanId && isPlanCurrentlyActive) {
        // El plan ya es activo, guardar sin preguntar
        savePlanToDatabase(true);
      } else {
        // Plan nuevo o plan existente pero no activo - preguntar si quiere activarlo
        showAlert(
          '¿Activar este plan?',
          '¿Quieres que este sea tu plan de entrenamiento activo?',
          [
            {
              text: 'No',
              style: 'cancel',
              onPress: () => savePlanToDatabase(false),
            },
            {
              text: 'Sí',
              onPress: () => savePlanToDatabase(true),
            },
          ],
          { icon: 'checkmark-done-circle', iconColor: '#4CAF50' }
        );
      }
    }
  };

  const savePlanToDatabase = async (isActive: boolean) => {
    if (!user) {
      showAlert(
        'Error',
        'Usuario no autenticado',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#F44336' }
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
          'Error',
          'No hay días con ejercicios para guardar',
          [{ text: 'OK' }],
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
            day: day.name || `Día ${day.dayNumber}`,
            focus: day.name || `Día ${day.dayNumber}`,
            exercises: day.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: 60,
              setTypes: ex.setTypes || [], // Incluir tipos de series
            })),
            duration: 45,
          })),
        })),
        // Mantener weekly_structure para compatibilidad (primera semana)
        weekly_structure: allWeeksData[0]?.days.map(day => ({
          day: day.name || `Día ${day.dayNumber}`,
          focus: day.name || `Día ${day.dayNumber}`,
          exercises: day.exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: 60,
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
        }
      }

      const finalPlanName = planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`;
      
      // Obtener planId de params o AsyncStorage
      const planIdToUpdate = editingPlanId || await AsyncStorage.getItem('editing_plan_id');
      
      // Si estamos editando un plan existente, actualizar en lugar de insertar
      if (planIdToUpdate) {
        const { data, error } = await supabase
          .from('workout_plans')
          .update({
            plan_name: finalPlanName,
            description: `Plan personalizado de ${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}`,
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
            'Error',
            'No se pudo actualizar el plan. Intenta nuevamente.',
            [{ text: 'OK' }],
            { icon: 'alert-circle', iconColor: '#F44336' }
          );
          setIsSaving(false);
          return;
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

        showAlert(
          '¡Éxito!',
          isActive 
            ? 'Plan actualizado y activado exitosamente' 
            : 'Plan actualizado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
          [
            {
              text: 'OK',
              onPress: () => {
                // Volver al detalle del plan que estábamos editando
                router.push(`/(tabs)/workout-plan-detail?planId=${planIdToUpdate}` as any);
              },
            },
          ],
          { icon: 'checkmark-circle', iconColor: '#4CAF50' }
        );
        setIsSaving(false);
        return;
      }

      // Insertar el nuevo plan
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          plan_name: finalPlanName,
          description: `Plan personalizado de ${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}`,
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
          'Error',
          'No se pudo guardar el plan. Intenta nuevamente.',
          [{ text: 'OK' }],
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
      
      showAlert(
        '¡Éxito!',
        isActive 
          ? 'Plan guardado y activado exitosamente' 
          : 'Plan guardado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
        [
          {
            text: 'OK',
            onPress: () => {
              // Volver al detalle del plan recién creado
              if (newPlanId) {
                router.push(`/(tabs)/workout-plan-detail?planId=${newPlanId}` as any);
              } else {
                router.push('/(tabs)/workout' as any);
              }
            },
          },
        ],
        { icon: 'checkmark-circle', iconColor: '#4CAF50' }
      );
    } catch (error) {
      console.error('Error inesperado al guardar plan:', error);
      showAlert(
        'Error',
        'Ocurrió un error al guardar el plan',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
    } finally {
      setIsSaving(false);
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
        <Text style={styles.headerTitle}>Días del Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Nombre del plan editable */}
        <View style={styles.planNameContainer}>
          {isEditingPlanName ? (
            <View style={styles.planNameEditContainer}>
              <TextInput
                style={styles.planNameInput}
                value={planName}
                onChangeText={setPlanName}
                placeholder="Nombre del plan"
                placeholderTextColor="#666"
                autoFocus
                onBlur={async () => {
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
                onSubmitEditing={async () => {
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
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
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
                  {planName || `Plan Personalizado - ${new Date().toLocaleDateString()}`}
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
                Semana {weeks[currentWeekIndex]?.weekNumber || 1}
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
                        <Text style={[
                          styles.weekDropdownItemText,
                          currentWeekIndex === index && styles.weekDropdownItemTextActive
                        ]}>
                          Semana {week.weekNumber}
                        </Text>
                        <Text style={styles.weekDropdownItemDays}>
                          {week.days.length} {week.days.length === 1 ? 'día' : 'días'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.weekDropdownDeleteButton}
                      onPress={() => handleDeleteWeek(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
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
                  Agregar Semana
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={styles.weekInfo}>
          <Text style={styles.description}>
            Selecciona cada día para agregar ejercicios
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
                  {day.name || `Día ${day.dayNumber}`}
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
                      {day.exercises.length} {day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
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
                                  {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
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
                  <Text style={styles.emptyDayText}>Agregar ejercicios</Text>
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
          <Text style={styles.addDayButtonText}>Agregar Día</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSavePlan}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardar Plan</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      
      <AlertComponent />
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

