@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   Luxor Fitness - Development Build para iOS
echo ═══════════════════════════════════════════════
echo.
echo Este script creará un Development Build que puedes
echo instalar directamente en iPhones registrados.
echo.
echo ⚠️  REQUISITOS ANTES DE CONTINUAR:
echo 1. Tener cuenta Apple Developer ($99/año)
echo 2. Haber registrado los UDIDs en:
echo    https://developer.apple.com/account/resources/devices/list
echo 3. Tener los UDIDs de los iPhones de los testers
echo.
echo 📖 Ver DESARROLLO_BUILD_IOS.md para instrucciones completas
echo.
pause

echo.
echo [1/4] Verificando EAS CLI...
where eas >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  EAS CLI no encontrado. Instalando...
    call npm install -g eas-cli@latest
) else (
    echo ✅ EAS CLI instalado
)

echo.
echo [2/4] Verificando sesión...
call eas whoami
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  No estás logueado. Inicia sesión:
    call eas login
)

echo.
echo [3/4] IMPORTANTE: Verificar UDIDs registrados
echo.
echo ¿Ya registraste los UDIDs en Apple Developer Portal?
echo    https://developer.apple.com/account/resources/devices/list
echo.
set /p confirm_udids="(S/N): "
if /i not "%confirm_udids%"=="S" (
    echo.
    echo ⚠️  Por favor registra los UDIDs primero.
    echo Ver OBTENER_UDID_IPHONE.md para cómo obtenerlos.
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Creando Development Build para iOS...
echo.
echo ⏳ Esto tomará 20-45 minutos...
echo 📱 Puedes ver el progreso en:
echo    https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
echo.
echo Durante el proceso:
echo - Se te pedirá generar certificado → Responde: Y
echo - Se te pedirá generar provisioning profile → Responde: Y
echo - Selecciona los dispositivos registrados
echo.
pause

call eas build --profile development --platform ios

echo.
echo ═══════════════════════════════════════════════
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build completado!
    echo.
    echo Próximos pasos:
    echo 1. Ve a: https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
    echo 2. Encuentra el build recién creado
    echo 3. Copia el link de descarga
    echo 4. Envía el link a los testers (solo los UDIDs registrados)
    echo.
    echo 📝 Los testers necesitan:
    echo    - Abrir el link en Safari (iPhone)
    echo    - Instalar el perfil de desarrollo
    echo    - Ir a Ajustes → General → VPN y gestión de dispositivos
    echo    - Confiar en el certificado
    echo.
    echo ⚠️  RECUERDA: Este build expira en 7 días
    echo    Crea un nuevo build antes de que expire
    echo.
    echo 📖 Ver DESARROLLO_BUILD_IOS.md para más detalles
) else (
    echo ❌ Error al crear build
    echo.
    echo Posibles causas:
    echo - UDIDs no registrados en Apple Developer
    echo - Problemas con certificados
    echo - Revisa los logs arriba para más detalles
)
echo ═══════════════════════════════════════════════
pause

