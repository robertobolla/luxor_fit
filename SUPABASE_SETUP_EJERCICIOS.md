# 🏋️ Configuración de Base de Datos para Ejercicios

## 📋 Resumen

Esta guía explica cómo configurar la tabla `exercises` en Supabase para guardar las actividades físicas de los usuarios.

---

## 🗄️ Estructura de la Tabla

La tabla `exercises` almacena:

- ✅ **Actividades con GPS** (correr, caminar, bici, senderismo)
- ✅ **Actividades manuales** (pesas, calistenia, fútbol, etc.)

### Campos de la tabla:

| Campo               | Tipo      | Descripción                                   |
| ------------------- | --------- | --------------------------------------------- |
| `id`                | UUID      | ID único del ejercicio                        |
| `user_id`           | TEXT      | ID del usuario (de Clerk)                     |
| `activity_type`     | TEXT      | Tipo de actividad: 'running', 'walking', etc. |
| `activity_name`     | TEXT      | Nombre legible: 'Correr', 'Caminar', etc.     |
| `date`              | DATE      | Fecha del ejercicio (YYYY-MM-DD)              |
| `duration_minutes`  | INTEGER   | Duración en minutos                           |
| `distance_km`       | DECIMAL   | Distancia recorrida (solo GPS)                |
| `calories`          | INTEGER   | Calorías quemadas (opcional)                  |
| `notes`             | TEXT      | Notas del usuario (opcional)                  |
| `has_gps`           | BOOLEAN   | Si la actividad tiene datos GPS               |
| `average_speed_kmh` | DECIMAL   | Velocidad promedio (solo GPS)                 |
| `created_at`        | TIMESTAMP | Fecha de creación                             |
| `updated_at`        | TIMESTAMP | Fecha de última actualización                 |

---

## 🚀 Paso 1: Crear la Tabla en Supabase

1. **Abre tu proyecto en Supabase**

   - Ve a [https://supabase.com](https://supabase.com)
   - Abre tu proyecto

2. **Abre el SQL Editor**

   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y pega el SQL**

   - Abre el archivo `supabase_exercises_table.sql`
   - Copia todo el contenido
   - Pégalo en el editor SQL de Supabase

4. **Ejecuta el script**
   - Haz clic en "Run" o presiona `Ctrl+Enter`
   - Verifica que no haya errores

## ⚠️ **IMPORTANTE: Actualizar Políticas para Clerk**

**Si ya ejecutaste el script anterior**, necesitas actualizar las políticas RLS para que funcionen con Clerk:

1. **Abre el SQL Editor** en Supabase
2. **Nueva query** → Copia el contenido de `supabase_exercises_table_clerk.sql`
3. **Ejecuta el script** (Run o `Ctrl+Enter`)
4. **Verifica** que no haya errores

Este script actualiza las políticas de seguridad para trabajar con Clerk en lugar de Supabase Auth.

---

## 🔐 Seguridad (RLS)

La tabla tiene **Row Level Security (RLS)** habilitado con las siguientes políticas:

- ✅ Los usuarios solo pueden ver sus propios ejercicios
- ✅ Los usuarios solo pueden crear sus propios ejercicios
- ✅ Los usuarios solo pueden actualizar sus propios ejercicios
- ✅ Los usuarios solo pueden eliminar sus propios ejercicios

**Nota importante:** El `user_id` se obtiene de Clerk (`user.id`), no de Supabase Auth.

---

## ✅ Paso 2: Verificar la Tabla

1. **Ve a "Table Editor"** en Supabase
2. **Busca la tabla `exercises`**
3. **Verifica que tenga todos los campos**

---

## 🧪 Paso 3: Probar la App

### Actividades con GPS:

1. Abre la app
2. Ve a "Ejercicio" → "Añadir ejercicio"
3. Selecciona "Empezar a monitorizar"
4. Elige una actividad (Correr, Caminar, etc.)
5. Acepta permisos de ubicación
6. **Sal a la calle y muévete**
7. Detén la actividad
8. Verifica que se guardó en Supabase

### Actividades manuales:

1. Abre la app
2. Ve a "Ejercicio" → "Añadir ejercicio"
3. Selecciona "Registrar una actividad"
4. Elige una actividad (Pesas, Calistenia, etc.)
5. Llena el formulario
6. Guarda
7. Verifica que se guardó en Supabase

---

## 📊 Calendario de Ejercicios

Después de guardar actividades:

- ✅ Los días con ejercicio se marcarán en el calendario
- ✅ En **vista semanal**: barras verdes en los días con actividad
- ✅ En **vista mensual**: círculos verdes en los días con actividad

---

## 🔍 Consultas útiles

### Ver todos los ejercicios de un usuario:

```sql
SELECT * FROM exercises
WHERE user_id = 'TU_USER_ID'
ORDER BY date DESC;
```

### Ver ejercicios del mes actual:

```sql
SELECT * FROM exercises
WHERE user_id = 'TU_USER_ID'
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
  AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY date DESC;
```

### Contar ejercicios por tipo:

```sql
SELECT activity_name, COUNT(*) as total
FROM exercises
WHERE user_id = 'TU_USER_ID'
GROUP BY activity_name
ORDER BY total DESC;
```

---

## 🐛 Troubleshooting

### Problema: "No se pudo guardar el ejercicio"

**Solución:**

1. Verifica que la tabla `exercises` existe en Supabase
2. Verifica que RLS está habilitado
3. Verifica las políticas de seguridad
4. Verifica que el `user_id` sea correcto

### Problema: "No se muestran los días con ejercicio"

**Solución:**

1. Verifica que los ejercicios se guardaron correctamente en Supabase
2. Abre la consola y busca errores
3. Verifica que el formato de fecha sea correcto (YYYY-MM-DD)

### Problema: "TypeError: user.id is undefined"

**Solución:**

1. Verifica que estás autenticado con Clerk
2. Verifica que `useUser()` retorna un usuario válido
3. Revisa la consola para ver el estado de autenticación

---

## 📝 Archivos Creados

1. `src/services/exerciseService.ts` - Servicio para manejar ejercicios
2. `supabase_exercises_table.sql` - Script SQL para crear la tabla
3. `SUPABASE_SETUP_EJERCICIOS.md` - Esta guía

---

## 🎯 Próximos Pasos Opcionales

- [ ] Agregar estadísticas de ejercicio en el dashboard
- [ ] Mostrar historial de actividades con detalles
- [ ] Agregar gráficas de progreso
- [ ] Exportar datos a CSV
- [ ] Agregar metas semanales/mensuales
- [ ] Integrar con Apple Health / Google Fit

---

¡Listo! Ahora tu app puede guardar y mostrar actividades de ejercicio 🎉
