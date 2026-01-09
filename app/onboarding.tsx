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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/services/supabase';
import { Gender } from '../src/types';
import { getClerkUserEmail } from '../src/utils/clerkHelpers';
import { validateEmail, validateAge, validateWeight, validateHeight, validateRequired, validateMinLength, validateUsernameFormat } from '../src/utils/formValidation';

const STEPS = [
  'welcome',
  'personal_info',
  'gender',
  'complete',
];

export default function OnboardingScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasClerkEmail, setHasClerkEmail] = useState(false); // Indica si el usuario tiene email en Clerk
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    age: '',
    gender: Gender.MALE,
    height: '',
    weight: '',
  });
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Cargar email de Clerk y perfil existente
  React.useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        // Primero cargar email de Clerk
        let clerkEmail: string | null = null;
        try {
          clerkEmail = await getClerkUserEmail(user);
          if (clerkEmail) {
            console.log('✅ Email de Clerk encontrado:', clerkEmail);
            setHasClerkEmail(true);
          } else {
            console.log('ℹ️ No hay email en Clerk, el usuario deberá ingresarlo');
            setHasClerkEmail(false);
          }
        } catch (error) {
          console.error('❌ Error obteniendo email de Clerk:', error);
          setHasClerkEmail(false);
        }

        // Luego cargar perfil existente
        console.log('🔍 Verificando si existe perfil para pre-cargar...');
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error al cargar perfil:', error);
          setIsLoadingProfile(false);
          return;
        }

        if (data) {
          console.log('✅ Perfil existente encontrado, pre-cargando datos...');
          setIsEditing(true);
          const allowedGenders = [Gender.MALE, Gender.FEMALE];
          
          // Prioridad: email de Clerk > email del perfil guardado
          const emailToUse = clerkEmail || data.email || '';
          
          setFormData({
            name: data.name || '',
            email: emailToUse,
            username: data.username || '',
            age: data.age?.toString() || '',
            gender: allowedGenders.includes(data.gender as Gender) ? (data.gender as Gender) : Gender.MALE,
            height: data.height?.toString() || '',
            weight: data.weight?.toString() || '',
          });
        } else {
          console.log('ℹ️ No hay perfil existente, creando nuevo...');
          setIsEditing(false);
          // Si hay email de Clerk, pre-llenarlo
          if (clerkEmail) {
            setFormData(prev => ({ ...prev, email: clerkEmail! }));
          }
        }
      } catch (error) {
        console.error('❌ Error inesperado:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadData();
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
          onPress: () => router.push('/' as any)
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar nombre
    const nameValidation = validateMinLength(formData.name, 2, 'El nombre');
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || '';
    }

    // Validar edad
    const ageValidation = validateAge(formData.age);
    if (!ageValidation.isValid) {
      errors.age = ageValidation.error || '';
    }

    // Validar altura
    const heightValidation = validateHeight(formData.height);
    if (!heightValidation.isValid) {
      errors.height = heightValidation.error || '';
    }

    // Validar peso
    const weightValidation = validateWeight(formData.weight);
    if (!weightValidation.isValid) {
      errors.weight = weightValidation.error || '';
    }

    // Validar email solo si NO viene de Clerk (si el usuario lo ingresó manualmente)
    if (!hasClerkEmail && formData.email && formData.email.trim().length > 0) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        errors.email = emailValidation.error || '';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplete = async () => {
    if (!user) {
      Alert.alert(t('common.error'), t('onboarding.userNotIdentified'));
      router.replace('/(auth)/login');
      return;
    }

    // Validar formulario antes de enviar
    if (!validateForm()) {
      Alert.alert(t('onboarding.invalidFields'), t('onboarding.correctErrors'));
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
      Alert.alert(t('common.error'), t('errors.unknownError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseOptionalNumber = (value: string): number | null => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  const proceedWithSave = async (userEmail: string | null) => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('onboarding.userNotFound'));
      return;
    }

    const userId = user.id; // Guardar en constante para evitar problemas de tipos en callbacks

    try {
      console.log('💾 Guardando perfil en Supabase...');

      // Verificar si ya existe un perfil con este email pero diferente user_id
      if (userEmail) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('user_id, name, created_at')
          .eq('email', userEmail)
          .neq('user_id', userId)
          .maybeSingle();

        if (existingProfile) {
          console.warn('⚠️ Usuario duplicado detectado:', {
            email: userEmail,
            existing_user_id: existingProfile.user_id,
            current_user_id: userId,
          });
          
          Alert.alert(
            t('onboarding.existingAccount'),
            t('onboarding.existingAccountMessage', { email: userEmail }),
            [
              {
                text: t('common.logout'),
                style: 'destructive',
                onPress: async () => {
                  // Cerrar sesión y redirigir al login
                  try {
                    await signOut();
                    router.replace('/(auth)/login');
                  } catch (error) {
                    console.error('Error cerrando sesión:', error);
                    router.replace('/(auth)/login');
                  }
                }
              },
              {
                text: t('common.cancel'),
                style: 'cancel',
                onPress: () => {
                  // No hacer nada, el usuario cancela
                }
              }
            ]
          );
          return;
        }
      }

      continueWithSave(userEmail);
    } catch (error) {
      console.error('❌ Error verificando duplicados:', error);
      // Continuar con el guardado normal si hay error en la verificación
      continueWithSave(userEmail);
    }
  };

  const continueWithSave = async (userEmail: string | null) => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('onboarding.userNotFound'));
      return;
    }
    const userId = user.id;

    try {
      // Validar username antes de guardar
      if (!formData.username || formData.username.trim().length === 0) {
        Alert.alert(t('common.error'), t('onboarding.usernameRequired'));
        setCurrentStep(STEPS.indexOf('personal_info'));
        return;
      }
      
      const usernameValidation = validateUsernameFormat(formData.username);
      if (!usernameValidation.isValid) {
        Alert.alert(t('common.error'), usernameValidation.error || t('onboarding.invalidUsername'));
        setCurrentStep(STEPS.indexOf('personal_info'));
        setFieldErrors(prev => ({ ...prev, username: usernameValidation.error || '' }));
        return;
      }
      
      // Verificar que el username no esté en uso
      const { data: existingUsername } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', formData.username.toLowerCase().trim())
        .neq('user_id', userId)
        .maybeSingle();
      
      if (existingUsername) {
        Alert.alert(t('common.error'), t('onboarding.usernameInUse'));
        setCurrentStep(STEPS.indexOf('personal_info'));
        setFieldErrors(prev => ({ ...prev, username: 'Este nombre de usuario ya está en uso' }));
        return;
      }

      // Preparar datos base
      const profileData: any = {
        user_id: userId,
        email: userEmail,
        username: formData.username.toLowerCase().trim(),
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        height: parseInt(formData.height),
        weight: parseInt(formData.weight),
        updated_at: new Date().toISOString(),
      };


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
          
          const { error: retryError } = await supabase
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'user_id' });
          
          if (retryError) {
            console.error('❌ Error al guardar:', retryError);
            Alert.alert(t('common.error'), t('onboarding.saveError'));
            throw retryError;
          } else {
            console.log('✅ Perfil guardado exitosamente (sin campos de composición)');
          }
        } else {
          Alert.alert(t('common.error'), t('onboarding.saveError'));
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
              .update({ user_id: userId })
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
              .update({ user_id: userId })
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
            .eq('user_id', userId)
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
              .eq('user_id', userId)
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

      // Éxito - redirigir al dashboard
      // El onboarding básico solo recopila datos personales
      // Los datos del plan de entrenamiento se recopilan en otro flujo
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      Alert.alert(t('common.error'), t('onboarding.saveError'));
    }
  };


  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>
              {isEditing ? t('onboarding.editProfile') : t('auth.welcome')}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing 
                ? t('onboarding.updateInformation')
                : t('onboarding.customizeExperience')
              }
            </Text>
            <Text style={styles.description}>
              {isEditing
                ? t('onboarding.reviewModify')
                : t('onboarding.someQuestions')
              }
            </Text>
          </View>
        );

      case 'personal_info':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboardingSteps.personalInfo')}</Text>
            {/* Solo mostrar campo de email si NO tiene email en Clerk */}
            {!hasClerkEmail && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, fieldErrors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, email: text }));
                    if (text.trim().length > 0) {
                      const validation = validateEmail(text);
                      if (!validation.isValid) {
                        setFieldErrors(prev => ({ ...prev, email: validation.error || '' }));
                      } else {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="tu@email.com"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fieldErrors.email && (
                  <Text style={styles.errorText}>{fieldErrors.email}</Text>
                )}
              </View>
            )}
            {/* Si tiene email de Clerk, mostrar un mensaje informativo */}
            {hasClerkEmail && formData.email && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.input, { backgroundColor: '#f5f5f5', paddingVertical: 12 }]}>
                  <Text style={{ color: '#666' }}>{formData.email}</Text>
                  <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    Usaremos el email de tu cuenta de Gmail
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, name: text }));
                  if (text.trim().length > 0) {
                    const validation = validateMinLength(text, 2, 'El nombre');
                    if (!validation.isValid) {
                      setFieldErrors(prev => ({ ...prev, name: validation.error || '' }));
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.name;
                        return newErrors;
                      });
                    }
                  } else {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.name;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Tu nombre"
                placeholderTextColor="#666"
              />
              {fieldErrors.name && (
                <Text style={styles.errorText}>{fieldErrors.name}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de usuario *</Text>
              <Text style={styles.inputHint}>
                Este será tu identificador único en la red social (ej: @juan_fitness)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 16, marginRight: 4 }}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }, fieldErrors.username && styles.inputError]}
                  value={formData.username}
                  onChangeText={async (text) => {
                    const lowerText = text.toLowerCase().trim();
                    setFormData(prev => ({ ...prev, username: lowerText }));
                    
                    // Limpiar error previo
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.username;
                      return newErrors;
                    });
                    
                    if (lowerText.length > 0) {
                      // Validar formato
                      const validation = validateUsernameFormat(lowerText);
                      if (!validation.isValid) {
                        setFieldErrors(prev => ({ ...prev, username: validation.error || '' }));
                        return;
                      }
                      
                      // Verificar disponibilidad (solo si el formato es válido)
                      setCheckingUsername(true);
                      try {
                        const { data, error } = await supabase
                          .from('user_profiles')
                          .select('username')
                          .eq('username', lowerText)
                          .neq('user_id', user?.id || '')
                          .maybeSingle();
                        
                        if (error && error.code !== 'PGRST116') {
                          console.error('Error verificando username:', error);
                        } else if (data) {
                          setFieldErrors(prev => ({ ...prev, username: 'Este nombre de usuario ya está en uso' }));
                        }
                      } catch (error) {
                        console.error('Error verificando username:', error);
                      } finally {
                        setCheckingUsername(false);
                      }
                    }
                  }}
                  placeholder="juan_fitness"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {checkingUsername && (
                  <Text style={{ marginLeft: 8, color: '#666' }}>✓</Text>
                )}
              </View>
              {fieldErrors.username && (
                <Text style={styles.errorText}>{fieldErrors.username}</Text>
              )}
              {!fieldErrors.username && formData.username.length >= 3 && !checkingUsername && (
                <Text style={{ color: '#4CAF50', fontSize: 12, marginTop: 4 }}>✓ Disponible</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Edad *</Text>
              <TextInput
                style={[styles.input, fieldErrors.age && styles.inputError]}
                value={formData.age}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, age: text }));
                  if (text.trim().length > 0) {
                    const validation = validateAge(text);
                    if (!validation.isValid) {
                      setFieldErrors(prev => ({ ...prev, age: validation.error || '' }));
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.age;
                        return newErrors;
                      });
                    }
                  } else {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.age;
                      return newErrors;
                    });
                  }
                }}
                placeholder="25"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              {fieldErrors.age && (
                <Text style={styles.errorText}>{fieldErrors.age}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Altura (cm) *</Text>
              <TextInput
                style={[styles.input, fieldErrors.height && styles.inputError]}
                value={formData.height}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, height: text }));
                  if (text.trim().length > 0) {
                    const validation = validateHeight(text);
                    if (!validation.isValid) {
                      setFieldErrors(prev => ({ ...prev, height: validation.error || '' }));
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.height;
                        return newErrors;
                      });
                    }
                  } else {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.height;
                      return newErrors;
                    });
                  }
                }}
                placeholder="175"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              {fieldErrors.height && (
                <Text style={styles.errorText}>{fieldErrors.height}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peso (kg) *</Text>
              <TextInput
                style={[styles.input, fieldErrors.weight && styles.inputError]}
                value={formData.weight}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, weight: text }));
                  if (text.trim().length > 0) {
                    const validation = validateWeight(text);
                    if (!validation.isValid) {
                      setFieldErrors(prev => ({ ...prev, weight: validation.error || '' }));
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.weight;
                        return newErrors;
                      });
                    }
                  } else {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.weight;
                      return newErrors;
                    });
                  }
                }}
                placeholder="70"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              {fieldErrors.weight && (
                <Text style={styles.errorText}>{fieldErrors.weight}</Text>
              )}
            </View>
          </View>
        );

      case 'gender':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu género?</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.helpPersonalize')}</Text>
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
        return formData.name && formData.username && formData.age && formData.height && formData.weight;
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
    top: 80,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: '#ffb300',
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
    color: '#ffb300',
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
  inputHint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
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
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
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
    backgroundColor: '#ffb300',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffb300',
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
    backgroundColor: '#ffb300',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffb300',
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
