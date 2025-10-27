#!/usr/bin/env node

/**
 * Script para probar el flujo de autenticación
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔍 Probando Flujo de Autenticación");
console.log("==================================\n");

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthFlow() {
  try {
    console.log("📋 Configuración:");
    console.log(`   Supabase URL: ${SUPABASE_URL}`);
    console.log(`   Supabase Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
    console.log("");

    // 1. Verificar conexión a Supabase
    console.log("🗄️ Verificando conexión a Supabase...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("user_profiles")
      .select("count", { count: "exact", head: true });

    if (connectionError) {
      console.log("   ❌ Error de conexión:", connectionError.message);
      return;
    } else {
      console.log("   ✅ Conexión a Supabase exitosa");
    }

    // 2. Verificar estado de la tabla user_profiles
    console.log("\n📊 Estado de la tabla user_profiles:");
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*");

    if (profilesError) {
      console.log("   ❌ Error al consultar perfiles:", profilesError.message);
    } else {
      console.log(`   📈 Total de perfiles: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        console.log("   👥 Perfiles encontrados:");
        profiles.forEach((profile, index) => {
          console.log(
            `      ${index + 1}. ID: ${profile.user_id}, Nombre: ${
              profile.name || "Sin nombre"
            }`
          );
        });
      } else {
        console.log("   ℹ️  No hay perfiles en la base de datos");
      }
    }

    // 3. Simular verificación de perfil (como lo hace la app)
    console.log("\n🔍 Simulando verificación de perfil...");
    const testUserId = "test-user-id";

    const { data: testProfile, error: testError } = await supabase
      .from("user_profiles")
      .select("id, name, fitness_level")
      .eq("user_id", testUserId)
      .maybeSingle();

    if (testError) {
      console.log("   ❌ Error en verificación de prueba:", testError.message);
    } else {
      console.log("   📊 Resultado de verificación:", testProfile);

      const hasProfile =
        !!testProfile && !!testProfile.name && !!testProfile.fitness_level;
      console.log(`   ✅ Usuario tendría perfil completo: ${hasProfile}`);

      if (hasProfile) {
        console.log("   🏠 → Redirigiría a /(tabs)/home");
      } else {
        console.log("   📝 → Redirigiría a /onboarding");
      }
    }

    console.log("\n🎯 Resumen del Flujo:");
    console.log("=====================");
    console.log("1. Usuario abre la app");
    console.log(
      "2. Si NO está autenticado → Pantalla de bienvenida con botones de login/registro"
    );
    console.log("3. Si SÍ está autenticado → Verificar perfil en Supabase");
    console.log("4. Si tiene perfil completo → Ir a /(tabs)/home");
    console.log("5. Si NO tiene perfil completo → Ir a /onboarding");

    console.log("\n💡 Para probar el flujo:");
    console.log("1. Abre la app en el navegador/dispositivo");
    console.log("2. Deberías ver la pantalla de bienvenida");
    console.log('3. Haz clic en "Iniciar Sesión"');
    console.log("4. Después del login, debería verificar tu perfil");
    console.log("5. Como no tienes perfil, debería ir al onboarding");
  } catch (error) {
    console.error("❌ Error durante la prueba:", error.message);
  }
}

testAuthFlow();
