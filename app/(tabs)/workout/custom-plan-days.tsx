import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';

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

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [planName, setPlanName] = useState<string>('');
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Días de la semana actual
  const currentWeekDays = weeks[currentWeekIndex]?.days || [];
  
  // Días por semana dinámico basado en la cantidad actual de días
  const daysPerWeek = currentWeekDays.length;

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

          // Agregar días vacíos si faltan
          while (weekDays.length < daysPerWeek) {
            const dayNumber = weekDays.length + 1;
            weekDays.push({
              dayNumber,
              exercises: [],
            });
          }

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
  }, [daysPerWeek, editingPlanId, user]);

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
        daysPerWeek: daysPerWeek.toString(),
        equipment: JSON.stringify(equipment),
        dayData: JSON.stringify(dayData),
      },
    });
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
    
    Alert.alert('¡Listo!', `Día ${newDayNumber} agregado a la Semana ${currentWeek.weekNumber}`);
  };

  const handleDeleteDay = async (dayNumber: number) => {
    const currentWeek = weeks[currentWeekIndex];
    if (!currentWeek) return;
    
    // No permitir eliminar si es el único día
    if (currentWeek.days.length === 1) {
      Alert.alert(
        'No se puede eliminar',
        'Debe haber al menos un día en la semana. Si no quieres este día, elimina la semana completa.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const dayToDelete = currentWeek.days.find(d => d.dayNumber === dayNumber);
    const dayName = dayToDelete?.name || `Día ${dayNumber}`;
    
    Alert.alert(
      'Eliminar Día',
      `¿Estás seguro de que quieres eliminar ${dayName}? Esta acción no se puede deshacer.`,
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
              
              Alert.alert('¡Eliminado!', `${dayName} ha sido eliminado.`);
            } catch (error) {
              console.error('Error eliminando día:', error);
              Alert.alert('Error', 'No se pudo eliminar el día. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };
  
  const handleAddWeek = async () => {
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
  };

  const handleSavePlan = () => {
    // Verificar que al menos un día de alguna semana tenga ejercicios
    const hasAnyExercises = weeks.some(week => 
      week.days.some(day => day.exercises.length > 0)
    );
    
    if (!hasAnyExercises) {
      Alert.alert(
        'Plan vacío',
        'Debes agregar al menos un ejercicio a algún día para guardar el plan.',
        [{ text: 'OK' }]
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
      Alert.alert(
        'Plan parcial',
        `Has completado ${completedDays} de ${totalDays} días en ${weeks.length} ${weeks.length === 1 ? 'semana' : 'semanas'}. ¿Quieres guardar el plan parcial? Podrás continuar editándolo después.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Guardar como Borrador',
            onPress: () => savePlanToDatabase(false),
          },
        ]
      );
    } else {
      // Plan completo - preguntar si quiere activarlo
      Alert.alert(
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
        ]
      );
    }
  };

  const savePlanToDatabase = async (isActive: boolean) => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    try {
      // Cargar todas las semanas desde AsyncStorage
      const totalWeeks = weeks.length;
      const allWeeksData: WeekData[] = [];
      
      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weekDays: DayData[] = [];
        
        for (let dayNum = 1; dayNum <= daysPerWeek; dayNum++) {
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
        Alert.alert('Error', 'No hay días con ejercicios para guardar');
        setIsSaving(false);
        return;
      }

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
        days_per_week: daysPerWeek,
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
            description: `Plan personalizado de ${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}, ${daysPerWeek} días por semana`,
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
          Alert.alert('Error', 'No se pudo actualizar el plan. Intenta nuevamente.');
          setIsSaving(false);
          return;
        }

        // Limpiar AsyncStorage después de actualizar
        for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
          for (let dayNum = 1; dayNum <= daysPerWeek; dayNum++) {
            await AsyncStorage.removeItem(`week_${weekNum}_day_${dayNum}_data`);
          }
        }
        await AsyncStorage.removeItem('custom_plan_name');
        await AsyncStorage.removeItem('custom_plan_weeks_count');
        await AsyncStorage.removeItem('editing_plan_id');

        Alert.alert(
          'Éxito',
          isActive 
            ? 'Plan actualizado y activado exitosamente' 
            : 'Plan actualizado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/(tabs)/workout');
              },
            },
          ]
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
          description: `Plan personalizado de ${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}, ${daysPerWeek} días por semana`,
          duration_weeks: planData.duration_weeks,
          plan_data: planData,
          is_active: isActive,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error al guardar plan:', error);
        Alert.alert('Error', 'No se pudo guardar el plan. Intenta nuevamente.');
        setIsSaving(false);
        return;
      }

      // Limpiar AsyncStorage después de guardar
      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        for (let dayNum = 1; dayNum <= daysPerWeek; dayNum++) {
          await AsyncStorage.removeItem(`week_${weekNum}_day_${dayNum}_data`);
        }
      }
      await AsyncStorage.removeItem('custom_plan_name');
      await AsyncStorage.removeItem('custom_plan_weeks_count');
      await AsyncStorage.removeItem('editing_plan_id');

      Alert.alert(
        'Éxito',
        isActive 
          ? 'Plan guardado y activado exitosamente' 
          : 'Plan guardado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push('/(tabs)/workout');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error inesperado al guardar plan:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el plan');
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
            // Si estamos editando un plan existente, volver a la lista de planes
            // Si estamos creando uno nuevo, volver al setup
            if (editingPlanId) {
              router.push('/(tabs)/workout' as any);
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

        {/* Navegación de semanas */}
        {weeks.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.weeksNav}
            contentContainerStyle={styles.weeksNavContent}
          >
            {weeks.map((week, index) => (
              <TouchableOpacity
                key={week.weekNumber}
                style={[
                  styles.weekTab,
                  currentWeekIndex === index && styles.weekTabActive
                ]}
                onPress={() => setCurrentWeekIndex(index)}
              >
                <Text style={[
                  styles.weekTabText,
                  currentWeekIndex === index && styles.weekTabTextActive
                ]}>
                  Semana {week.weekNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.weekInfo}>
          <Text style={styles.weekTitle}>
            Semana {weeks[currentWeekIndex]?.weekNumber || 1}
          </Text>
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
              <TouchableOpacity 
                style={styles.dayCardContent}
                onPress={() => handleDayPress(day.dayNumber)}
                activeOpacity={0.7}
              >
                {day.exercises.length > 0 ? (
                  <View>
                    <Text style={styles.exerciseCount}>
                      {day.exercises.length} {day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                    </Text>
                    <View style={styles.exercisePreview}>
                      {day.exercises.slice(0, 3).map((exercise, idx) => (
                        <Text key={idx} style={styles.exerciseName}>
                          • {exercise.name}
                        </Text>
                      ))}
                      {day.exercises.length > 3 && (
                        <Text style={styles.moreExercises}>
                          +{day.exercises.length - 3} más
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyDay}>
                    <Ionicons name="add-circle-outline" size={32} color="#666" />
                    <Text style={styles.emptyDayText}>Agregar ejercicios</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Botón Agregar Día */}
        <TouchableOpacity
          style={styles.addDayButton}
          onPress={handleAddDay}
          disabled={isSaving}
        >
          <Ionicons name="add-circle" size={24} color="#ffb300" />
          <Text style={styles.addDayButtonText}>Agregar Día</Text>
        </TouchableOpacity>

        {/* Botón Agregar Semana */}
        <TouchableOpacity
          style={styles.addWeekButton}
          onPress={handleAddWeek}
          disabled={isSaving}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ffb300" />
          <Text style={styles.addWeekButtonText}>Agregar Semana</Text>
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
  exerciseCount: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '600',
    marginBottom: 8,
  },
  exercisePreview: {
    gap: 4,
  },
  exerciseName: {
    fontSize: 14,
    color: '#ccc',
  },
  moreExercises: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
  },
  addDayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  addWeekButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
});

