#!/usr/bin/env node

/**
 * Script mejorado para limpiar datos de Supabase
 * Maneja mejor los errores y las diferencias en estructura de tablas
 */

const { createClient } = require("@supabase/supabase-js");
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

// Función para obtener la clave primaria de una tabla
async function getPrimaryKey(tableName) {
  try {
    // Intentar diferentes nombres de clave primaria comunes
    const possibleKeys = ["id", "user_id", "profile_id", "plan_id"];

    for (const key of possibleKeys) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(key)
          .limit(1);

        if (!error && data) {
          return key;
        }
      } catch (e) {
        // Continuar con la siguiente clave
      }
    }

    return "id"; // Fallback por defecto
  } catch (error) {
    return "id";
  }
}

// Función para limpiar una tabla de forma inteligente
async function clearTable(tableName) {
  try {
    console.log(`🧹 Limpiando tabla: ${tableName}`);

    // Obtener todos los registros para contar
    const { data: allData, error: selectError } = await supabase
      .from(tableName)
      .select("*");

    if (selectError) {
      console.log(
        `   ⚠️  No se pudo acceder a ${tableName}: ${selectError.message}`
      );
      return false;
    }

    const recordCount = allData?.length || 0;
    console.log(`   📊 Encontrados ${recordCount} registros en ${tableName}`);

    if (recordCount === 0) {
      console.log(`   ✅ Tabla ${tableName} ya está vacía`);
      return true;
    }

    // Obtener la clave primaria correcta
    const primaryKey = await getPrimaryKey(tableName);
    console.log(`   🔑 Usando clave primaria: ${primaryKey}`);

    // Intentar diferentes métodos de eliminación
    let success = false;

    // Método 1: Eliminar todos los registros uno por uno
    try {
      for (const record of allData) {
        const keyValue = record[primaryKey];
        if (keyValue !== undefined) {
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq(primaryKey, keyValue);

          if (deleteError) {
            console.log(
              `   ⚠️  Error eliminando registro: ${deleteError.message}`
            );
          }
        }
      }
      success = true;
    } catch (error) {
      console.log(`   ⚠️  Método 1 falló: ${error.message}`);
    }

    // Método 2: Intentar eliminación masiva con condición siempre verdadera
    if (!success) {
      try {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq(primaryKey, "impossible-value-that-will-never-exist");

        if (!deleteError) {
          success = true;
        } else {
          console.log(`   ⚠️  Método 2 falló: ${deleteError.message}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Método 2 falló: ${error.message}`);
      }
    }

    // Método 3: Eliminar usando diferentes condiciones
    if (!success) {
      try {
        // Intentar con diferentes condiciones
        const conditions = [
          { gte: { [primaryKey]: "0" } },
          { lte: { [primaryKey]: "999999999" } },
          { is: { [primaryKey]: "not.null" } },
        ];

        for (const condition of conditions) {
          try {
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .match(condition);

            if (!deleteError) {
              success = true;
              break;
            }
          } catch (e) {
            // Continuar con la siguiente condición
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Método 3 falló: ${error.message}`);
      }
    }

    if (success) {
      console.log(`   ✅ Tabla ${tableName} limpiada exitosamente`);
      return true;
    } else {
      console.log(`   ❌ No se pudo limpiar ${tableName} con ningún método`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error inesperado con ${tableName}: ${error.message}`);
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
            remaining === 0
              ? "✅ Vacía"
              : `⚠️  ${remaining} registros restantes`
          }`
        );
      }
    } catch (error) {
      console.log(`   ${table}: ❌ (${error.message})`);
    }
  }

  return totalRemaining;
}

// Función principal
async function main() {
  try {
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

      // Pequeña pausa entre operaciones
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("\n📊 Resumen de la limpieza:");
    console.log(`   ✅ Tablas limpiadas: ${successCount}/${totalTables}`);

    // Verificar estado final
    const totalRemaining = await checkTables();

    console.log("\n📊 Resumen final:");
    if (totalRemaining === 0) {
      console.log("🎉 ¡Limpieza completada exitosamente!");
      console.log("🎉 La base de datos está completamente limpia");
    } else {
      console.log(`⚠️  Quedan ${totalRemaining} registros en total`);
      console.log(
        "   La mayoría de los datos importantes se limpiaron correctamente"
      );
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
