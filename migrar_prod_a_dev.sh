#!/bin/bash
# Script de Migración de Base de Datos: Producción -> Desarrollo
# Para usar en Git Bash / Linux / macOS

PROD_PROJECT_ID="fseyophzvhafjywyufsa"
DEV_PROJECT_ID="vsgomemzzmffqkbxwsvd"

echo "═══════════════════════════════════════════════"
echo "  Luxor Fitness - Migración de Datos (Prod -> Dev)"
echo "═══════════════════════════════════════════════"
echo ""
echo "Este script copiará TODOS los datos de Producción a Desarrollo,"
echo "EXCEPTO la tabla de videos de ejercicios (exercise_videos)."
echo ""
echo -e "\033[33m⚠️ ADVERTENCIA: Se SOBREESCRIBIRÁN los datos en Desarrollo.\033[0m"
echo ""

# Verificar si pg_dump y psql existen
if ! command -v pg_dump &> /dev/null; then
    echo -e "\033[31m❌ Error: pg_dump no está instalado o no está en el PATH.\033[0m"
    echo "Por favor, instala PostgreSQL o añade el directorio /bin de Postgres a tus variables de entorno."
    exit 1
fi

read -sp "Introduce la contraseña de la DB de PRODUCCIÓN: " PROD_PASS
echo ""
read -sp "Introduce la contraseña de la DB de DESARROLLO: " DEV_PASS
echo ""

PROD_URL="postgresql://postgres:$PROD_PASS@db.$PROD_PROJECT_ID.supabase.co:5432/postgres"
DEV_URL="postgresql://postgres:$DEV_PASS@db.$DEV_PROJECT_ID.supabase.co:5432/postgres"

echo ""
echo -e "\033[32m[1/2] Exportando datos de Producción (excluyendo videos)...\033[0m"
pg_dump --dbname="$PROD_URL" --clean --if-exists --no-owner --no-privileges --exclude-table=public.exercise_videos > prod_dump_filtered.sql

if [ $? -eq 0 ]; then
    echo -e "\033[32m✅ Exportación completada con éxito.\033[0m"
else
    echo -e "\033[31m❌ Error al exportar. Verifica la contraseña y conexión.\033[0m"
    exit 1
fi

echo ""
echo -e "\033[32m[2/2] Importando datos a Desarrollo...\033[0m"
psql --dbname="$DEV_URL" -f prod_dump_filtered.sql

if [ $? -eq 0 ]; then
    echo -e "\033[32m✅ Importación completada con éxito.\033[0m"
else
    echo -e "\033[31m❌ Error al importar. Revisa los logs arriba.\033[0m"
fi

echo ""
echo "Limpiando archivos temporales..."
rm prod_dump_filtered.sql 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════"
echo " Proceso finalizado."
echo "═══════════════════════════════════════════════"
read -p "Presiona Enter para salir..."
