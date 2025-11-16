# 🔧 Configurar Variables de Entorno en EAS

## 📝 Pasos

Ejecuta estos comandos uno por uno. Cuando te pida el valor, pega tu clave de producción:

### 1. Clerk (Publishable Key de PRODUCCIÓN)

```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_tu_clave_aqui" --type secret
```

**Importante:** Debe ser `pk_live_...` (NO `pk_test_...`)

### 2. Supabase URL

```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co" --type secret
```

### 3. Supabase Anon Key

```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJtu_clave_aqui" --type secret
```

### 4. OpenAI (Opcional)

```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-tu_clave_aqui" --type secret
```

## ✅ Verificar

Después de configurar todas, verifica:

```bash
npx eas-cli env:list
```

## 🚀 Crear Nuevo Build

Una vez configuradas todas las variables:

```bash
npx eas-cli build --profile preview --platform ios
```

Este nuevo build incluirá las variables de entorno y debería funcionar correctamente en TestFlight.


