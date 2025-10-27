#!/usr/bin/env node

/**
 * Script para limpiar datos de Supabase usando la API REST
 * No requiere psql, solo Node.js
 */

const https = require("https");
const fs = require("fs");

// Cargar variables de entorno
require("dotenv").config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Error: Variables de Supabase no encontradas");
  console.error("   Necesitas configurar:");
  console.error("   - EXPO_PUBLIC_SUPABASE_URL");
  console.error("   - EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

console.log("🚀 Iniciando limpieza de datos de Supabase...");
console.log(
  "⚠️  ADVERTENCIA: Esto borrará TODOS los datos de la base de datos"
);
console.log("");

// Función para hacer peticiones a la API de Supabase
function makeRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Función para limpiar una tabla
async function clearTable(tableName) {
  try {
    console.log(`🧹 Limpiando tabla: ${tableName}`);
    await makeRequest(`/rest/v1/${tableName}`, "DELETE");
    console.log(`✅ Tabla ${tableName} limpiada`);
    return true;
  } catch (error) {
    console.log(`⚠️  No se pudo limpiar ${tableName}: ${error.message}`);
    return false;
  }
}

// Función para verificar el estado de las tablas
async function checkTables() {
  const tables = [
    "user_profiles",
    "workout_plans",
    "workout_completions",
    "meal_logs",
    "meal_plans",
    "nutrition_targets",
    "nutrition_profiles",
    "hydration_logs",
    "body_metrics",
    "lesson_progress",
    "progress_photos",
  ];

  console.log("\n📊 Verificando estado de las tablas:");

  for (const table of tables) {
    try {
      const result = await makeRequest(`/rest/v1/${table}?select=count`);
      console.log(`   ${table}: ${result.body ? "✅" : "❌"}`);
    } catch (error) {
      console.log(`   ${table}: ❌ (${error.message})`);
    }
  }
}

// Función principal
async function main() {
  console.log("📋 Configuración detectada:");
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log("");

  // Lista de tablas a limpiar (en orden correcto para evitar problemas de foreign key)
  const tablesToClear = [
    "lesson_progress",
    "body_metrics",
    "hydration_logs",
    "meal_logs",
    "nutrition_targets",
    "meal_plans",
    "nutrition_profiles",
    "workout_completions",
    "progress_photos",
    "workout_plans",
    "user_profiles",
  ];

  console.log("🧹 Iniciando limpieza de tablas...");

  let successCount = 0;
  const totalTables = tablesToClear.length;

  for (const table of tablesToClear) {
    const success = await clearTable(table);
    if (success) successCount++;
  }

  console.log("\n📊 Resumen de la limpieza:");
  console.log(`   ✅ Tablas limpiadas: ${successCount}/${totalTables}`);

  if (successCount === totalTables) {
    console.log("\n🎉 ¡Limpieza completada exitosamente!");
    console.log("🎉 La base de datos está completamente limpia");
    console.log("");
    console.log("📱 Próximos pasos:");
    console.log("   1. La app ya está corriendo y limpia");
    console.log("   2. Abre la app en tu dispositivo");
    console.log("   3. Verás el onboarding desde el principio");
  } else {
    console.log("\n⚠️  Algunas tablas no se pudieron limpiar completamente");
    console.log("   Revisa los mensajes de error arriba");
  }

  // Verificar estado final
  await checkTables();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
