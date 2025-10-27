# Configuración de Tabla de Perfiles de Usuario en Supabase

Este documento describe cómo configurar la tabla `user_profiles` en Supabase para almacenar la información del onboarding y perfiles de usuario.

## Pasos de Configuración

### 1. Crear la Tabla en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Copia y pega el contenido del archivo `supabase_user_profiles_table.sql`
4. Haz clic en **Run** para ejecutar el script

### 2. Verificar la Tabla

Después de ejecutar el script, verifica que:

1. La tabla `user_profiles` se haya creado correctamente
2. Ve a **Table Editor** en el menú lateral
3. Deberías ver la tabla `user_profiles` en la lista
4. Verifica que tenga las siguientes columnas:
   - `id` (UUID)
   - `user_id` (TEXT) - ID de Clerk
   - `name` (TEXT)
   - `age` (INTEGER)
   - `height` (INTEGER)
   - `weight` (INTEGER)
   - `fitness_level` (TEXT)
   - `goals` (TEXT[])
   - `activity_types` (TEXT[])
   - `available_days` (INTEGER)
   - `session_duration` (INTEGER)
   - `equipment` (TEXT[])
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

### 3. Estructura de la Tabla

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- ID de Clerk
  name TEXT,
  age INTEGER,
  height INTEGER,  -- en cm
  weight INTEGER,  -- en kg
  fitness_level TEXT,  -- 'beginner' | 'intermediate' | 'advanced'
  goals TEXT[],  -- ['weight_loss', 'muscle_gain', ...]
  activity_types TEXT[],  -- ['cardio', 'strength', ...]
  available_days INTEGER,  -- 1-7 días
  session_duration INTEGER,  -- minutos
  equipment TEXT[],  -- ['dumbbells', 'barbell', ...]
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 4. Row Level Security (RLS)

La tabla tiene RLS habilitado con las siguientes políticas:

- **SELECT**: Los usuarios pueden ver todos los perfiles (filtrado por `user_id` en el cliente)
- **INSERT**: Los usuarios pueden crear perfiles (con su `user_id` de Clerk)
- **UPDATE**: Los usuarios pueden actualizar perfiles (filtrado por `user_id` en el cliente)
- **DELETE**: Los usuarios pueden eliminar perfiles (filtrado por `user_id` en el cliente)

**Nota**: Usamos `USING (true)` y `WITH CHECK (true)` porque la autenticación se maneja con Clerk, no con Supabase Auth. El filtrado por `user_id` se hace en el cliente usando el ID de Clerk.

### 5. Valores de Enumeración

#### Fitness Level

- `beginner` - Principiante
- `intermediate` - Intermedio
- `advanced` - Avanzado

#### Goals (Objetivos)

- `weight_loss` - Perder peso
- `muscle_gain` - Ganar músculo
- `strength` - Aumentar fuerza
- `endurance` - Mejorar resistencia
- `flexibility` - Flexibilidad/Movilidad
- `general_fitness` - Mantener forma general

#### Activity Types (Tipos de Actividad)

- `cardio` - Cardio (correr, nadar, bici)
- `strength` - Fuerza (pesas, calistenia)
- `sports` - Deportes (fútbol, basketball)
- `yoga` - Yoga/Pilates
- `hiit` - HIIT (entrenamiento intenso)
- `mixed` - Mixto (de todo un poco)

#### Equipment (Equipamiento)

- `none` - Solo peso corporal
- `dumbbells` - Mancuernas
- `barbell` - Barra olímpica
- `resistance_bands` - Bandas de resistencia
- `pull_up_bar` - Barra de dominadas
- `bench` - Banco
- `gym_access` - Acceso a gimnasio

### 6. Uso en la Aplicación

La aplicación guarda el perfil del usuario durante el onboarding:

```typescript
const { user } = useUser(); // Clerk

await supabase.from("user_profiles").upsert({
  user_id: user.id, // ID de Clerk
  name: "Juan",
  age: 25,
  height: 175,
  weight: 70,
  fitness_level: "beginner",
  goals: ["weight_loss", "general_fitness"],
  activity_types: ["cardio", "strength"],
  available_days: 3,
  session_duration: 30,
  equipment: ["dumbbells", "none"],
});
```

### 7. Troubleshooting

Si tienes problemas:

1. **Error "Could not find the table 'public.user_profiles'"**

   - Ejecuta el script SQL en Supabase SQL Editor
   - Verifica que la tabla exista en Table Editor

2. **Error de permisos RLS**

   - Las políticas están configuradas con `USING (true)` para permitir acceso
   - La autenticación se maneja con Clerk, no con Supabase Auth

3. **Error al insertar datos**
   - Verifica que los valores de enumeración sean correctos (minúsculas)
   - Verifica que los arrays tengan el formato correcto

### 8. Próximos Pasos

Una vez que la tabla esté configurada:

1. Completa el onboarding en la app
2. Verifica que los datos se guarden correctamente en Supabase
3. Estos datos se usarán para generar entrenamientos personalizados con IA
