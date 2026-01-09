/**
 * RevenueCat Service - Manejo de In-App Purchases
 * Integración con Apple App Store y Google Play Store
 */

import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configuración de RevenueCat
// IMPORTANTE: Reemplazar con tus claves de RevenueCat
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// IDs de productos (deben coincidir con App Store Connect)
export const PRODUCT_IDS = {
  MONTHLY: 'luxor_fitness_monthly', // $12.99/mes
  YEARLY: 'luxor_fitness_yearly',   // $107/año (~$8.92/mes)
};

// Entitlements (lo que desbloquea la suscripción)
export const ENTITLEMENTS = {
  PREMIUM: 'premium',
};

let isConfigured = false;

/**
 * Inicializar RevenueCat SDK
 * Debe llamarse una vez al inicio de la app
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isConfigured) {
    console.log('✅ RevenueCat ya está configurado');
    return;
  }

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  
  if (!apiKey) {
    console.warn('⚠️ RevenueCat API Key no configurada para', Platform.OS);
    return;
  }

  try {
    // Configurar nivel de log en desarrollo
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configurar RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined, // Usar el ID de Clerk si está disponible
    });

    isConfigured = true;
    console.log('✅ RevenueCat configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando RevenueCat:', error);
    throw error;
  }
}

/**
 * Identificar usuario (vincular con Clerk ID)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logIn(userId);
    console.log('✅ Usuario identificado en RevenueCat:', userId);
    return customerInfo.customerInfo;
  } catch (error) {
    console.error('❌ Error identificando usuario:', error);
    throw error;
  }
}

/**
 * Cerrar sesión de RevenueCat
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('✅ Sesión de RevenueCat cerrada');
  } catch (error) {
    console.error('❌ Error cerrando sesión de RevenueCat:', error);
  }
}

/**
 * Obtener ofertas disponibles (productos)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current) {
      console.log('📦 Ofertas disponibles:', offerings.current.identifier);
      return offerings.current;
    }
    
    console.warn('⚠️ No hay ofertas disponibles');
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo ofertas:', error);
    throw error;
  }
}

/**
 * Comprar un paquete (suscripción)
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    console.log('🛒 Iniciando compra:', pkg.identifier);
    
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // Verificar si tiene el entitlement premium
    const isPremium = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM] !== undefined;
    
    if (isPremium) {
      console.log('✅ Compra exitosa - Usuario es Premium');
      
      // Sincronizar con Supabase
      await syncSubscriptionToSupabase(customerInfo);
      
      return { success: true, customerInfo };
    } else {
      console.warn('⚠️ Compra completada pero sin entitlement premium');
      return { success: false, error: 'La compra no activó el acceso premium' };
    }
  } catch (error: any) {
    // Manejar errores específicos
    if (error.userCancelled) {
      console.log('ℹ️ Usuario canceló la compra');
      return { success: false, error: 'cancelled' };
    }
    
    console.error('❌ Error en la compra:', error);
    return { success: false, error: error.message || 'Error al procesar la compra' };
  }
}

/**
 * Restaurar compras anteriores
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    console.log('🔄 Restaurando compras...');
    
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM] !== undefined;
    
    if (isPremium) {
      console.log('✅ Compras restauradas - Usuario es Premium');
      await syncSubscriptionToSupabase(customerInfo);
    } else {
      console.log('ℹ️ No se encontraron compras anteriores activas');
    }
    
    return { success: true, isPremium, customerInfo };
  } catch (error: any) {
    console.error('❌ Error restaurando compras:', error);
    return { success: false, isPremium: false, error: error.message };
  }
}

/**
 * Verificar estado de suscripción
 */
export async function checkSubscriptionStatus(): Promise<{
  isActive: boolean;
  willRenew: boolean;
  expirationDate?: Date;
  productIdentifier?: string;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
    
    if (premiumEntitlement) {
      return {
        isActive: true,
        willRenew: premiumEntitlement.willRenew,
        expirationDate: premiumEntitlement.expirationDate 
          ? new Date(premiumEntitlement.expirationDate) 
          : undefined,
        productIdentifier: premiumEntitlement.productIdentifier,
      };
    }
    
    return { isActive: false, willRenew: false };
  } catch (error) {
    console.error('❌ Error verificando suscripción:', error);
    return { isActive: false, willRenew: false };
  }
}

/**
 * Obtener información del cliente
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('❌ Error obteniendo info del cliente:', error);
    return null;
  }
}

/**
 * Sincronizar estado de suscripción con Supabase
 * Esto permite que el backend también conozca el estado
 */
async function syncSubscriptionToSupabase(customerInfo: CustomerInfo): Promise<void> {
  try {
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
    const userId = customerInfo.originalAppUserId;
    
    if (!userId) {
      console.warn('⚠️ No hay userId para sincronizar');
      return;
    }
    
    const subscriptionData = {
      user_id: userId,
      status: premiumEntitlement ? 'active' : 'canceled',
      current_period_start: premiumEntitlement?.latestPurchaseDate 
        ? new Date(premiumEntitlement.latestPurchaseDate).toISOString()
        : null,
      current_period_end: premiumEntitlement?.expirationDate
        ? new Date(premiumEntitlement.expirationDate).toISOString()
        : null,
      cancel_at_period_end: premiumEntitlement ? !premiumEntitlement.willRenew : true,
      // Campos específicos de RevenueCat (en lugar de Stripe)
      revenuecat_customer_id: customerInfo.originalAppUserId,
      product_identifier: premiumEntitlement?.productIdentifier || null,
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });
    
    if (error) {
      console.error('❌ Error sincronizando con Supabase:', error);
    } else {
      console.log('✅ Suscripción sincronizada con Supabase');
    }
  } catch (error) {
    console.error('❌ Error en syncSubscriptionToSupabase:', error);
  }
}

/**
 * Listener para cambios en el estado del cliente
 */
export function addCustomerInfoListener(
  callback: (customerInfo: CustomerInfo) => void
): () => void {
  try {
    const listener = Purchases.addCustomerInfoUpdateListener(callback);
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  } catch (error) {
    console.warn('⚠️ No se pudo crear listener de RevenueCat (esperado en Expo Go)');
    // Retornar función vacía si falla
    return () => {};
  }
}

/**
 * Obtener URL para gestionar suscripción (App Store/Play Store)
 */
export async function getManagementURL(): Promise<string | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  } catch (error) {
    console.error('❌ Error obteniendo URL de gestión:', error);
    return null;
  }
}



