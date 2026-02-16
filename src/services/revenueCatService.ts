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
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configuración de RevenueCat
// IMPORTANTE: Reemplazar con tus claves de RevenueCat
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// IDs de productos (deben coincidir con App Store Connect y RevenueCat)
export const PRODUCT_IDS = {
  MONTHLY: 'luxor_monthly',              // $12.99/mes
  YEARLY: 'luxor_yearly',                // $107/año (~$8.92/mes)
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

  // Detectar si estamos en Expo Go (no tiene acceso a tiendas nativas)
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo) {
    // En Expo Go, RevenueCat no funciona, silenciar el intento
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
  } catch (error: any) {
    // Si el error es porque la tienda nativa no está disponible (Expo Go, etc.),
    // manejar silenciosamente ya que esto es esperado
    if (error?.message?.includes('native store is not available') ||
      error?.message?.includes('Expo Go')) {
      // Silenciar este error específico
      return;
    }
    console.warn('⚠️ Error configurando RevenueCat (puede no estar disponible):', error?.message || error);
    // No lanzar el error, dejar que el código continúe sin RevenueCat
  }
}

/**
 * Identificar usuario (vincular con Clerk ID)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo | null> {
  // Si RevenueCat no está configurado (ej: Expo Go), retornar null silenciosamente
  if (!isConfigured) {
    return null;
  }

  try {
    const customerInfo = await Purchases.logIn(userId);
    console.log('✅ Usuario identificado en RevenueCat:', userId);
    return customerInfo.customerInfo;
  } catch (error: any) {
    // Si el error es porque no está configurado, retornar null silenciosamente
    if (error?.message?.includes('singleton instance') ||
      error?.message?.includes('configure Purchases')) {
      return null;
    }
    console.warn('⚠️ Error identificando usuario en RevenueCat:', error?.message || error);
    return null;
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
  // Si RevenueCat no está configurado, retornar null con error descriptivo
  if (!isConfigured) {
    console.warn('⚠️ RevenueCat no está configurado (Browser/Expo Go), retornando ofertas vacías');
    return null; // Don't throw, just return null to avoid crashing UI
  }

  try {
    console.log('📦 Obteniendo ofertas de RevenueCat...');
    const offerings = await Purchases.getOfferings();

    console.log('📦 Offerings recibidas:', JSON.stringify({
      current: offerings.current?.identifier,
      all: Object.keys(offerings.all || {}),
      currentPackages: offerings.current?.availablePackages?.length || 0,
    }));

    if (offerings.current && offerings.current.availablePackages.length > 0) {
      console.log('📦 Ofertas disponibles:', offerings.current.identifier);
      console.log('📦 Paquetes:', offerings.current.availablePackages.map(p => p.identifier));
      return offerings.current;
    }

    // Intentar obtener la primera offering si current no existe
    const allOfferingKeys = Object.keys(offerings.all || {});
    if (allOfferingKeys.length > 0) {
      const firstOffering = offerings.all[allOfferingKeys[0]];
      if (firstOffering.availablePackages.length > 0) {
        console.log('📦 Usando offering alternativa:', firstOffering.identifier);
        return firstOffering;
      }
    }

    console.warn('⚠️ No hay ofertas disponibles en RevenueCat');
    console.warn('⚠️ Verifica que hayas configurado offerings y productos en RevenueCat Dashboard');
    return null;
  } catch (error: any) {
    console.error('❌ Error obteniendo ofertas:', error);
    console.error('❌ Detalles:', error.message, error.code);
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
  // Verificar que RevenueCat esté configurado
  if (!isConfigured) {
    console.error('❌ RevenueCat no está configurado');
    return { success: false, error: 'Servicio de suscripciones no disponible' };
  }

  try {
    console.log('🛒 Iniciando compra:', pkg.identifier);
    console.log('🛒 Producto:', pkg.product.identifier, pkg.product.priceString);

    const { customerInfo } = await Purchases.purchasePackage(pkg);

    console.log('🛒 Compra procesada, verificando entitlements...');
    console.log('🛒 Entitlements activos:', Object.keys(customerInfo.entitlements.active || {}));

    // Verificar si tiene el entitlement premium
    const isPremium = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM] !== undefined;

    if (isPremium) {
      console.log('✅ Compra exitosa - Usuario es Premium');

      // Sincronizar con Supabase
      await syncSubscriptionToSupabase(customerInfo);

      return { success: true, customerInfo };
    } else {
      console.warn('⚠️ Compra completada pero sin entitlement premium');
      console.warn('⚠️ Verifica que el producto esté vinculado al entitlement "premium" en RevenueCat');
      // Aún así considerar exitoso si la compra se procesó
      return { success: true, customerInfo };
    }
  } catch (error: any) {
    // Manejar errores específicos
    if (error.userCancelled) {
      console.log('ℹ️ Usuario canceló la compra');
      return { success: false, error: 'cancelled' };
    }

    // Errores de red o servidor
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return { success: false, error: 'Error de conexión. Verifica tu internet.' };
    }

    // Error de configuración
    if (error.message?.includes('configured') || error.message?.includes('singleton')) {
      return { success: false, error: 'Servicio de suscripciones no disponible' };
    }

    console.error('❌ Error en la compra:', error);
    console.error('❌ Código:', error.code, 'Mensaje:', error.message);
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
  // Si RevenueCat no está configurado (ej: Expo Go), retornar estado inactivo
  if (!isConfigured) {
    return { isActive: false, willRenew: false };
  }

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
  } catch (error: any) {
    // Si el error es porque no está configurado, retornar estado inactivo
    if (error?.message?.includes('singleton instance') ||
      error?.message?.includes('configure Purchases')) {
      return { isActive: false, willRenew: false };
    }
    console.warn('⚠️ Error verificando suscripción en RevenueCat:', error?.message || error);
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
 * NOTA: No sobrescribe suscripciones promocionales activas
 */
async function syncSubscriptionToSupabase(customerInfo: CustomerInfo): Promise<void> {
  try {
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
    const userId = customerInfo.originalAppUserId;

    if (!userId) {
      console.warn('⚠️ No hay userId para sincronizar');
      return;
    }

    // Verificar si ya tiene una suscripción promocional activa
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status, is_promo_subscription, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    // No sobrescribir suscripciones promocionales activas que no han expirado
    const subData = existingSub as { id?: string; status?: string; is_promo_subscription?: boolean; current_period_end?: string } | null;
    if (subData?.is_promo_subscription && subData?.status === 'active') {
      const periodEnd = subData.current_period_end ? new Date(subData.current_period_end) : null;
      if (periodEnd && periodEnd > new Date()) {
        console.log('ℹ️ Usuario tiene suscripción promocional activa, no se sobrescribirá');
        return;
      }
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
      platform: 'ios' as const, // O 'android' según Platform.OS
      is_promo_subscription: false, // Las compras de RevenueCat no son promocionales
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
    // El listener de RevenueCat devuelve void directamente
    // La función de cleanup se maneja internamente
    Purchases.addCustomerInfoUpdateListener(callback);
    // Retornar función vacía ya que RevenueCat maneja el cleanup internamente
    return () => {
      // No hay forma directa de remover el listener en la API actual
      console.log('🔄 Listener de RevenueCat desregistrado');
    };
  } catch (error) {
    console.warn('⚠️ No se pudo crear listener de RevenueCat (esperado en Expo Go)');
    // Retornar función vacía si falla
    return () => { };
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



