#!/usr/bin/env node

/**
 * Script para monitorear errores comunes en la app FitMind
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Monitor de Errores - App FitMind");
console.log("===================================\n");

// Función para verificar errores comunes
function checkCommonErrors() {
  const errors = [];

  // 1. Verificar importaciones con @/
  console.log("📋 Verificando importaciones con @/...");

  const filesToCheck = [
    "app/(tabs)/progress-photos.tsx",
    "app/(tabs)/progress.tsx",
  ];

  filesToCheck.forEach((file) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const importLines = content
        .split("\n")
        .filter((line) => line.includes("import") && line.includes("@/"));

      if (importLines.length > 0) {
        console.log(`   📁 ${file}:`);
        importLines.forEach((line) => {
          console.log(`      ${line.trim()}`);
        });
      }
    }
  });

  // 2. Verificar problemas de Supabase
  console.log("\n🗄️ Verificando configuración de Supabase...");

  const supabaseFile = "src/services/supabase.ts";
  if (fs.existsSync(supabaseFile)) {
    const content = fs.readFileSync(supabaseFile, "utf8");

    if (content.includes("process.env.EXPO_PUBLIC_SUPABASE_URL!")) {
      console.log("   ✅ Variables de entorno configuradas correctamente");
    } else {
      console.log("   ❌ Variables de entorno no configuradas");
      errors.push("Variables de Supabase no configuradas");
    }
  }

  // 3. Verificar problemas de Clerk
  console.log("\n🔐 Verificando configuración de Clerk...");

  const clerkFile = "src/clerk.tsx";
  if (fs.existsSync(clerkFile)) {
    const content = fs.readFileSync(clerkFile, "utf8");

    if (content.includes("process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY")) {
      console.log("   ✅ Clave de Clerk configurada");
    } else {
      console.log("   ❌ Clave de Clerk no configurada");
      errors.push("Clave de Clerk no configurada");
    }
  }

  // 4. Verificar problemas de navegación
  console.log("\n🧭 Verificando navegación...");

  const indexFile = "app/index.tsx";
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, "utf8");

    if (content.includes("router.replace")) {
      console.log("   ✅ Navegación configurada");
    } else {
      console.log("   ❌ Problemas de navegación");
      errors.push("Problemas de navegación");
    }
  }

  return errors;
}

// Función para mostrar errores comunes y sus soluciones
function showCommonSolutions() {
  console.log("\n🛠️  Soluciones para Errores Comunes:");
  console.log("====================================\n");

  console.log('❌ Error: "Cannot resolve module @/..."');
  console.log("   Solución: Reinicia el servidor con: npm start -- --clear");
  console.log(
    "   Verifica que babel.config.js tenga module-resolver configurado\n"
  );

  console.log('❌ Error: "Supabase connection failed"');
  console.log("   Solución: Verifica las variables en .env");
  console.log("   Ejecuta: node debug_app.js\n");

  console.log('❌ Error: "Clerk authentication failed"');
  console.log(
    "   Solución: Verifica EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en .env\n"
  );

  console.log('❌ Error: "Navigation failed"');
  console.log("   Solución: Verifica que las rutas existan en app/\n");

  console.log('❌ Error: "AsyncStorage not working"');
  console.log("   Solución: Limpia datos locales: npm run clear-local-data\n");

  console.log('❌ Error: "Database connection failed"');
  console.log(
    "   Solución: Verifica conexión a Supabase y ejecuta: node clear_supabase_fixed.js\n"
  );
}

// Función para verificar logs en tiempo real
function monitorLogs() {
  console.log("\n📊 Monitoreo de Logs:");
  console.log("======================\n");

  console.log("Para monitorear errores en tiempo real:");
  console.log("1. Abre la consola del navegador (F12)");
  console.log('2. Ve a la pestaña "Console"');
  console.log("3. Busca errores en rojo");
  console.log('4. Filtra por "Error" o "Failed"\n');

  console.log("Errores comunes a buscar:");
  console.log('• "Cannot resolve module"');
  console.log('• "Supabase Error"');
  console.log('• "Clerk Error"');
  console.log('• "Navigation failed"');
  console.log('• "AsyncStorage Error"');
  console.log('• "Network Error"');
}

// Ejecutar diagnóstico
const errors = checkCommonErrors();

if (errors.length === 0) {
  console.log("\n✅ No se encontraron errores obvios en la configuración");
} else {
  console.log(`\n⚠️  Se encontraron ${errors.length} problemas potenciales:`);
  errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error}`);
  });
}

showCommonSolutions();
monitorLogs();

console.log("\n🚀 Comandos útiles:");
console.log("===================");
console.log("• Reiniciar app: npm start -- --clear");
console.log("• Limpiar datos: npm run clear-local-data");
console.log("• Limpiar BD: node clear_supabase_fixed.js");
console.log("• Diagnóstico: node debug_app.js");
console.log("• Monitorear: node monitor_errors.js");
