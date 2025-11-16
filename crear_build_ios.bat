@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   Luxor Fitness - Build iOS para Compartir
echo ═══════════════════════════════════════════════
echo.
echo ⚠️ IMPORTANTE: Necesitas cuenta Apple Developer ($99/año)
echo.
echo ¿Ya tienes cuenta Apple Developer configurada?
echo [1] Sí, continuar con el build
echo [2] No, necesito crearla primero
echo.
set /p choice="Elige 1 o 2: "

if "%choice%"=="2" (
    echo.
    echo 📝 Pasos para crear cuenta Apple Developer:
    echo.
    echo 1. Ve a: https://developer.apple.com/programs/
    echo 2. Haz clic en "Enroll" o "Inscríbete"
    echo 3. Inicia sesión con tu Apple ID
    echo 4. Completa el formulario y paga $99/año
    echo 5. Espera aprobación (24-48 horas)
    echo.
    echo Cuando esté aprobada, ejecuta este script de nuevo.
    pause
    exit
)

echo.
echo [1/3] Configurando credenciales iOS...
echo    → Selecciona: ios
echo    → Selecciona: preview
echo    → Responde: Y (tienes cuenta Apple Developer)
echo    → Responde: Y (EAS maneja credenciales)
echo    → Ingresa tu Apple ID y contraseña
echo.
npx eas-cli credentials

echo.
echo [2/3] Creando build iOS...
echo    ⏱️ Esto tomará 20-40 minutos
echo    Puedes cerrar esta ventana, se ejecuta en la nube
echo.
npx eas-cli build --profile preview --platform ios

echo.
echo [3/3] Build completado!
echo.
echo 📲 Próximos pasos:
echo    1. Ve a: https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
echo    2. Descarga el build o usa: eas submit --platform ios --latest
echo    3. Sube a TestFlight y agrega usuarios
echo.
pause

