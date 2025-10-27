#!/usr/bin/env node

/**
 * Script de diagnóstico para identificar problemas comunes en la app
 */

require("dotenv").config();

console.log("🔍 Diagnóstico de la App FitMind");
console.log("================================\n");

// 1. Verificar variables de entorno
console.log("📋 Variables de Entorno:");
const requiredVars = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
];

let envIssues = 0;
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ❌ ${varName}: NO CONFIGURADA`);
    envIssues++;
  } else {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
  }
});

if (envIssues > 0) {
  console.log(`\n⚠️  ${envIssues} variables de entorno faltantes`);
} else {
  console.log("\n✅ Todas las variables de entorno están configuradas");
}

// 2. Verificar archivos críticos
console.log("\n📁 Archivos Críticos:");
const criticalFiles = [
  "src/services/supabase.ts",
  "src/clerk.tsx",
  "app/_layout.tsx",
  "app/index.tsx",
  "babel.config.js",
  "tsconfig.json",
];

const fs = require("fs");
let fileIssues = 0;

criticalFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}: Existe`);
  } else {
    console.log(`   ❌ ${file}: NO ENCONTRADO`);
    fileIssues++;
  }
});

if (fileIssues > 0) {
  console.log(`\n⚠️  ${fileIssues} archivos críticos faltantes`);
} else {
  console.log("\n✅ Todos los archivos críticos están presentes");
}

// 3. Verificar dependencias
console.log("\n📦 Dependencias:");
const requiredDeps = [
  "@supabase/supabase-js",
  "@clerk/clerk-expo",
  "@react-native-async-storage/async-storage",
  "expo-router",
  "babel-plugin-module-resolver",
];

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
let depIssues = 0;

requiredDeps.forEach((dep) => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`   ✅ ${dep}: Instalada`);
  } else {
    console.log(`   ❌ ${dep}: NO INSTALADA`);
    depIssues++;
  }
});

if (depIssues > 0) {
  console.log(`\n⚠️  ${depIssues} dependencias faltantes`);
} else {
  console.log("\n✅ Todas las dependencias están instaladas");
}

// 4. Verificar configuración de Babel
console.log("\n⚙️  Configuración de Babel:");
try {
  const babelConfig = require("./babel.config.js");
  if (
    babelConfig.plugins &&
    babelConfig.plugins.some(
      (plugin) => Array.isArray(plugin) && plugin[0] === "module-resolver"
    )
  ) {
    console.log("   ✅ module-resolver configurado en Babel");
  } else {
    console.log("   ❌ module-resolver NO configurado en Babel");
  }
} catch (error) {
  console.log("   ❌ Error leyendo babel.config.js:", error.message);
}

// 5. Verificar configuración de TypeScript
console.log("\n📝 Configuración de TypeScript:");
try {
  const tsConfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));
  if (
    tsConfig.compilerOptions &&
    tsConfig.compilerOptions.paths &&
    tsConfig.compilerOptions.paths["@/*"]
  ) {
    console.log("   ✅ Alias @/* configurado en TypeScript");
  } else {
    console.log("   ❌ Alias @/* NO configurado en TypeScript");
  }
} catch (error) {
  console.log("   ❌ Error leyendo tsconfig.json:", error.message);
}

// 6. Resumen y recomendaciones
console.log("\n🎯 Resumen y Recomendaciones:");
console.log("==============================");

if (envIssues === 0 && fileIssues === 0 && depIssues === 0) {
  console.log("✅ La app debería funcionar correctamente");
  console.log("💡 Si sigues viendo errores, revisa:");
  console.log("   - Los logs del servidor de Expo");
  console.log("   - La consola del navegador/dispositivo");
  console.log("   - Los errores de red en las herramientas de desarrollador");
} else {
  console.log("⚠️  Se encontraron problemas que pueden causar errores:");

  if (envIssues > 0) {
    console.log(`   - Configura ${envIssues} variables de entorno faltantes`);
  }

  if (fileIssues > 0) {
    console.log(`   - Restaura ${fileIssues} archivos críticos faltantes`);
  }

  if (depIssues > 0) {
    console.log(
      `   - Instala ${depIssues} dependencias faltantes: npm install`
    );
  }
}

console.log("\n🚀 Para reiniciar la app:");
console.log("   npm start -- --clear");
console.log("\n📱 Para limpiar datos:");
console.log("   npm run clear-local-data");
console.log("   node clear_supabase_fixed.js");
