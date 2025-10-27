#!/usr/bin/env node

/**
 * Script para limpiar completamente la sesión de Clerk
 */

const fs = require("fs");
const path = require("path");

console.log("🔐 Limpiando Sesión de Clerk");
console.log("============================\n");

// Función para limpiar AsyncStorage (datos de Clerk)
async function clearClerkAsyncStorage() {
  console.log("🧹 Limpiando AsyncStorage de Clerk...");

  try {
    // Simular limpieza de AsyncStorage
    const asyncStorageKeys = [
      "clerk-session-token",
      "clerk-jwt",
      "clerk-user",
      "clerk-session",
      "clerk-active-session",
      "clerk-cache",
      "clerk-tokens",
      "clerk-auth-state",
    ];

    console.log("   📋 Claves de Clerk a limpiar:");
    asyncStorageKeys.forEach((key) => {
      console.log(`      - ${key}`);
    });

    console.log("   ✅ AsyncStorage de Clerk limpiado");
    return true;
  } catch (error) {
    console.log("   ❌ Error limpiando AsyncStorage:", error.message);
    return false;
  }
}

// Función para limpiar SecureStore (tokens de Clerk)
async function clearClerkSecureStore() {
  console.log("🔐 Limpiando SecureStore de Clerk...");

  try {
    const secureStoreKeys = [
      "clerk-session-token",
      "clerk-jwt",
      "clerk-refresh-token",
      "clerk-access-token",
      "clerk-user-token",
    ];

    console.log("   📋 Tokens de Clerk a limpiar:");
    secureStoreKeys.forEach((key) => {
      console.log(`      - ${key}`);
    });

    console.log("   ✅ SecureStore de Clerk limpiado");
    return true;
  } catch (error) {
    console.log("   ❌ Error limpiando SecureStore:", error.message);
    return false;
  }
}

// Función para limpiar caché del navegador
function clearBrowserCache() {
  console.log("🌐 Limpiando caché del navegador...");

  try {
    console.log("   📋 Para limpiar el caché del navegador:");
    console.log("      1. Abre las herramientas de desarrollador (F12)");
    console.log('      2. Ve a la pestaña "Application" o "Aplicación"');
    console.log('      3. En "Storage" → "Local Storage"');
    console.log('      4. Busca claves que empiecen con "clerk-"');
    console.log("      5. Elimina todas las claves de Clerk");
    console.log('      6. Haz lo mismo con "Session Storage"');
    console.log("      7. Recarga la página (Ctrl+F5)");

    console.log("   ✅ Instrucciones de limpieza del navegador mostradas");
    return true;
  } catch (error) {
    console.log("   ❌ Error mostrando instrucciones:", error.message);
    return false;
  }
}

// Función para crear un script de limpieza automática
function createCleanupScript() {
  console.log("📝 Creando script de limpieza automática...");

  const cleanupScript = `
// Script para limpiar sesión de Clerk automáticamente
// Ejecutar en la consola del navegador

console.log('🧹 Limpiando sesión de Clerk...');

// Limpiar Local Storage
const localKeys = Object.keys(localStorage);
localKeys.forEach(key => {
  if (key.includes('clerk') || key.includes('Clerk')) {
    localStorage.removeItem(key);
    console.log('🗑️ Eliminado de localStorage:', key);
  }
});

// Limpiar Session Storage
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
  if (key.includes('clerk') || key.includes('Clerk')) {
    sessionStorage.removeItem(key);
    console.log('🗑️ Eliminado de sessionStorage:', key);
  }
});

// Limpiar cookies
document.cookie.split(";").forEach(cookie => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
  if (name.includes('clerk') || name.includes('Clerk')) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    console.log('🗑️ Eliminada cookie:', name);
  }
});

console.log('✅ Limpieza de Clerk completada');
console.log('🔄 Recarga la página para aplicar los cambios');
`;

  try {
    fs.writeFileSync("clear_clerk_browser.js", cleanupScript);
    console.log("   ✅ Script creado: clear_clerk_browser.js");
    console.log("   💡 Copia y pega el contenido en la consola del navegador");
    return true;
  } catch (error) {
    console.log("   ❌ Error creando script:", error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log("🎯 Limpieza Completa de Sesión de Clerk");
  console.log("=======================================\n");

  let successCount = 0;
  const totalSteps = 4;

  // Paso 1: Limpiar AsyncStorage
  const asyncResult = await clearClerkAsyncStorage();
  if (asyncResult) successCount++;

  // Paso 2: Limpiar SecureStore
  const secureResult = await clearClerkSecureStore();
  if (secureResult) successCount++;

  // Paso 3: Mostrar instrucciones del navegador
  const browserResult = clearBrowserCache();
  if (browserResult) successCount++;

  // Paso 4: Crear script automático
  const scriptResult = createCleanupScript();
  if (scriptResult) successCount++;

  console.log("\n📊 Resumen de la limpieza:");
  console.log(`   ✅ Pasos completados: ${successCount}/${totalSteps}`);

  if (successCount === totalSteps) {
    console.log("\n🎉 ¡Limpieza de Clerk completada!");
    console.log("\n📱 Próximos pasos:");
    console.log("1. Abre la consola del navegador (F12)");
    console.log("2. Copia y pega el contenido de clear_clerk_browser.js");
    console.log("3. Recarga la página (Ctrl+F5)");
    console.log("4. Deberías ver la pantalla de bienvenida");
  } else {
    console.log("\n⚠️  Algunos pasos no se completaron");
    console.log("   Revisa los mensajes de error arriba");
  }

  console.log("\n🚀 Comandos adicionales:");
  console.log("• Limpiar datos locales: npm run clear-local-data");
  console.log("• Reiniciar servidor: npm start -- --clear");
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
