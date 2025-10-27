#!/usr/bin/env node

/**
 * Script para limpiar datos de Supabase usando SQL directo
 * Usa el archivo DELETE_ALL_DATA.sql que ya tienes
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Error: Variables de Supabase no encontradas");
  process.exit(1);
}

console.log("🚀 Iniciando limpieza de datos de Supabase...");
console.log(
  "⚠️  ADVERTENCIA: Esto borrará TODOS los datos de la base de datos"
);
console.log("");

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SQL para limpiar todas las tablas
const clearSQL = `
-- Desactivar temporalmente las políticas de seguridad
SET session_replication_role = replica;

-- Borrar fotos del Storage
DELETE FROM storage.objects WHERE bucket_id = 'progress-photos';

-- Borrar todas las tablas en orden (de hijas a padres)
TRUNCATE TABLE public.lesson_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.body_metrics RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.hydration_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.meal_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.nutrition_targets RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.meal_plans RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.nutrition_profiles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workout_completions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.progress_photos RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workout_plans RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.user_profiles RESTART IDENTITY CASCADE;

-- Reactivar las políticas de seguridad
SET session_replication_role = DEFAULT;
`;

// SQL para verificar que todo se borró
const verifySQL = `
SELECT 
  'progress_photos' as tabla, 
  COUNT(*) as total_registros 
FROM public.progress_photos
UNION ALL
SELECT 'workout_plans', COUNT(*) FROM public.workout_plans
UNION ALL
SELECT 'meal_logs', COUNT(*) FROM public.meal_logs
UNION ALL
SELECT 'meal_plans', COUNT(*) FROM public.meal_plans
UNION ALL
SELECT 'nutrition_targets', COUNT(*) FROM public.nutrition_targets
UNION ALL
SELECT 'nutrition_profiles', COUNT(*) FROM public.nutrition_profiles
UNION ALL
SELECT 'hydration_logs', COUNT(*) FROM public.hydration_logs
UNION ALL
SELECT 'body_metrics', COUNT(*) FROM public.body_metrics
UNION ALL
SELECT 'lesson_progress', COUNT(*) FROM public.lesson_progress
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM public.user_profiles;
`;

async function main() {
  try {
    console.log("📋 Configuración detectada:");
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
    console.log("");

    console.log("🧹 Ejecutando limpieza de datos...");

    // Ejecutar el SQL de limpieza
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: clearSQL,
    });

    if (error) {
      console.log("⚠️  No se pudo ejecutar el SQL de limpieza directamente");
      console.log("   Intentando método alternativo...");

      // Método alternativo: limpiar tabla por tabla
      const tables = [
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

      for (const table of tables) {
        try {
          console.log(`🧹 Limpiando tabla: ${table}`);

          // Obtener todos los registros primero
          const { data: records, error: selectError } = await supabase
            .from(table)
            .select("*");

          if (selectError) {
            console.log(
              `   ⚠️  No se pudo acceder a ${table}: ${selectError.message}`
            );
            continue;
          }

          if (!records || records.length === 0) {
            console.log(`   ✅ Tabla ${table} ya está vacía`);
            continue;
          }

          console.log(`   📊 Encontrados ${records.length} registros`);

          // Borrar todos los registros uno por uno
          for (const record of records) {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq("id", record.id);

            if (deleteError) {
              console.log(
                `   ⚠️  Error eliminando registro: ${deleteError.message}`
              );
            }
          }

          console.log(`   ✅ Tabla ${table} limpiada`);
        } catch (error) {
          console.log(`   ⚠️  Error con tabla ${table}: ${error.message}`);
        }
      }
    } else {
      console.log("✅ SQL de limpieza ejecutado exitosamente");
    }

    console.log("\n📊 Verificando estado final...");

    // Verificar estado de las tablas
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

    let totalRemaining = 0;

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.log(`   ${table}: ❌ (${error.message})`);
        } else {
          const remaining = count || 0;
          totalRemaining += remaining;
          console.log(
            `   ${table}: ${
              remaining === 0 ? "✅ Vacía" : `⚠️  ${remaining} registros`
            }`
          );
        }
      } catch (error) {
        console.log(`   ${table}: ❌ (${error.message})`);
      }
    }

    console.log("\n📊 Resumen final:");
    if (totalRemaining === 0) {
      console.log("🎉 ¡Limpieza completada exitosamente!");
      console.log("🎉 La base de datos está completamente limpia");
    } else {
      console.log(`⚠️  Quedan ${totalRemaining} registros en total`);
      console.log("   Algunos datos no se pudieron eliminar completamente");
    }

    console.log("\n📱 Próximos pasos:");
    console.log("   1. La app ya está corriendo y limpia");
    console.log("   2. Abre la app en tu dispositivo");
    console.log("   3. Verás el onboarding desde el principio");
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
