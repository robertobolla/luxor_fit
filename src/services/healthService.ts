import { Platform } from 'react-native';

// Importar condicionalmente las librerías nativas
let AppleHealthKit: any = null;
let GoogleFit: any = null;

try {
  // Solo importar si estamos en un Development Build
  AppleHealthKit = require('react-native-health').default;
} catch (e) {
  console.log('⚠️ react-native-health no disponible (Expo Go)');
}

try {
  GoogleFit = require('react-native-google-fit').default;
} catch (e) {
  console.log('⚠️ react-native-google-fit no disponible (Expo Go)');
}

/**
 * Servicio para integrar con Apple Health (iOS) y Google Fit (Android)
 * 
 * ✅ Integración completa con:
 * - iOS: Apple HealthKit
 * - Android: Google Fit API
 */

export interface HealthData {
  steps: number;
  distance: number; // en km
  calories: number;
  sleep: number; // en horas
  heartRate?: number;
  weight?: number;
  glucose?: number;
  water?: number; // en ml
  food?: number; // calorías consumidas
}

/**
 * Solicita permisos para acceder a los datos de salud
 */
export async function requestHealthPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      // Verificar si AppleHealthKit está disponible
      if (!AppleHealthKit) {
        console.log('⚠️ Apple Health no disponible. Usando datos simulados.');
        console.log('💡 Para usar datos reales, instala un Development Build.');
        return true; // Retornar true para continuar con datos simulados
      }

      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.BodyMass,
            AppleHealthKit.Constants.Permissions.BloodGlucose,
            AppleHealthKit.Constants.Permissions.Water,
            AppleHealthKit.Constants.Permissions.DietaryEnergy,
          ],
          write: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          ],
        },
      };

      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (err: any) => {
          if (err) {
            console.error('❌ Error inicializando HealthKit:', err);
            resolve(false);
            return;
          }
          console.log('✅ Apple Health conectado correctamente');
          resolve(true);
        });
      });
    } else if (Platform.OS === 'android') {
      // Verificar si GoogleFit está disponible
      if (!GoogleFit) {
        console.log('⚠️ Google Fit no disponible. Usando datos simulados.');
        console.log('💡 Para usar datos reales, instala un Development Build.');
        return true; // Retornar true para continuar con datos simulados
      }

      const Scopes = GoogleFit.Scopes || {};
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_ACTIVITY_WRITE,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_BODY_WRITE,
          Scopes.FITNESS_LOCATION_READ,
          Scopes.FITNESS_NUTRITION_READ,
        ],
      };

      const result = await GoogleFit.authorize(options);
      if (result.success) {
        console.log('✅ Google Fit conectado correctamente');
        return true;
      } else {
        console.error('❌ Error conectando con Google Fit');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error solicitando permisos de salud:', error);
    return false;
  }
}

// Cache de permisos para evitar solicitar múltiples veces
let permissionsRequested = false;
let hasPermissionsCache: boolean | null = null;

/**
 * Obtiene datos de salud para una fecha específica
 */
export async function getHealthDataForDate(date: Date): Promise<HealthData> {
  try {
    // Verificar permisos solo si no se han verificado antes
    if (!permissionsRequested) {
      console.log('🔐 Verificando permisos de salud...');
      hasPermissionsCache = await requestHealthPermissions();
      permissionsRequested = true;
      
      if (!hasPermissionsCache) {
        console.warn('⚠️ No se otorgaron permisos de salud. Retornando datos vacíos.');
        // Retornar datos vacíos en lugar de simulados
        return {
          steps: 0,
          distance: 0,
          calories: 0,
          sleep: 0,
        };
      }
    } else if (hasPermissionsCache === false) {
      // Si ya sabemos que no hay permisos, retornar datos vacíos
      console.warn('⚠️ No hay permisos de salud. Retornando datos vacíos.');
      return {
        steps: 0,
        distance: 0,
        calories: 0,
        sleep: 0,
      };
    }
    
    // Intentar obtener datos reales
    if (Platform.OS === 'ios') {
      const data = await getAppleHealthData(date);
      // Verificar si realmente obtuvo datos o si son simulados
      // Si todos los valores principales son 0, es probable que no haya datos reales
      if (data.steps === 0 && data.distance === 0 && data.calories === 0) {
        console.warn('⚠️ No se encontraron datos en Apple Health para esta fecha.');
      }
      return data;
    } else if (Platform.OS === 'android') {
      const data = await getGoogleFitData(date);
      // Verificar si realmente obtuvo datos o si son simulados
      if (data.steps === 0 && data.distance === 0 && data.calories === 0) {
        console.warn('⚠️ No se encontraron datos en Google Fit para esta fecha.');
      }
      return data;
    }
    
    throw new Error('Plataforma no soportada');
  } catch (error) {
    console.error('❌ Error obteniendo datos de salud:', error);
    // Retornar datos vacíos en lugar de simulados cuando hay error
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      sleep: 0,
    };
  }
}

/**
 * Obtiene datos de Apple Health
 */
async function getAppleHealthData(date: Date): Promise<HealthData> {
  // Si AppleHealthKit no está disponible, retornar datos vacíos
  if (!AppleHealthKit) {
    console.log('📱 Apple Health no disponible (probablemente Expo Go). Retornando datos vacíos.');
    console.log('💡 Para usar datos reales, crea un Development Build con: npm run build:dev:ios');
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      sleep: 0,
    };
  }

  try {
    // Verificar permisos antes de intentar obtener datos
    const hasPermissions = await new Promise<boolean>((resolve) => {
      AppleHealthKit.getAuthStatus(
        {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.Steps,
              AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
              AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            ],
          },
        },
        (err: any, results: any) => {
          if (err) {
            console.error('❌ Error verificando permisos:', err);
            resolve(false);
            return;
          }
          
          // Verificar que al menos uno tenga permiso autorizado
          const hasAnyPermission = Object.values(results).some(
            (status: any) => status === AppleHealthKit.Constants.Permissions.Authorized
          );
          
          if (!hasAnyPermission) {
            console.warn('⚠️ No hay permisos autorizados para leer datos de Apple Health');
            console.log('💡 Ve a Configuración > Privacidad y seguridad > Salud > Luxor Fitness y activa los permisos');
          }
          
          resolve(hasAnyPermission);
        }
      );
    });

    if (!hasPermissions) {
      console.warn('⚠️ No se tienen permisos para leer datos de Apple Health');
      return {
        steps: 0,
        distance: 0,
        calories: 0,
        sleep: 0,
      };
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    console.log('📱 Obteniendo datos de Apple Health para:', date.toISOString().split('T')[0]);

    // Obtener pasos usando getDailyStepCountSamples para obtener todos los datos agregados del día
    // Este método devuelve el total agregado del día, que coincide con la app de Salud
    const steps = await new Promise<number>((resolve) => {
      // Primero intentar con getDailyStepCountSamples (método recomendado)
      if (AppleHealthKit.getDailyStepCountSamples) {
        AppleHealthKit.getDailyStepCountSamples(options, (err: any, results: any) => {
          if (err || !results || results.length === 0) {
            // Fallback a getStepCount si getDailyStepCountSamples falla
            console.log('⚠️ getDailyStepCountSamples no devolvió datos, usando getStepCount como fallback');
            AppleHealthKit.getStepCount(options, (fallbackErr: any, fallbackResults: any) => {
              if (fallbackErr || !fallbackResults || fallbackResults.value === undefined) {
                console.warn('⚠️ No hay datos de pasos disponibles');
                console.log('💡 Verifica que la app tenga permisos en Configuración > Privacidad y seguridad > Salud');
                resolve(0);
                return;
              }
              console.log('✅ Pasos obtenidos de Apple Health (getStepCount):', fallbackResults.value);
              console.log('📱 Incluye datos de iPhone, Apple Watch y otras fuentes sincronizadas');
              resolve(fallbackResults.value);
            });
            return;
          }
          // Sumar todos los pasos del día (puede haber múltiples muestras de diferentes fuentes)
          const totalSteps = results.reduce((total: number, sample: any) => {
            return total + (sample.value || 0);
          }, 0);
          console.log('✅ Pasos obtenidos de Apple Health (getDailyStepCountSamples):', totalSteps);
          console.log('📱 Incluye datos de iPhone, Apple Watch y otras fuentes sincronizadas');
          console.log('📊 Muestras encontradas:', results.length);
          resolve(totalSteps);
        });
      } else {
        // Si getDailyStepCountSamples no está disponible, usar getStepCount directamente
        AppleHealthKit.getStepCount(options, (err: any, results: any) => {
          if (err || !results || results.value === undefined) {
            console.warn('⚠️ No hay datos de pasos disponibles');
            console.log('💡 Verifica que la app tenga permisos en Configuración > Privacidad y seguridad > Salud');
            resolve(0);
            return;
          }
          console.log('✅ Pasos obtenidos de Apple Health (getStepCount):', results.value);
          console.log('📱 Incluye datos de iPhone, Apple Watch y otras fuentes sincronizadas');
          resolve(results.value);
        });
      }
    });

    // Obtener distancia (incluye datos de Apple Watch y otras fuentes)
    const distance = await new Promise<number>((resolve) => {
      // Intentar con getDailyDistanceWalkingRunningSamples primero
      if (AppleHealthKit.getDailyDistanceWalkingRunningSamples) {
        AppleHealthKit.getDailyDistanceWalkingRunningSamples(options, (err: any, results: any) => {
          if (err || !results || results.length === 0) {
            // Fallback a getDistanceWalkingRunning
            AppleHealthKit.getDistanceWalkingRunning(options, (fallbackErr: any, fallbackResults: any) => {
              if (fallbackErr || !fallbackResults || fallbackResults.value === undefined) {
                console.warn('⚠️ No hay datos de distancia disponibles');
                resolve(0);
                return;
              }
              const distanceKm = fallbackResults.value / 1000; // Convertir metros a km
              console.log('✅ Distancia obtenida de Apple Health (getDistanceWalkingRunning):', distanceKm.toFixed(2), 'km');
              resolve(distanceKm);
            });
            return;
          }
          // Sumar todas las muestras de distancia
          const totalDistance = results.reduce((total: number, sample: any) => {
            return total + (sample.value || 0);
          }, 0) / 1000; // Convertir metros a km
          console.log('✅ Distancia obtenida de Apple Health (getDailyDistanceWalkingRunningSamples):', totalDistance.toFixed(2), 'km');
          resolve(totalDistance);
        });
      } else {
        AppleHealthKit.getDistanceWalkingRunning(options, (err: any, results: any) => {
          if (err) {
            console.error('❌ Error obteniendo distancia de Apple Health:', err);
            resolve(0);
            return;
          }
          if (!results || results.value === undefined) {
            console.warn('⚠️ No hay datos de distancia disponibles');
            resolve(0);
            return;
          }
          const distanceKm = results.value / 1000; // Convertir metros a km
          console.log('✅ Distancia obtenida de Apple Health:', distanceKm.toFixed(2), 'km');
          console.log('📱 Incluye datos de iPhone, Apple Watch y otras fuentes sincronizadas');
          resolve(distanceKm);
        });
      }
    });

    // Obtener calorías activas (incluye datos de Apple Watch y otras fuentes)
    const calories = await new Promise<number>((resolve) => {
      // Intentar con getDailyEnergyBurnedSamples primero
      if (AppleHealthKit.getDailyEnergyBurnedSamples) {
        AppleHealthKit.getDailyEnergyBurnedSamples(options, (err: any, results: any) => {
          if (err || !results || results.length === 0) {
            // Fallback a getActiveEnergyBurned
            AppleHealthKit.getActiveEnergyBurned(options, (fallbackErr: any, fallbackResults: any) => {
              if (fallbackErr || !fallbackResults || fallbackResults.value === undefined) {
                console.warn('⚠️ No hay datos de calorías disponibles');
                resolve(0);
                return;
              }
              console.log('✅ Calorías obtenidas de Apple Health (getActiveEnergyBurned):', fallbackResults.value);
              resolve(fallbackResults.value);
            });
            return;
          }
          // Sumar todas las muestras de calorías
          const totalCalories = results.reduce((total: number, sample: any) => {
            return total + (sample.value || 0);
          }, 0);
          console.log('✅ Calorías obtenidas de Apple Health (getDailyEnergyBurnedSamples):', totalCalories);
          resolve(totalCalories);
        });
      } else {
        AppleHealthKit.getActiveEnergyBurned(options, (err: any, results: any) => {
          if (err) {
            console.error('❌ Error obteniendo calorías de Apple Health:', err);
            resolve(0);
            return;
          }
          if (!results || results.value === undefined) {
            console.warn('⚠️ No hay datos de calorías disponibles');
            resolve(0);
            return;
          }
          console.log('✅ Calorías obtenidas de Apple Health:', results.value);
          console.log('📱 Incluye datos de iPhone, Apple Watch y otras fuentes sincronizadas');
          resolve(results.value);
        });
      }
    });

    // Obtener sueño (en horas)
    const sleep = await new Promise<number>((resolve) => {
      AppleHealthKit.getSleepSamples(options, (err, results) => {
        if (err || !results || results.length === 0) {
          resolve(0);
          return;
        }
        // Sumar todas las sesiones de sueño en horas
        const totalMinutes = results.reduce((total, sample) => {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          return total + (end - start) / (1000 * 60);
        }, 0);
        resolve(totalMinutes / 60);
      });
    });

    // Obtener peso
    const weight = await new Promise<number | undefined>((resolve) => {
      AppleHealthKit.getLatestWeight(options, (err, results) => {
        if (err || !results) {
          resolve(undefined);
          return;
        }
        resolve(results.value);
      });
    });

    // Obtener glucosa
    const glucose = await new Promise<number | undefined>((resolve) => {
      AppleHealthKit.getBloodGlucoseSamples(options, (err, results) => {
        if (err || !results || results.length === 0) {
          resolve(undefined);
          return;
        }
        // Obtener el último valor del día
        resolve(results[results.length - 1].value);
      });
    });

    // Obtener agua (en ml)
    const water = await new Promise<number | undefined>((resolve) => {
      AppleHealthKit.getWater(options, (err, results) => {
        if (err || !results) {
          resolve(undefined);
          return;
        }
        resolve(results.value * 1000); // Convertir litros a ml
      });
    });

    // Obtener calorías consumidas
    const food = await new Promise<number | undefined>((resolve) => {
      AppleHealthKit.getDietaryEnergy(options, (err, results) => {
        if (err || !results) {
          resolve(undefined);
          return;
        }
        resolve(results.value);
      });
    });

    const healthData = {
      steps,
      distance,
      calories,
      sleep,
      weight,
      glucose,
      water,
      food,
    };
    
    console.log('✅ Datos reales obtenidos de Apple Health:', {
      pasos: steps,
      distancia: `${distance.toFixed(2)} km`,
      calorías: calories,
      sueño: `${sleep.toFixed(1)} horas`,
      peso: weight ? `${weight.toFixed(1)} kg` : 'N/A',
    });

    return healthData;
  } catch (error) {
    console.error('❌ Error obteniendo datos de Apple Health:', error);
    // Retornar datos vacíos en lugar de simulados
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      sleep: 0,
    };
  }
}

/**
 * Obtiene datos de Google Fit
 */
async function getGoogleFitData(date: Date): Promise<HealthData> {
  // Si GoogleFit no está disponible, retornar datos vacíos
  if (!GoogleFit) {
    console.log('📱 Google Fit no disponible (probablemente Expo Go). Retornando datos vacíos.');
    console.log('💡 Para usar datos reales, crea un Development Build con: npm run build:dev:android');
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      sleep: 0,
    };
  }

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log('📱 Obteniendo datos de Google Fit...');

    // Obtener pasos (incluye datos de relojes inteligentes sincronizados con Google Fit)
    const stepsData = await GoogleFit.getDailyStepCountSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let steps = 0;
    const sources: string[] = [];
    
    if (stepsData && stepsData.length > 0) {
      // Sumar pasos de TODAS las fuentes (incluyendo relojes inteligentes)
      // Google Fit agrega automáticamente datos de Wear OS, Fitbit, Garmin, etc.
      stepsData.forEach((source: any) => {
        if (source.steps && source.steps.length > 0) {
          const sourceSteps = source.steps.reduce((total: number, step: any) => total + step.value, 0);
          steps += sourceSteps;
          
          // Registrar la fuente para logging
          if (source.source) {
            const sourceName = source.source.includes('wear') ? 'Reloj inteligente (Wear OS)' :
                              source.source.includes('fitbit') ? 'Fitbit' :
                              source.source.includes('garmin') ? 'Garmin' :
                              source.source.includes('samsung') ? 'Samsung Health' :
                              source.source.includes('huawei') ? 'Huawei Health' :
                              source.source.includes('estimated') ? 'Estimación Google Fit' :
                              source.source.includes('merge') ? 'Datos agregados' :
                              source.source;
            sources.push(`${sourceName}: ${sourceSteps} pasos`);
          }
        }
      });
      
      if (steps > 0) {
        console.log('✅ Pasos obtenidos de Google Fit:', steps);
        if (sources.length > 0) {
          console.log('📱 Fuentes de datos:', sources.join(', '));
        }
      } else {
        console.warn('⚠️ No hay datos de pasos disponibles en Google Fit');
      }
    } else {
      console.warn('⚠️ No se encontraron datos de pasos en Google Fit');
    }

    // Obtener distancia (incluye datos de relojes inteligentes)
    const distanceData = await GoogleFit.getDailyDistanceSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let distance = 0;
    if (distanceData && distanceData.length > 0) {
      // Sumar distancia de TODAS las fuentes (incluyendo relojes)
      distance = distanceData.reduce((total: number, sample: any) => {
        return total + (sample.distance || 0);
      }, 0) / 1000; // Convertir metros a km
      console.log('✅ Distancia obtenida de Google Fit:', distance.toFixed(2), 'km');
      console.log('📱 Incluye datos de relojes inteligentes sincronizados con Google Fit');
    } else {
      console.warn('⚠️ No hay datos de distancia disponibles en Google Fit');
    }

    // Obtener calorías (incluye datos de relojes inteligentes)
    const caloriesData = await GoogleFit.getDailyCalorieSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let calories = 0;
    if (caloriesData && caloriesData.length > 0) {
      // Sumar calorías de TODAS las fuentes (incluyendo relojes)
      calories = caloriesData.reduce((total: number, sample: any) => {
        return total + (sample.calorie || 0);
      }, 0);
      console.log('✅ Calorías obtenidas de Google Fit:', calories);
      console.log('📱 Incluye datos de relojes inteligentes sincronizados con Google Fit');
    } else {
      console.warn('⚠️ No hay datos de calorías disponibles en Google Fit');
    }

    // Obtener peso (último valor)
    const weightData = await GoogleFit.getWeightSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let weight: number | undefined;
    if (weightData && weightData.length > 0) {
      weight = weightData[weightData.length - 1].value;
    }

    // Obtener horas de sueño
    const sleepData = await GoogleFit.getSleepSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let sleep = 0;
    if (sleepData && sleepData.length > 0) {
      const totalMinutes = sleepData.reduce((total: number, sample: any) => {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        return total + (end - start) / (1000 * 60);
      }, 0);
      sleep = totalMinutes / 60;
    }

    const healthData = {
      steps,
      distance,
      calories,
      sleep,
      weight,
      glucose: undefined,
      water: undefined,
      food: undefined,
    };
    
    console.log('✅ Datos reales obtenidos de Google Fit:', {
      pasos: steps,
      distancia: `${distance.toFixed(2)} km`,
      calorías: calories,
      sueño: `${sleep.toFixed(1)} horas`,
      peso: weight ? `${weight.toFixed(1)} kg` : 'N/A',
    });

    return healthData;
  } catch (error) {
    console.error('❌ Error obteniendo datos de Google Fit:', error);
    // Retornar datos vacíos en lugar de simulados
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      sleep: 0,
    };
  }
}

/**
 * Genera datos simulados para desarrollo y pruebas
 */
function getSimulatedHealthData(date: Date): HealthData {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    // Datos simulados para hoy (más realistas según la hora del día)
    const hour = now.getHours();
    const progressFactor = hour / 24; // Factor de progreso del día
    
    return {
      steps: Math.floor(10000 * progressFactor + Math.random() * 1000),
      distance: parseFloat((10 * progressFactor + Math.random()).toFixed(1)),
      calories: Math.floor(2000 * progressFactor + Math.random() * 200),
      sleep: hour < 8 ? 0 : 7 + Math.random() * 2,
      heartRate: 65 + Math.floor(Math.random() * 15),
      weight: 75 + Math.random() * 3,
      glucose: 85 + Math.floor(Math.random() * 20),
      water: Math.floor(2000 * progressFactor),
      food: Math.floor(2200 * progressFactor),
    };
  }
  
  // Datos simulados para días pasados
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const variation = Math.sin(daysDiff) * 0.2 + 1; // Variación natural
  
  return {
    steps: Math.floor(8000 * variation + Math.random() * 2000),
    distance: parseFloat((6.5 * variation + Math.random() * 2).toFixed(1)),
    calories: Math.floor(1800 * variation + Math.random() * 400),
    sleep: 6 + Math.random() * 3,
    heartRate: 65 + Math.floor(Math.random() * 15),
    weight: 75 + (Math.random() - 0.5) * 2,
    glucose: 85 + Math.floor(Math.random() * 20),
    water: Math.floor(1500 + Math.random() * 1000),
    food: Math.floor(1800 + Math.random() * 800),
  };
}

/**
 * Guarda datos de salud (para tracking manual)
 */
export async function saveHealthData(
  date: Date,
  data: Partial<HealthData>
): Promise<boolean> {
  try {
    // TODO: Guardar en base de datos (Supabase)
    console.log('💾 Guardando datos de salud:', { date, data });
    return true;
  } catch (error) {
    console.error('Error saving health data:', error);
    return false;
  }
}

/**
 * Verifica si la app tiene permisos de salud
 */
export async function hasHealthPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      if (!AppleHealthKit) {
        return false;
      }
      
      // Verificar permisos específicos
      return new Promise((resolve) => {
        AppleHealthKit.getAuthStatus(
          {
            permissions: {
              read: [
                AppleHealthKit.Constants.Permissions.Steps,
                AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
                AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
              ],
            },
          },
          (err: any, results: any) => {
            if (err) {
              console.error('Error verificando permisos:', err);
              resolve(false);
              return;
            }
            
            // Verificar que al menos uno tenga permiso
            const hasAnyPermission = Object.values(results).some(
              (status: any) => status === AppleHealthKit.Constants.Permissions.Authorized
            );
            resolve(hasAnyPermission);
          }
        );
      });
    } else if (Platform.OS === 'android') {
      if (!GoogleFit) {
        return false;
      }
      
      // Verificar si está autorizado
      const isAuthorized = await GoogleFit.isAuthorized();
      return isAuthorized;
    }
    
    return false;
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return false;
  }
}

/**
 * Fuerza una nueva solicitud de permisos (útil si el usuario los revocó)
 */
export function resetPermissionsCache(): void {
  permissionsRequested = false;
  hasPermissionsCache = null;
  console.log('🔄 Cache de permisos reiniciado');
}

