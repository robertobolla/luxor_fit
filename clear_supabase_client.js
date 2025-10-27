#!/usr/bin/env node

/**
 * Script para limpiar datos de Supabase usando el cliente oficial
 * Más seguro y eficiente que la API REST
 */

const { createClient } = require("@supabase/supabase-js");
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

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función para limpiar una tabla
async function clearTable(tableName) {
  try {
    console.log(`🧹 Limpiando tabla: ${tableName}`);

    // Primero obtener todos los registros para contar
    const { data: allData, error: selectError } = await supabase
      .from(tableName)
      .select("*", { count: "exact" });

    if (selectError) {
      console.log(
        `⚠️  No se pudo acceder a ${tableName}: ${selectError.message}`
      );
      return false;
    }

    const recordCount = allData?.length || 0;
    console.log(`   📊 Encontrados ${recordCount} registros en ${tableName}`);

    if (recordCount === 0) {
      console.log(`   ✅ Tabla ${tableName} ya está vacía`);
      return true;
    }

    // Borrar todos los registros usando una condición que siempre sea verdadera
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq("id", "impossible-id-that-will-never-exist");

    if (deleteError) {
      console.log(
        `⚠️  No se pudo limpiar ${tableName}: ${deleteError.message}`
      );
      return false;
    }

    console.log(
      `✅ Tabla ${tableName} limpiada (${recordCount} registros eliminados)`
    );
    return true;
  } catch (error) {
    console.log(`⚠️  Error limpiando ${tableName}: ${error.message}`);
    return false;
  }
}

// Función para verificar el estado de las tablas
async function checkTables() {
  const tables = [
    "user_profiles",
    "workout_plans",
    "meal_logs",
    "meal_plans",
    "nutrition_targets",
    "nutrition_profiles",
    "hydration_logs",
    "body_metrics",
    "lesson_progress",
    "progress_photos",
  ];

  console.log("\n📊 Verificando estado final de las tablas:");

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`   ${table}: ❌ (${error.message})`);
      } else {
        console.log(
          `   ${table}: ${
            count === 0 ? "✅ Vacía" : `⚠️  ${count} registros restantes`
          }`
        );
      }
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

    // Pequeña pausa entre operaciones para evitar rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n📊 Resumen de la limpieza:");
  console.log(`   ✅ Tablas limpiadas: ${successCount}/${totalTables}`);

  if (successCount === totalTables) {
    console.log("\n🎉 ¡Limpieza completada exitosamente!");
    console.log("🎉 La base de datos está completamente limpia");
  } else {
    console.log("\n⚠️  Algunas tablas no se pudieron limpiar completamente");
    console.log("   Revisa los mensajes de error arriba");
  }

  // Verificar estado final
  await checkTables();

  console.log("\n📱 Próximos pasos:");
  console.log("   1. La app ya está corriendo y limpia");
  console.log("   2. Abre la app en tu dispositivo");
  console.log("   3. Verás el onboarding desde el principio");
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
