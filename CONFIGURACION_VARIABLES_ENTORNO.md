# Configuración de Variables de Entorno

## 📋 Variables Requeridas

FitMind utiliza las siguientes variables de entorno:

### 1. Clerk (Autenticación) - **REQUERIDO**

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**Cómo obtenerla:**

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Selecciona tu aplicación
3. Ve a **API Keys**
4. Copia la **Publishable Key**

### 2. Supabase (Base de Datos) - **REQUERIDO**

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Cómo obtenerlas:**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 3. OpenAI (ChatGPT) - **OPCIONAL**

```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

**Cómo obtenerla:**

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys**
4. Haz clic en **Create new secret key**
5. Copia la clave

**Nota:** Esta variable es opcional. Si no la configuras, la app usará texto por defecto personalizado en lugar de ChatGPT.

## 🔧 Configuración Paso a Paso

### Paso 1: Crear el archivo .env

1. En la raíz del proyecto, crea un archivo llamado `.env`
2. Copia el contenido de `.env.example`
3. Reemplaza los valores de ejemplo con tus claves reales

```bash
# En la terminal:
cp .env.example .env
```

### Paso 2: Editar el archivo .env

Abre `.env` y reemplaza los valores:

```env
# Antes (ejemplo)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Después (con tu clave real)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123xyz456...
```

### Paso 3: Verificar que .env está en .gitignore

El archivo `.env` **NO** debe subirse a Git. Verifica que esté en `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### Paso 4: Reiniciar el servidor

Después de configurar las variables, reinicia el servidor:

```bash
npx expo start --clear
```

## ✅ Verificación

### Verificar Clerk

Si Clerk está configurado correctamente:

- Podrás registrarte e iniciar sesión
- Verás tu nombre en el dashboard
- No verás errores de autenticación

### Verificar Supabase

Si Supabase está configurado correctamente:

- El onboarding guardará tus datos
- Verás tus ejercicios registrados
- No verás errores de base de datos

### Verificar OpenAI (Opcional)

Si OpenAI está configurado:

- Verás una introducción personalizada generada por IA después del onboarding
- En la consola verás: "Analizando tus datos y creando tu plan personalizado..."

Si NO está configurado:

- Verás una introducción por defecto personalizada
- En la consola verás: "⚠️ OpenAI API Key no configurada, usando texto por defecto"

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **NUNCA** subas el archivo `.env` a Git
2. **NUNCA** compartas tus claves públicamente
3. **NUNCA** incluyas claves directamente en el código
4. **SIEMPRE** usa variables de entorno

### Buenas Prácticas

1. **Usa .env.example**: Mantén un archivo de ejemplo sin claves reales
2. **Documenta**: Explica qué hace cada variable
3. **Rota claves**: Cambia las claves periódicamente
4. **Monitorea uso**: Revisa el uso de tus APIs regularmente

### Para Producción

En producción, las variables se configuran de forma diferente:

#### Expo EAS Build

```bash
# Configurar secrets en EAS
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-..."
```

## 🐛 Troubleshooting

### Error: "Cannot find module 'dotenv'"

**Solución:** Expo maneja `.env` automáticamente, no necesitas instalar `dotenv`.

### Error: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is undefined"

**Soluciones:**

1. Verifica que el archivo `.env` existe en la raíz
2. Verifica que la variable está escrita correctamente
3. Reinicia el servidor con `--clear`
4. Verifica que la variable empieza con `EXPO_PUBLIC_`

### Las variables no se cargan

**Soluciones:**

1. Las variables deben empezar con `EXPO_PUBLIC_` para estar disponibles en el cliente
2. Reinicia el servidor después de cambiar `.env`
3. Usa `npx expo start --clear` para limpiar caché

### Error: "Invalid API Key" (OpenAI)

**Soluciones:**

1. Verifica que copiaste la clave completa (empieza con `sk-`)
2. Verifica que la clave no tiene espacios al inicio/final
3. Verifica que la clave no ha expirado
4. Genera una nueva clave en OpenAI Platform

## 📝 Ejemplo Completo

```env
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZXhhbXBsZS5jb20k

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API (Opcional)
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-abc123xyz456...
```

## 🎯 Resumen

| Variable                            | Requerida | Propósito                      | Dónde Obtenerla                                      |
| ----------------------------------- | --------- | ------------------------------ | ---------------------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Sí     | Autenticación de usuarios      | [Clerk Dashboard](https://dashboard.clerk.com/)      |
| `EXPO_PUBLIC_SUPABASE_URL`          | ✅ Sí     | Conexión a base de datos       | [Supabase Dashboard](https://supabase.com/dashboard) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`     | ✅ Sí     | Acceso a Supabase              | [Supabase Dashboard](https://supabase.com/dashboard) |
| `EXPO_PUBLIC_OPENAI_API_KEY`        | ❌ No     | Generación de contenido con IA | [OpenAI Platform](https://platform.openai.com/)      |

## 🔗 Enlaces Útiles

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

## 🔄 Comandos Rápidos para Cambiar Entorno

En lugar de copiar archivos manualmente, puedes usar estos comandos preconfigurados en `package.json`:

### 🛠️ Modo Desarrollo
Copia las variables de desarrollo y reinicia el servidor:
```bash
npm run start:dev
```
*(Equivalente a: `npm run set-env:dev` + `npx expo start --clear`)*

### 🚀 Modo Producción
Copia las variables de producción y reinicia el servidor:
```bash
npm run start:prod
```
*(Equivalente a: `npm run set-env:prod` + `npx expo start --clear`)*

### ℹ️ Sobre `npm start`
El comando estándar `npm start` (o `npx expo start`) **NO cambia el entorno**.
Simplemente inicia la app usando la configuración que tenga el archivo `.env` actual en ese momento.

- Si lo último que ejecutaste fue `start:dev`, `npm start` seguirá en **Desarrollo**.
- Si lo último que ejecutaste fue `start:prod`, `npm start` seguirá en **Producción**.
