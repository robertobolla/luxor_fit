# 🔧 Solución: Error al Iniciar App en TestFlight

## 🐛 Problema Común

La app se descarga pero no inicia. Esto generalmente se debe a **variables de entorno faltantes** en el build de producción.

## ✅ Solución: Configurar Variables de Entorno en EAS

Las variables de entorno del archivo `.env` local **NO** se incluyen automáticamente en los builds de producción. Debes configurarlas como "secrets" en EAS.

### Paso 1: Obtener tus Variables de Entorno

Necesitas estas variables (de tu archivo `.env` local):

1. **Clerk:**
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (debe ser `pk_live_...` para producción)

2. **Supabase:**
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. **OpenAI (Opcional):**
   - `EXPO_PUBLIC_OPENAI_API_KEY`

### Paso 2: Configurar en EAS

Ejecuta estos comandos (reemplaza los valores con los tuyos):

```bash
# Clerk
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_tu_clave_aqui"

# Supabase
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJtu_clave_aqui"

# OpenAI (opcional)
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-tu_clave_aqui"
```

### Paso 3: Verificar Secrets Configurados

```bash
npx eas-cli secret:list
```

### Paso 4: Crear Nuevo Build

Después de configurar los secrets, crea un nuevo build:

```bash
npx eas-cli build --profile preview --platform ios
```

## 🔍 Verificar el Error Específico

Para diagnosticar mejor, necesito saber:

1. **¿Qué error ves exactamente?**
   - ¿Pantalla negra?
   - ¿Mensaje de error específico?
   - ¿Se cierra inmediatamente?

2. **¿Puedes ver los logs?**
   - En TestFlight, puedes ver logs de crash
   - O conecta el iPhone a una Mac y revisa Console.app

## 📝 Checklist

- [ ] Variables de entorno configuradas en EAS Secrets
- [ ] Usar claves de **producción** (no `pk_test_` para Clerk)
- [ ] Nuevo build creado después de configurar secrets
- [ ] Build subido a TestFlight nuevamente

## 🚀 Comandos Rápidos

```bash
# Ver secrets actuales
npx eas-cli secret:list

# Agregar un secret
npx eas-cli secret:create --scope project --name NOMBRE_VARIABLE --value "valor"

# Crear nuevo build
npx eas-cli build --profile preview --platform ios
```


