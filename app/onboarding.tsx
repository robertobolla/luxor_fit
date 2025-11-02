import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../src/services/supabase';
import { FitnessLevel, FitnessGoal, Equipment, ActivityType, Gender } from '../src/types';
import { getClerkUserEmail } from '../src/utils/clerkHelpers';
import ClearClerkSessionButton from '../src/components/ClearClerkSessionButton';

const STEPS = [
  'welcome',
  'personal_info',
  'gender',
  'fitness_level',
  'goals',
  'activity_types',
  'availability',
  'session_duration',
  'equipment',
  'complete',
];

export default function OnboardingScreen() {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: Gender.MALE,
    height: '',
    weight: '',
    body_fat_percentage: '',
    muscle_percentage: '',
    fitness_level: FitnessLevel.BEGINNER,
    goals: [] as FitnessGoal[],
    activity_types: [] as ActivityType[],
    available_days: 3,
    session_duration: 30,
    equipment: [] as Equipment[],
  });

  // Cargar perfil existente si hay uno
  React.useEffect(() => {
    const loadExistingProfile = async () => {
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        console.log('🔍 Verificando si existe perfil para pre-cargar...');
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error al cargar perfil:', error);
          setIsLoadingProfile(false);
          return;
        }

        if (data) {
          console.log('✅ Perfil existente encontrado, pre-cargando datos...');
          setIsEditing(true);
          const allowedGenders = [Gender.MALE, Gender.FEMALE];
          setFormData({
            name: data.name || '',
            email: data.email || '',
            age: data.age?.toString() || '',
            gender: allowedGenders.includes(data.gender as Gender) ? (data.gender as Gender) : Gender.MALE,
            height: data.height?.toString() || '',
            weight: data.weight?.toString() || '',
            body_fat_percentage: data.body_fat_percentage?.toString() || '',
            muscle_percentage: data.muscle_percentage?.toString() || '',
            fitness_level: data.fitness_level || FitnessLevel.BEGINNER,
            goals: data.goals || [],
            activity_types: data.activity_types || [],
            available_days: data.available_days || 3,
            session_duration: data.session_duration || 30,
            equipment: data.equipment || [],
          });
        } else {
          console.log('ℹ️ No hay perfil existente, creando nuevo...');
          setIsEditing(false);
        }
      } catch (error) {
        console.error('❌ Error inesperado:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadExistingProfile();
  }, [user]);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar edición',
      '¿Estás seguro de que quieres cancelar? Los cambios no se guardarán.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: () => router.back()
        },
      ]
    );
  };

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
      router.replace('/(auth)/login');
      return;
    }

    try {
      setIsSubmitting(true);

      // Intentar obtener email de Clerk primero
      console.log('🔍 Intentando obtener email de Clerk...');
      const clerkEmail = await getClerkUserEmail(user);
      
      // Prioridad: email ingresado manualmente > email de Clerk
      const finalEmail = formData.email || clerkEmail || null;
      
      console.log('📧 Email final a guardar:', finalEmail);
      if (finalEmail) {
        console.log('  ✅ Fuente:', formData.email ? 'Usuario' : 'Clerk');
      } else {
        console.log('  ⚠️ No hay email disponible');
      }
      
      await proceedWithSave(finalEmail);
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseOptionalNumber = (value: string): number | null => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  const proceedWithSave = async (userEmail: string | null) => {
    try {
      console.log('💾 Guardando perfil en Supabase...');

      // Preparar datos base
      const profileData: any = {
        user_id: user.id,
        email: userEmail,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        height: parseInt(formData.height),
        weight: parseInt(formData.weight),
        fitness_level: formData.fitness_level,
        goals: formData.goals,
        activity_types: formData.activity_types,
        available_days: formData.available_days,
        session_duration: formData.session_duration,
        equipment: formData.equipment,
        updated_at: new Date().toISOString(),
      };

      // Agregar campos opcionales de composición corporal solo si tienen valores
      // (para evitar errores si las columnas aún no existen en Supabase)
      const bodyFat = parseOptionalNumber(formData.body_fat_percentage);
      const muscle = parseOptionalNumber(formData.muscle_percentage);
      
      if (bodyFat !== null) {
        profileData.body_fat_percentage = bodyFat;
      }
      if (muscle !== null) {
        profileData.muscle_percentage = muscle;
      }

      console.log('📊 Datos a guardar:', Object.keys(profileData));
      
      // Guardar el perfil en Supabase usando el ID de Clerk
      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id', // Usar user_id para determinar si actualizar o insertar
        });

      // Si hubo error, manejar el caso de columnas faltantes
      if (error) {
        console.error('❌ Error al guardar perfil:', error);
        
        // Si el error es porque faltan columnas, mostrar un mensaje específico
        if (error.message?.includes('body_fat_percentage') || error.message?.includes('muscle_percentage')) {
          console.log('⚠️ Las columnas de composición corporal no existen aún en Supabase');
          console.log('💡 Ejecuta los scripts SQL primero (ver INSTRUCCIONES_SQL.md)');
          console.log('   Intentando guardar sin campos de composición...');
          
          // Intentar de nuevo sin los campos de composición corporal
          delete profileData.body_fat_percentage;
          delete profileData.muscle_percentage;
          
          const { error: retryError } = await supabase
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'user_id' });
          
          if (retryError) {
            console.error('❌ Error incluso sin campos de composición:', retryError);
            Alert.alert('Error', 'No se pudo guardar tu perfil. Por favor, intenta nuevamente.');
            throw retryError;
          } else {
            console.log('✅ Perfil guardado exitosamente (sin campos de composición)');
          }
        } else {
          Alert.alert('Error', 'No se pudo guardar tu perfil. Por favor, intenta nuevamente.');
          throw error;
        }
      }

      console.log('✅ Perfil guardado exitosamente');
      
      // Verificar si este email corresponde a un empresario o socio pendiente y actualizar su user_id
      if (userEmail) {
        try {
          // Actualizar empresario si aplica
          const { data: empresarioData } = await supabase
            .from('admin_roles')
            .select('user_id')
            .eq('email', userEmail)
            .eq('role_type', 'empresario')
            .maybeSingle();

          if (empresarioData && empresarioData.user_id?.startsWith('temp_')) {
            // Actualizar el user_id del empresario con el user_id real de Clerk
            await supabase
              .from('admin_roles')
              .update({ user_id: user.id })
              .eq('email', userEmail)
              .eq('role_type', 'empresario');
            
            console.log('✅ User ID del empresario actualizado automáticamente');
          }

          // Actualizar socio si aplica
          const { data: socioData } = await supabase
            .from('admin_roles')
            .select('user_id')
            .eq('email', userEmail)
            .eq('role_type', 'socio')
            .maybeSingle();

          if (socioData && socioData.user_id?.startsWith('temp_')) {
            // Actualizar el user_id del socio con el user_id real de Clerk
            await supabase
              .from('admin_roles')
              .update({ user_id: user.id })
              .eq('email', userEmail)
              .eq('role_type', 'socio');
            
            console.log('✅ User ID del socio actualizado automáticamente');
          }

          // Actualizar miembro de gimnasio si aplica
          // Buscar si este usuario está en gym_members pero con user_id diferente
          // Esto pasa cuando se crea el usuario desde el dashboard antes de que se registre
          const { data: gymMemberData } = await supabase
            .from('gym_members')
            .select('user_id, empresario_id')
            .eq('user_id', user.id)
            .maybeSingle();

          // Si no está en gym_members pero hay un registro pendiente para este email
          // buscamos por el email en user_profiles y luego en gym_members
          if (!gymMemberData) {
            // Verificar si hay un registro en gym_members que necesite actualización
            // Esto se hace buscando si el email del usuario coincide con algún user_profile
            // que tenga un registro en gym_members pendiente
            // Como no tenemos email directamente en gym_members, verificamos desde user_profiles
            const { data: profileWithEmail } = await supabase
              .from('user_profiles')
              .select('user_id, email')
              .eq('email', userEmail)
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileWithEmail) {
              // Verificar si hay un registro en gym_members que necesite ser actualizado
              // Buscar si hay algún registro con user_id que no coincida pero el email del perfil coincida
              // Nota: Esto requiere que el email esté en user_profiles primero
              // Por ahora, el flujo es: se crea usuario en Clerk → se crea en gym_members con user_id real
              // Entonces esto no debería ser necesario, pero lo dejamos por si acaso
            }
          }
        } catch (err) {
          console.error('⚠️ Error actualizando user_id de admin_roles:', err);
          // No bloquea el flujo si falla
        }
      }

      // Éxito - redirigir a la pantalla de introducción del plan
      router.replace({
        pathname: '/plan-introduction',
        params: {
          name: formData.name,
          age: formData.age.toString(),
          fitness_level: formData.fitness_level,
          goals: JSON.stringify(formData.goals),
          activity_types: JSON.stringify(formData.activity_types),
          available_days: formData.available_days.toString(),
          session_duration: formData.session_duration.toString(),
          equipment: JSON.stringify(formData.equipment),
        },
      });
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar. Por favor, intenta nuevamente.');
    }
  };

  const toggleGoal = (goal: FitnessGoal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const toggleActivityType = (activityType: ActivityType) => {
    setFormData(prev => ({
      ...prev,
      activity_types: prev.activity_types.includes(activityType)
        ? prev.activity_types.filter(a => a !== activityType)
        : [...prev.activity_types, activityType]
    }));
  };

  const toggleEquipment = (equipment: Equipment) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>
              {isEditing ? '✏️ Editar perfil' : '¡Bienvenido a FitMind!'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing 
                ? 'Actualiza tu información personal y preferencias'
                : 'Vamos a personalizar tu experiencia de entrenamiento con IA'
              }
            </Text>
            <Text style={styles.description}>
              {isEditing
                ? 'Revisa y modifica los datos que necesites. Tus datos actuales están pre-cargados como referencia.'
                : 'Te haremos algunas preguntas para crear el plan perfecto para ti'
              }
            </Text>
          </View>
        );

      case 'personal_info':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Información personal</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="tu@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Tu nombre"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Edad</Text>
              <TextInput
                style={styles.input}
                value={formData.age}
                onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
                placeholder="25"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={formData.height}
                onChangeText={(text) => setFormData(prev => ({ ...prev, height: text }))}
                placeholder="175"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                value={formData.weight}
                onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
                placeholder="70"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Grasa corporal (%) - Opcional</Text>
              <TextInput
                style={styles.input}
                value={formData.body_fat_percentage}
                onChangeText={(text) => setFormData(prev => ({ ...prev, body_fat_percentage: text }))}
                placeholder="15"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <Text style={styles.optionalText}>Esta información ayuda a personalizar mejor tu plan nutricional</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Masa muscular (%) - Opcional</Text>
              <TextInput
                style={styles.input}
                value={formData.muscle_percentage}
                onChangeText={(text) => setFormData(prev => ({ ...prev, muscle_percentage: text }))}
                placeholder="40"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <Text style={styles.optionalText}>Esta información ayuda a personalizar mejor tu plan nutricional</Text>
            </View>
          </View>
        );

      case 'gender':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu género?</Text>
            <Text style={styles.stepSubtitle}>Esto nos ayuda a personalizar mejor tu plan</Text>
            {[Gender.MALE, Gender.FEMALE].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  formData.gender === gender && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, gender }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.gender === gender && styles.selectedOptionText
                ]}>
                  {gender === Gender.MALE && '👨 Hombre'}
                  {gender === Gender.FEMALE && '👩 Mujer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'fitness_level':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu nivel de fitness?</Text>
            {Object.values(FitnessLevel).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  formData.fitness_level === level && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, fitness_level: level }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.fitness_level === level && styles.selectedOptionText
                ]}>
                  {level === FitnessLevel.BEGINNER && 'Principiante - Nuevo en el fitness'}
                  {level === FitnessLevel.INTERMEDIATE && 'Intermedio - Algunos meses de experiencia'}
                  {level === FitnessLevel.ADVANCED && 'Avanzado - Años de experiencia'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'goals':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuáles son tus objetivos?</Text>
            <Text style={styles.stepSubtitle}>Selecciona todos los que apliquen</Text>
            {Object.values(FitnessGoal).map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.optionButton,
                  formData.goals.includes(goal) && styles.selectedOption
                ]}
                onPress={() => toggleGoal(goal)}
              >
                <Text style={[
                  styles.optionText,
                  formData.goals.includes(goal) && styles.selectedOptionText
                ]}>
                  {goal === FitnessGoal.WEIGHT_LOSS && 'Perder peso'}
                  {goal === FitnessGoal.MUSCLE_GAIN && 'Ganar músculo'}
                  {goal === FitnessGoal.STRENGTH && 'Aumentar fuerza'}
                  {goal === FitnessGoal.ENDURANCE && 'Mejorar resistencia'}
                  {goal === FitnessGoal.FLEXIBILITY && 'Flexibilidad/Movilidad'}
                  {goal === FitnessGoal.GENERAL_FITNESS && 'Mantener forma general'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'activity_types':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipo de actividades prefieres?</Text>
            <Text style={styles.stepSubtitle}>Selecciona todas las que te gusten</Text>
            {Object.values(ActivityType).map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.optionButton,
                  formData.activity_types.includes(activity) && styles.selectedOption
                ]}
                onPress={() => toggleActivityType(activity)}
              >
                <Text style={[
                  styles.optionText,
                  formData.activity_types.includes(activity) && styles.selectedOptionText
                ]}>
                  {activity === ActivityType.CARDIO && '🏃 Cardio (correr, nadar, bici)'}
                  {activity === ActivityType.STRENGTH && '💪 Fuerza (pesas, calistenia)'}
                  {activity === ActivityType.SPORTS && '⚽ Deportes (fútbol, basketball)'}
                  {activity === ActivityType.YOGA && '🧘 Yoga/Pilates'}
                  {activity === ActivityType.HIIT && '🔥 HIIT (entrenamiento intenso)'}
                  {activity === ActivityType.MIXED && '🎯 Mixto (de todo un poco)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'availability':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuántos días puedes entrenar por semana?</Text>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.optionButton,
                  formData.available_days === days && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, available_days: days }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.available_days === days && styles.selectedOptionText
                ]}>
                  {days} {days === 1 ? 'día' : 'días'} por semana
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'session_duration':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuánto tiempo tienes por sesión?</Text>
            {[15, 30, 45, 60, 90].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.optionButton,
                  formData.session_duration === minutes && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, session_duration: minutes }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.session_duration === minutes && styles.selectedOptionText
                ]}>
                  {minutes} minutos
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'equipment':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué equipamiento tienes disponible?</Text>
            <Text style={styles.stepSubtitle}>Selecciona todo lo que tengas</Text>
            {Object.values(Equipment).map((equipment) => (
              <TouchableOpacity
                key={equipment}
                style={[
                  styles.optionButton,
                  formData.equipment.includes(equipment) && styles.selectedOption
                ]}
                onPress={() => toggleEquipment(equipment)}
              >
                <Text style={[
                  styles.optionText,
                  formData.equipment.includes(equipment) && styles.selectedOptionText
                ]}>
                  {equipment === Equipment.NONE && 'Solo peso corporal'}
                  {equipment === Equipment.DUMBBELLS && 'Mancuernas'}
                  {equipment === Equipment.BARBELL && 'Barra olímpica'}
                  {equipment === Equipment.RESISTANCE_BANDS && 'Bandas de resistencia'}
                  {equipment === Equipment.PULL_UP_BAR && 'Barra de dominadas'}
                  {equipment === Equipment.BENCH && 'Banco'}
                  {equipment === Equipment.GYM_ACCESS && 'Acceso a gimnasio'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>¡Perfecto!</Text>
            <Text style={styles.subtitle}>
              Hemos creado tu perfil personalizado
            </Text>
            <Text style={styles.description}>
              Ahora podemos generar entrenamientos adaptados específicamente para ti
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep]) {
      case 'personal_info':
        return formData.name && formData.age && formData.height && formData.weight;
      case 'goals':
        return formData.goals.length > 0;
      case 'activity_types':
        return formData.activity_types.length > 0;
      case 'equipment':
        return formData.equipment.length > 0;
      default:
        return true;
    }
  };

  // Mostrar loading mientras carga el perfil
  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Botón de cerrar solo si está editando */}
      {isEditing && (
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${((currentStep + 1) / STEPS.length) * 100}%` }
          ]} 
        />
      </View>

      <ScrollView style={styles.content}>
        {renderStep()}
        
        {/* Botón de limpiar sesión solo en el primer paso */}
        {currentStep === 0 && (
          <ClearClerkSessionButton />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        )}
        
        <View style={{ flex: 1 }} />
        
        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton]}
            onPress={nextStep}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>Siguiente</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, isSubmitting && styles.disabledButton]}
            onPress={handleComplete}
            disabled={isSubmitting}
          >
            <Text style={styles.completeButtonText}>
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : '¡Comenzar!')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: '#00D4AA',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedOption: {
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButtonText: {
    color: '#888',
    fontSize: 17,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  optionalText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
