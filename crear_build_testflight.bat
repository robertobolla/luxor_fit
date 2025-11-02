@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   Luxor Fitness - Build para TestFlight
echo ═══════════════════════════════════════════════
echo.
echo Este script creará un build de producción para iOS
echo que puedes subir a TestFlight y distribuir a testers.
echo.
echo REQUISITOS:
echo - Cuenta Apple Developer ($99/año)
echo - App Store Connect configurado
echo.
pause

echo.
echo [1/3] Verificando EAS CLI...
where eas >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  EAS CLI no encontrado. Instalando...
    call npm install -g eas-cli@latest
) else (
    echo ✅ EAS CLI instalado
)

echo.
echo [2/3] Verificando sesión...
call eas whoami
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  No estás logueado. Inicia sesión:
    call eas login
)

echo.
echo [3/3] Creando build de producción para iOS...
echo.
echo ⏳ Esto tomará 20-45 minutos...
echo 📱 Puedes ver el progreso en:
echo    https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
echo.
call eas build --profile production --platform ios

echo.
echo ═══════════════════════════════════════════════
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build completado!
    echo.
    echo Próximos pasos:
    echo 1. Sube el build a TestFlight:
    echo    eas submit --platform ios --latest
    echo.
    echo 2. O sube manualmente desde:
    echo    https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
    echo.
    echo 3. En App Store Connect:
    echo    - Ve a TestFlight
    echo    - Agrega testers externos (hasta 10,000)
    echo    - Envía invitaciones
    echo.
    echo 📖 Ver TESTFLIGHT_DISTRIBUCION.md para más detalles
) else (
    echo ❌ Error al crear build
    echo Revisa los logs arriba para más detalles
)
echo ═══════════════════════════════════════════════
pause

