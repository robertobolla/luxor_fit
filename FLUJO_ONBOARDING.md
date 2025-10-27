# Flujo de Onboarding en FitMind

Este documento explica cómo funciona el sistema de verificación de onboarding en la aplicación FitMind.

## Descripción General

La aplicación verifica automáticamente si un usuario ha completado el onboarding y lo redirige según corresponda:

- **Usuario nuevo** → Onboarding
- **Usuario existente con perfil** → Dashboard
- **Usuario que intenta acceder al dashboard sin perfil** → Onboarding

## Archivos Involucrados

### 1. `app/index.tsx` - Pantalla de Inicio

**Función**: Punto de entrada de la aplicación.

**Flujo**:

1. Verifica si el usuario está autenticado con Clerk
2. Si está autenticado, verifica si tiene perfil en Supabase
3. Redirige según el resultado:
   - **Tiene perfil** → `/(tabs)/dashboard`
   - **No tiene perfil** → `/onboarding`
4. Si no está autenticado, muestra botones de Login/Registro

**Código clave**:

```typescript
const { data } = await supabase
  .from("user_profiles")
  .select("id, name, fitness_level")
  .eq("user_id", user.id)
  .single();

const hasProfile = !!data && !!data.name && !!data.fitness_level;

if (hasProfile) {
  router.replace("/(tabs)/dashboard");
} else {
  router.replace("/onboarding");
}
```

### 2. `app/(tabs)/dashboard.tsx` - Dashboard

**Función**: Pantalla principal de la aplicación.

**Flujo**:

1. Al cargar, verifica si el usuario tiene perfil
2. Si no tiene perfil, redirige al onboarding
3. Muestra un loading spinner mientras verifica
4. Solo carga los datos del dashboard si la verificación es exitosa

**Código clave**:

```typescript
useEffect(() => {
  const checkOnboarding = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("id, name, fitness_level")
      .eq("user_id", user.id)
      .single();

    const hasProfile = !!data && !!data.name && !!data.fitness_level;

    if (!hasProfile) {
      router.replace("/onboarding");
    }

    setIsCheckingOnboarding(false);
  };

  checkOnboarding();
}, [user]);
```

### 3. `app/onboarding.tsx` - Proceso de Onboarding

**Función**: Recopila información del usuario en 8 pasos.

**Flujo**:

1. Usuario completa 8 pasos de preguntas
2. Al finalizar, guarda el perfil en Supabase usando el ID de Clerk
3. Redirige al dashboard
4. Si hay error al identificar al usuario, redirige al login

**Código clave**:

```typescript
const handleComplete = async () => {
  if (!user) {
    Alert.alert("Error", "No se pudo identificar al usuario...");
    router.replace("/(auth)/login");
    return;
  }

  await supabase.from("user_profiles").upsert({
    user_id: user.id,
    name: formData.name,
    age: parseInt(formData.age),
    // ... resto de campos
  });

  router.replace("/(tabs)/dashboard");
};
```

### 4. `app/(auth)/register.tsx` - Registro

**Función**: Crear nueva cuenta de usuario.

**Flujo**:

1. Usuario se registra con email/password u OAuth (Google)
2. Después del registro exitoso, redirige al onboarding
3. El usuario completa el onboarding antes de acceder al dashboard

**Código clave**:

```typescript
// Después del registro exitoso
router.replace("/onboarding");
```

### 5. `src/hooks/useOnboardingCheck.ts` - Hook Personalizado

**Función**: Hook reutilizable para verificar el estado del onboarding.

**Características**:

- Verifica automáticamente el estado del onboarding
- Redirige según la ruta actual y el estado del perfil
- Previene loops de redirección
- Retorna estados de carga y verificación

**Uso** (opcional, no implementado actualmente):

```typescript
const { isCheckingOnboarding, hasCompletedOnboarding } = useOnboardingCheck();
```

## Tabla de Supabase

### `user_profiles`

**Estructura**:

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- ID de Clerk
  name TEXT,
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  fitness_level TEXT,
  goals TEXT[],
  activity_types TEXT[],
  available_days INTEGER,
  session_duration INTEGER,
  equipment TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Criterio de verificación**:
Un perfil se considera "completo" si tiene:

- `name` (no nulo y no vacío)
- `fitness_level` (no nulo y no vacío)

## Diagrama de Flujo

```
Usuario Inicia App
       ↓
  ¿Autenticado?
     ↙     ↘
   No       Sí
    ↓        ↓
Pantalla   Verificar
Bienvenida  Perfil
    ↓        ↓
Login/     ¿Tiene perfil?
Register   ↙        ↘
    ↓     No         Sí
    ↓      ↓          ↓
    ↓  Onboarding  Dashboard
    ↓      ↓          ↓
    ↓  Completar  Usar App
    ↓  Perfil
    ↓      ↓
    └──→ Guardar
         en DB
           ↓
       Dashboard
```

## Casos de Uso

### Caso 1: Usuario Nuevo

1. Usuario abre la app por primera vez
2. Ve pantalla de bienvenida
3. Hace clic en "Crear Cuenta"
4. Completa el registro
5. **Automáticamente** va al onboarding
6. Completa los 8 pasos del onboarding
7. Su perfil se guarda en Supabase
8. **Automáticamente** va al dashboard

### Caso 2: Usuario Existente con Perfil

1. Usuario abre la app
2. Ya está autenticado (Clerk mantiene la sesión)
3. La app verifica que tiene perfil en Supabase
4. **Automáticamente** va al dashboard

### Caso 3: Usuario Existente sin Perfil

1. Usuario abre la app
2. Ya está autenticado
3. La app verifica que NO tiene perfil en Supabase
4. **Automáticamente** va al onboarding
5. Completa el onboarding
6. **Automáticamente** va al dashboard

### Caso 4: Usuario Intenta Saltarse el Onboarding

1. Usuario está en onboarding pero intenta navegar directamente al dashboard
2. El dashboard verifica que no tiene perfil
3. **Automáticamente** lo redirige de vuelta al onboarding

### Caso 5: Usuario Completa Onboarding desde Perfil

1. Usuario ya tiene cuenta pero no completó el onboarding
2. Va a la pestaña "Perfil"
3. Ve el botón "Completar perfil"
4. Hace clic y va al onboarding
5. Completa el onboarding
6. Puede volver al dashboard

## Ventajas del Sistema

1. **Automático**: No requiere intervención del usuario
2. **Seguro**: Verifica en múltiples puntos
3. **Sin loops**: Previene redirecciones infinitas
4. **UX mejorada**: Loading screens mientras verifica
5. **Flexible**: Permite completar onboarding más tarde desde perfil
6. **Consistente**: Mismo flujo en todas partes

## Configuración Necesaria

Para que el sistema funcione correctamente:

1. **Tabla en Supabase**: Ejecutar `supabase_user_profiles_table.sql`
2. **Variables de entorno**: Configurar Clerk y Supabase en `.env`
3. **Permisos RLS**: Las políticas permiten acceso con `USING (true)`
4. **Autenticación**: Clerk debe estar configurado correctamente

## Troubleshooting

### Problema: Loop infinito de redirecciones

**Solución**: Verificar que la tabla `user_profiles` exista en Supabase

### Problema: Usuario queda atascado en loading

**Solución**: Verificar conexión a Supabase y configuración de variables de entorno

### Problema: Error "Usuario no autenticado" al completar onboarding

**Solución**: Verificar que Clerk esté configurado y el usuario esté logueado

### Problema: Dashboard se muestra antes del onboarding

**Solución**: Verificar que el criterio de "perfil completo" sea correcto (`name` y `fitness_level`)

## Próximas Mejoras

1. **Caché local**: Guardar estado del onboarding localmente para evitar verificaciones constantes
2. **Skip parcial**: Permitir completar el onboarding en múltiples sesiones
3. **Edición de perfil**: Permitir modificar respuestas del onboarding
4. **Progreso visual**: Mostrar qué pasos del onboarding están completos
