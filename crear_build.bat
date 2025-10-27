@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   FitMind - Creando Build Instalable
echo ═══════════════════════════════════════════════
echo.
echo ¿Qué plataforma quieres?
echo [1] Android (gratis, más fácil)
echo [2] iOS (requiere cuenta Apple Developer $99/año)
echo.
set /p platform="Elige 1 o 2: "

if "%platform%"=="1" goto android
if "%platform%"=="2" goto ios
goto end

:android
echo.
echo [1/3] Actualizando EAS CLI...
call npm install -g eas-cli@latest
echo.
echo [2/3] Configurando credenciales ANDROID...
echo    → Selecciona: android
echo    → Selecciona: preview  
echo    → Responde: y (generar nuevo Keystore)
echo    → Responde: n (no necesitas Google Play)
echo.
eas credentials
echo.
echo [3/3] Iniciando build ANDROID...
echo.
eas build --profile preview --platform android
goto final

:ios
echo.
echo [1/3] Actualizando EAS CLI...
call npm install -g eas-cli@latest
echo.
echo [2/3] Configurando credenciales iOS...
echo    IMPORTANTE: Necesitas cuenta Apple Developer
echo    → Selecciona: ios
echo    → EAS manejará las credenciales
echo.
eas credentials
echo.
echo [3/3] Iniciando build iOS...
echo.
eas build --profile preview --platform ios
goto final

:final
echo.
echo ═══════════════════════════════════════════════
echo   Build iniciado! 
echo   Puedes ver el progreso en:
echo   https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
echo ═══════════════════════════════════════════════
:end
pause

