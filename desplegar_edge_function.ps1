# Script PowerShell para desplegar Edge Function create-gym-user
# Ejecutar desde la raíz del proyecto en PowerShell

Write-Host "🚀 Desplegando Edge Function create-gym-user..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "supabase_edge_functions_create-gym-user")) {
    Write-Host "❌ Error: No se encuentra el directorio supabase_edge_functions_create-gym-user" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Verificar que Supabase CLI esté instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Supabase CLI no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalarlo:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Login (si no está logueado)
Write-Host "🔐 Verificando login..." -ForegroundColor Cyan
try {
    supabase status 2>&1 | Out-Null
    Write-Host "✅ Ya estás logueado" -ForegroundColor Green
} catch {
    Write-Host "Por favor inicia sesión en Supabase:" -ForegroundColor Yellow
    supabase login
}

Write-Host ""

# Desplegar función
Write-Host "📤 Desplegando función..." -ForegroundColor Cyan
Write-Host ""

# Crear directorio temporal con la estructura correcta
New-Item -Path "supabase\functions\create-gym-user" -ItemType Directory -Force | Out-Null
Copy-Item "supabase_edge_functions_create-gym-user\index.ts" "supabase\functions\create-gym-user\"

# Desplegar
try {
    supabase functions deploy create-gym-user
    $deploySuccess = $true
} catch {
    Write-Host "❌ Error al desplegar: $_" -ForegroundColor Red
    $deploySuccess = $false
}

# Limpiar
Remove-Item -Path "supabase\functions" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""

if ($deploySuccess) {
    Write-Host "✅ Función desplegada correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Ve a tu Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/_/functions" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Configura las variables de entorno en 'Secrets':" -ForegroundColor Yellow
    Write-Host "   CLERK_SECRET_KEY = sk_test_..." -ForegroundColor White
    Write-Host "   (obtener de https://dashboard.clerk.com → API Keys)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Verifica que funciona:" -ForegroundColor Yellow
    Write-Host "   - Crea un usuario de prueba desde el dashboard" -ForegroundColor White
    Write-Host "   - Debería recibir un email de invitación" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Ver logs en tiempo real:" -ForegroundColor Cyan
    Write-Host "   supabase functions logs create-gym-user --follow" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Error al desplegar la función" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativa: Desplegar manualmente desde el Dashboard" -ForegroundColor Yellow
    Write-Host "   1. Ve a Supabase Dashboard → Edge Functions" -ForegroundColor White
    Write-Host "   2. Create new function → Nombre: create-gym-user" -ForegroundColor White
    Write-Host "   3. Copia el contenido de supabase_edge_functions_create-gym-user\index.ts" -ForegroundColor White
    Write-Host "   4. Pégalo en el editor y Deploy" -ForegroundColor White
    Write-Host ""
}

