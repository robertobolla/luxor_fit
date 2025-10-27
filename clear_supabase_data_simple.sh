#!/bin/bash

# ============================================================================
# SCRIPT SIMPLIFICADO PARA BORRAR DATOS DE SUPABASE
# ============================================================================
# Usa las variables de entorno que ya tienes configuradas
# ============================================================================

echo "🚀 Iniciando limpieza de datos de Supabase..."
echo "⚠️  ADVERTENCIA: Esto borrará TODOS los datos de la base de datos"
echo ""

# Cargar variables del archivo .env
if [ -f .env ]; then
    echo "📋 Cargando variables de entorno desde .env..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas"
else
    echo "❌ Error: No se encontró el archivo .env"
    exit 1
fi

# Verificar que tenemos las variables necesarias
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Variables de Supabase no encontradas en .env"
    echo "   Necesitas:"
    echo "   - EXPO_PUBLIC_SUPABASE_URL"
    echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "📋 Configuración detectada:"
echo "   URL: $EXPO_PUBLIC_SUPABASE_URL"
echo "   Anon Key: ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo ""

# Confirmar antes de proceder
read -p "¿Estás seguro de que quieres borrar TODOS los datos? (escribe 'BORRAR' para confirmar): " confirmation

if [ "$confirmation" != "BORRAR" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🧹 Ejecutando script de limpieza..."

# Crear un archivo SQL temporal
cat > temp_clear_data.sql << 'EOF'
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

-- Verificar que todo se borró
SELECT 
  'progress_photos' as tabla, 
  COUNT(*) as total_registros 
FROM public.progress_photos
UNION ALL
SELECT 'workout_plans', COUNT(*) FROM public.workout_plans
UNION ALL
SELECT 'workout_completions', COUNT(*) FROM public.workout_completions
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
SELECT 'user_profiles', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'storage.objects (progress-photos)', COUNT(*) FROM storage.objects WHERE bucket_id = 'progress-photos';
EOF

# Ejecutar el script SQL usando psql
echo "🗄️ Conectando a Supabase..."
psql "$EXPO_PUBLIC_SUPABASE_URL" -f temp_clear_data.sql

# Limpiar archivo temporal
rm -f temp_clear_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Limpieza de Supabase completada exitosamente!"
    echo "🎉 La base de datos está completamente limpia"
    echo ""
    echo "📱 Próximos pasos:"
    echo "   1. La app ya está corriendo y limpia"
    echo "   2. Abre la app en tu dispositivo"
    echo "   3. Verás el onboarding desde el principio"
else
    echo ""
    echo "❌ Error durante la limpieza de Supabase"
    echo "   Revisa la configuración de la base de datos"
    exit 1
fi
