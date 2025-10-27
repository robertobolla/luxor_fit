#!/bin/bash

# ============================================================================
# SCRIPT PARA BORRAR TODOS LOS DATOS DE SUPABASE
# ============================================================================
# ⚠️ ADVERTENCIA: Esto borra TODOS los usuarios y TODA la información
# ============================================================================

echo "🚀 Iniciando limpieza completa de datos de Supabase..."
echo "⚠️  ADVERTENCIA: Esto borrará TODOS los datos de la base de datos"
echo ""

# Verificar que tenemos las variables de entorno necesarias
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Variables de entorno no configuradas"
    echo "   Necesitas configurar:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "💡 Puedes configurarlas en tu archivo .env o exportarlas:"
    echo "   export SUPABASE_URL='tu_url_aqui'"
    echo "   export SUPABASE_SERVICE_ROLE_KEY='tu_service_key_aqui'"
    exit 1
fi

echo "📋 Configuración detectada:"
echo "   URL: $SUPABASE_URL"
echo "   Service Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Confirmar antes de proceder
read -p "¿Estás seguro de que quieres borrar TODOS los datos? (escribe 'BORRAR' para confirmar): " confirmation

if [ "$confirmation" != "BORRAR" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🧹 Ejecutando script de limpieza..."

# Ejecutar el script SQL
psql "$SUPABASE_URL" -c "
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
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Limpieza de Supabase completada exitosamente!"
    echo "🎉 La base de datos está completamente limpia"
    echo ""
    echo "📱 Próximos pasos:"
    echo "   1. Ejecuta la app y usa el botón 'Limpiar Datos Locales'"
    echo "   2. O ejecuta: npm run clear-local-data"
    echo "   3. Reinicia la app para empezar desde cero"
else
    echo ""
    echo "❌ Error durante la limpieza de Supabase"
    echo "   Revisa la configuración de la base de datos"
    exit 1
fi
