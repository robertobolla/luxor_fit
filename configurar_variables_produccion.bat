@echo off
echo ========================================
echo Configurar Variables de Entorno - PRODUCCION
echo ========================================
echo.
echo IMPORTANTE: Usa claves de PRODUCCION (pk_live_...)
echo.

echo.
echo 1. Clerk Publishable Key (pk_live_...)
npx eas-cli env:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --type string --visibility sensitive --environment production

echo.
echo 2. Supabase URL
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --type string --visibility sensitive --environment production

echo.
echo 3. Supabase Anon Key
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --type string --visibility sensitive --environment production

echo.
echo 4. OpenAI API Key (Opcional)
npx eas-cli env:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --type string --visibility sensitive --environment production

echo.
echo ========================================
echo Variables configuradas!
echo ========================================
echo.
echo Ahora crea el build de produccion:
echo npx eas-cli build --profile production --platform ios
echo.

