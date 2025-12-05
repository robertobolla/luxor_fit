#!/bin/bash

# Script para desplegar la Edge Function create-gym-user
# Ejecutar desde la raíz del proyecto

echo "🚀 Desplegando Edge Function create-gym-user..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "supabase_edge_functions_create-gym-user" ]; then
    echo "❌ Error: No se encuentra el directorio supabase_edge_functions_create-gym-user"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI no está instalado"
    echo ""
    echo "Para instalarlo:"
    echo "  npm install -g supabase"
    echo "  o"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Login (si no está logueado)
echo "🔐 Verificando login..."
if ! supabase status &> /dev/null; then
    echo "Por favor inicia sesión en Supabase:"
    supabase login
fi

echo "✅ Login verificado"
echo ""

# Desplegar función
echo "📤 Desplegando función..."
echo ""

# Crear directorio temporal con la estructura correcta
mkdir -p supabase/functions/create-gym-user
cp supabase_edge_functions_create-gym-user/index.ts supabase/functions/create-gym-user/

# Desplegar
supabase functions deploy create-gym-user

# Limpiar
rm -rf supabase/functions

echo ""
echo "✅ Función desplegada!"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Ve a tu Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/_/functions"
echo ""
echo "2. Configura las variables de entorno:"
echo "   - CLERK_SECRET_KEY (obtener de https://dashboard.clerk.com)"
echo ""
echo "3. Verifica que funciona:"
echo "   - Intenta crear un usuario desde el dashboard"
echo "   - El usuario debería recibir un email de invitación"
echo ""
echo "🔍 Ver logs:"
echo "   supabase functions logs create-gym-user --follow"
echo ""

