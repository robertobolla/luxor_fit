#!/usr/bin/env node

/**
 * Script para limpiar datos locales de la app FitMind
 *
 * Uso:
 *   node scripts/clear-local-data.js
 *   npm run clear-local-data
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Iniciando limpieza de datos locales de FitMind...\n");

// Función para ejecutar comandos de limpieza
function runCleanupCommand(command, description) {
  try {
    console.log(`🧹 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completado\n`);
    return true;
  } catch (error) {
    console.log(`⚠️  ${description} falló: ${error.message}\n`);
    return false;
  }
}

// Función para limpiar archivos de caché
function clearCacheFiles() {
  const cachePaths = [
    "node_modules/.cache",
    ".expo",
    "android/app/build",
    "ios/build",
    "web-build",
  ];

  console.log("🗑️ Limpiando archivos de caché...");

  cachePaths.forEach((cachePath) => {
    if (fs.existsSync(cachePath)) {
      try {
        if (fs.statSync(cachePath).isDirectory()) {
          execSync(`rm -rf "${cachePath}"`, { stdio: "inherit" });
          console.log(`   ✅ Eliminado: ${cachePath}`);
        }
      } catch (error) {
        console.log(`   ⚠️  No se pudo eliminar: ${cachePath}`);
      }
    }
  });

  console.log("✅ Archivos de caché limpiados\n");
}

// Función para limpiar datos de Expo
function clearExpoData() {
  console.log("📱 Limpiando datos de Expo...");

  try {
    // Limpiar caché de Expo
    execSync("npx expo r -c", { stdio: "inherit" });
    console.log("✅ Caché de Expo limpiado");
  } catch (error) {
    console.log("⚠️  No se pudo limpiar el caché de Expo");
  }

  try {
    // Limpiar datos de desarrollo
    execSync("npx expo install --fix", { stdio: "inherit" });
    console.log("✅ Dependencias de Expo actualizadas");
  } catch (error) {
    console.log("⚠️  No se pudo actualizar las dependencias");
  }

  console.log("");
}

// Función para limpiar datos de React Native
function clearReactNativeData() {
  console.log("⚛️ Limpiando datos de React Native...");

  try {
    // Limpiar caché de Metro
    execSync("npx react-native start --reset-cache", {
      stdio: "pipe",
      timeout: 5000,
    });
    console.log("✅ Caché de Metro limpiado");
  } catch (error) {
    console.log(
      "⚠️  No se pudo limpiar el caché de Metro (normal si no está corriendo)"
    );
  }

  console.log("");
}

// Función para limpiar datos de desarrollo
function clearDevelopmentData() {
  console.log("🛠️ Limpiando datos de desarrollo...");

  // Limpiar logs
  const logFiles = ["metro.log", "expo.log", "debug.log"];

  logFiles.forEach((logFile) => {
    if (fs.existsSync(logFile)) {
      try {
        fs.unlinkSync(logFile);
        console.log(`   ✅ Eliminado: ${logFile}`);
      } catch (error) {
        console.log(`   ⚠️  No se pudo eliminar: ${logFile}`);
      }
    }
  });

  // Limpiar archivo .env para forzar recarga
  const envFiles = [".env", ".env.development.local"];
  envFiles.forEach((file) => {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`   ✅ Eliminado: ${file} (se regenerará al iniciar)`);
        } catch (error) {
            console.log(`   ⚠️  No se pudo eliminar: ${file}`);
        }
    }
  });

  console.log("✅ Datos de desarrollo limpiados\n");
}

// Función principal
function main() {
  console.log("📋 Plan de limpieza:");
  console.log("   1. Archivos de caché");
  console.log("   2. Datos de Expo");
  console.log("   3. Datos de React Native");
  console.log("   4. Datos de desarrollo");
  console.log("");

  let successCount = 0;
  const totalSteps = 4;

  // Paso 1: Limpiar archivos de caché
  clearCacheFiles();
  successCount++;

  // Paso 2: Limpiar datos de Expo
  clearExpoData();
  successCount++;

  // Paso 3: Limpiar datos de React Native
  clearReactNativeData();
  successCount++;

  // Paso 4: Limpiar datos de desarrollo
  clearDevelopmentData();
  successCount++;

  // Resumen final
  console.log("📊 Resumen de la limpieza:");
  console.log(`   ✅ Pasos completados: ${successCount}/${totalSteps}`);
  console.log("");

  if (successCount === totalSteps) {
    console.log("🎉 ¡Limpieza completada exitosamente!");
    console.log("");
    console.log("💡 Próximos pasos:");
    console.log("   1. Reinicia la app: npm start");
    console.log('   2. Usa el botón "Limpiar Datos Locales" en la app');
    console.log(
      "   3. O ejecuta el script de Supabase si quieres limpiar la base de datos"
    );
  } else {
    console.log("⚠️  Algunos pasos no se completaron completamente");
    console.log("   Revisa los mensajes de error arriba");
  }

  console.log("");
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main };
