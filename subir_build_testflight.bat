@echo off
echo ========================================
echo Subir Build a TestFlight
echo ========================================
echo.
echo Ejecutando submit...
echo.

npx eas-cli submit --platform ios --latest

echo.
echo ========================================
echo Si te pide contraseña, ingresa: Hefesto123.
echo ========================================
pause

