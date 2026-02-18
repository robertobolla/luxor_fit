# Script de Migración de Base de Datos: Producción -> Desarrollo
# Requisitos: pg_dump y psql instalados en el sistema

$PROD_PROJECT_ID = "fseyophzvhafjywyufsa"
$DEV_PROJECT_ID = "vsgomemzzmffqkbxwsvd"

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Luxor Fitness - Migración de Datos (Prod -> Dev)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script copiará TODOS los datos de Producción a Desarrollo,"
Write-Host "EXCEPTO la tabla de videos de ejercicios (exercise_videos)."
Write-Host ""
Write-Host "⚠️ ADVERTENCIA: Se SOBREESCRIBIRÁN los datos en Desarrollo." -ForegroundColor Yellow
Write-Host ""

$PROD_PASS = Read-Host -Prompt "Introduce la contraseña de la DB de PRODUCCIÓN"
$DEV_PASS = Read-Host -Prompt "Introduce la contraseña de la DB de DESARROLLO"

$PROD_URL = "postgresql://postgres:$PROD_PASS@db.$PROD_PROJECT_ID.supabase.co:5432/postgres"
$DEV_URL = "postgresql://postgres:$DEV_PASS@db.$DEV_PROJECT_ID.supabase.co:5432/postgres"

Write-Host ""
Write-Host "[1/2] Exportando datos de Producción (excluyendo videos)..." -ForegroundColor Green
# Exportar datos excluyendo la tabla exercise_videos
# --clean incluye comandos para borrar tablas antes de crearlas
# --if-exists evita errores si las tablas no existen
# --no-owner y --no-privileges para evitar problemas de permisos entre proyectos
pg_dump --dbname="$PROD_URL" --clean --if-exists --no-owner --no-privileges --exclude-table=public.exercise_videos > prod_dump_filtered.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Exportación completada con éxito." -ForegroundColor Green
} else {
    Write-Host "❌ Error al exportar. Verifica la contraseña y conexión." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "[2/2] Importando datos a Desarrollo..." -ForegroundColor Green
psql --dbname="$DEV_URL" -f prod_dump_filtered.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Importación completada con éxito." -ForegroundColor Green
} else {
    Write-Host "❌ Error al importar. Revisa los logs arriba." -ForegroundColor Red
}

Write-Host ""
Write-Host "Limpiando archivos temporales..."
Remove-Item prod_dump_filtered.sql -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Proceso finalizado."
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
pause
