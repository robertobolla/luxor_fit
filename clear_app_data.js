/**
 * Script para limpiar todos los datos de la app FitMind
 *
 * Este script limpia:
 * 1. AsyncStorage (configuración del dashboard, sesiones de Supabase)
 * 2. SecureStore (tokens de autenticación)
 * 3. Cualquier otro dato local
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Limpia todos los datos de AsyncStorage
 */
export async function clearAsyncStorage() {
  try {
    console.log("🧹 Limpiando AsyncStorage...");

    // Obtener todas las claves
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📋 Encontradas ${keys.length} claves en AsyncStorage`);

    // Filtrar claves relacionadas con la app
    const appKeys = keys.filter(
      (key) =>
        key.includes("fitmind") ||
        key.includes("supabase") ||
        key.includes("clerk") ||
        key.includes("dashboard") ||
        key.includes("auth") ||
        key.includes("user")
    );

    console.log(`🎯 Claves de la app a limpiar: ${appKeys.length}`);

    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
      console.log("✅ AsyncStorage limpiado exitosamente");
    } else {
      console.log("ℹ️ No se encontraron datos de la app en AsyncStorage");
    }

    return { success: true, keysRemoved: appKeys.length };
  } catch (error) {
    console.error("❌ Error limpiando AsyncStorage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Limpia todos los datos de SecureStore
 */
export async function clearSecureStore() {
  try {
    console.log("🔐 Limpiando SecureStore...");

    // Lista de claves comunes de autenticación
    const authKeys = [
      "clerk-session-token",
      "clerk-jwt",
      "supabase-auth-token",
      "expo-secure-store-key",
      "auth-token",
      "refresh-token",
    ];

    let removedCount = 0;

    for (const key of authKeys) {
      try {
        const exists = await SecureStore.getItemAsync(key);
        if (exists) {
          await SecureStore.deleteItemAsync(key);
          removedCount++;
          console.log(`🗑️ Eliminado: ${key}`);
        }
      } catch (error) {
        // Ignorar errores de claves que no existen
      }
    }

    console.log(`✅ SecureStore limpiado: ${removedCount} tokens eliminados`);
    return { success: true, tokensRemoved: removedCount };
  } catch (error) {
    console.error("❌ Error limpiando SecureStore:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Limpia todos los datos de la app
 */
export async function clearAllAppData() {
  console.log("🚀 Iniciando limpieza completa de la app FitMind...");

  const results = {
    asyncStorage: await clearAsyncStorage(),
    secureStore: await clearSecureStore(),
  };

  const allSuccess =
    results.asyncStorage.success && results.secureStore.success;

  console.log("\n📊 Resumen de la limpieza:");
  console.log(
    `AsyncStorage: ${results.asyncStorage.success ? "✅" : "❌"} (${
      results.asyncStorage.keysRemoved || 0
    } claves)`
  );
  console.log(
    `SecureStore: ${results.secureStore.success ? "✅" : "❌"} (${
      results.secureStore.tokensRemoved || 0
    } tokens)`
  );

  if (allSuccess) {
    console.log("\n🎉 ¡Limpieza completada exitosamente!");
    console.log("💡 La app ahora está lista para empezar desde cero");
  } else {
    console.log("\n⚠️ Algunos datos no se pudieron limpiar completamente");
  }

  return results;
}

// Función para usar en desarrollo
export async function clearAppDataForTesting() {
  console.log("🧪 Modo de prueba: Limpiando datos de la app...");
  return await clearAllAppData();
}
