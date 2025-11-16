#!/usr/bin/env node

/**
 * Script para ejecutar ARREGLAR_VIDEO_HIP_THRUST.sql en Supabase
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Error: Faltan variables de entorno");
  console.error("   Asegúrate de tener EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Leer el archivo SQL
const sqlFile = path.join(__dirname, "ARREGLAR_VIDEO_HIP_THRUST.sql");
const sql = fs.readFileSync(sqlFile, "utf8");

// Dividir el SQL en statements individuales (separados por ;)
// Filtrar comentarios y líneas vacías
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("/*"));

async function executeSQL() {
  try {
    console.log("📋 Configuración detectada:");
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
    console.log("");

    console.log("🔧 Ejecutando script para arreglar video de 'Hip thrust'...");
    console.log("");

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Saltar statements que son solo comentarios o bloques comentados
      if (statement.includes("/*") || statement.length < 10) {
        continue;
      }

      try {
        // Para SELECT statements, usar .rpc o ejecutar directamente
        if (statement.trim().toUpperCase().startsWith("SELECT")) {
          // Para SELECT, necesitamos ejecutarlo de manera diferente
          // Usaremos una función RPC si está disponible, o simplemente lo mostraremos
          console.log(`📊 Ejecutando consulta ${i + 1}/${statements.length}...`);
          // Nota: SELECT statements necesitan ser ejecutados de manera diferente
          // Por ahora, solo ejecutamos UPDATE e INSERT
          continue;
        }

        // Para UPDATE, INSERT, etc., intentar ejecutar directamente
        if (
          statement.trim().toUpperCase().startsWith("UPDATE") ||
          statement.trim().toUpperCase().startsWith("INSERT") ||
          statement.trim().toUpperCase().startsWith("DELETE")
        ) {
          console.log(`⚙️  Ejecutando: ${statement.substring(0, 50)}...`);
          
          // Supabase no permite ejecutar SQL directo desde el cliente
          // Necesitamos usar el SQL Editor o una función RPC
          console.log("⚠️  No se puede ejecutar SQL directo desde el cliente");
          console.log("   Por favor, ejecuta el script manualmente en Supabase SQL Editor");
          break;
        }
      } catch (error) {
        console.error(`❌ Error en statement ${i + 1}:`, error.message);
      }
    }

    console.log("");
    console.log("✅ Script completado");
    console.log("");
    console.log("📝 NOTA: Para ejecutar SELECT statements y ver los resultados,");
    console.log("   por favor ejecuta el script manualmente en Supabase SQL Editor:");
    console.log("   1. Ve a https://supabase.com/dashboard");
    console.log("   2. Selecciona tu proyecto");
    console.log("   3. Ve a SQL Editor");
    console.log("   4. Copia y pega el contenido de ARREGLAR_VIDEO_HIP_THRUST.sql");
    console.log("   5. Haz clic en 'Run' o presiona Ctrl+Enter");
  } catch (error) {
    console.error("❌ Error ejecutando script:", error);
    process.exit(1);
  }
}

// Ejecutar
executeSQL();

