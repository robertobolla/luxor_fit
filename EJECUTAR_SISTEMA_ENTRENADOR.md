# Pasos para Activar el Sistema de Modo Entrenador

## ⚡ Pasos Rápidos

### 1. Ejecutar Script SQL en Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Crea un nuevo query
4. Copia y pega el contenido del archivo `supabase_trainer_system.sql`
5. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)
6. Espera a que termine la ejecución (debería decir "Success")

### 2. Verificar que las Tablas se Crearon

En el SQL Editor, ejecuta:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trainer_student_relationships', 'trainer_permissions');

-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('send_trainer_invitation', 'respond_to_trainer_invitation', 'get_student_stats');

-- Verificar vista
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'trainer_students_view';
```

Deberías ver:
- ✅ `trainer_student_relationships`
- ✅ `trainer_permissions`
- ✅ `send_trainer_invitation`
- ✅ `respond_to_trainer_invitation`
- ✅ `get_student_stats`
- ✅ `trainer_students_view`

### 3. (Opcional) Activar Notificaciones en Tiempo Real

Abre el archivo principal de tu app (por ejemplo `App.tsx` o `app/_layout.tsx`) y agrega:

```typescript
import { useTrainerNotifications } from '@/src/hooks/useTrainerNotifications';

// Dentro del componente principal
export default function RootLayout() {
  useTrainerNotifications(); // Activar notificaciones
  
  return (
    // ... tu código existente
  );
}
```

### 4. Probar la Funcionalidad

#### Como Entrenador:
1. Abre la app
2. Ve a la pestaña **"Entrenar"**
3. Deberías ver el botón **"Modo Entrenador"** debajo del botón "Generar"
4. Haz clic en **"Modo Entrenador"**
5. Haz clic en **"Agregar Nuevo Alumno"**
6. Busca a un usuario por su nombre de usuario (username)
7. Envía la invitación

#### Como Alumno (Usuario que recibe la invitación):
1. La app mostrará una notificación de invitación
2. Ve a la pantalla de invitaciones (puedes agregar un botón en el perfil o usar `/trainer-invitations`)
3. Acepta o rechaza la invitación

#### Verificar Estadísticas:
1. Como entrenador, regresa a "Modo Entrenador"
2. Deberías ver al alumno en la lista
3. Haz clic en **"Ver Estadísticas"**
4. Verás todas las métricas del alumno

## 🔍 Verificación de Datos de Prueba

Puedes insertar datos de prueba para verificar el sistema:

```sql
-- Insertar una relación de prueba (reemplaza los USER_IDs con IDs reales de tu app)
INSERT INTO trainer_student_relationships (trainer_id, student_id, status, accepted_at)
VALUES ('user_trainer_id_aqui', 'user_student_id_aqui', 'accepted', NOW());

-- Obtener las relaciones activas
SELECT * FROM trainer_students_view;
```

## 🎯 Acceder a las Pantallas

Una vez configurado, las pantallas están en estas rutas:

- **Modo Entrenador**: `/trainer-mode`
- **Detalle de Alumno**: `/trainer-student-detail?studentId=xxx&studentName=xxx`
- **Invitaciones**: `/trainer-invitations`

## 📱 Agregar Botón de Invitaciones en el Perfil (Opcional)

Si quieres que los usuarios puedan ver sus invitaciones desde el perfil, agrega en `app/(tabs)/profile.tsx`:

```typescript
<TouchableOpacity
  style={styles.menuItem}
  onPress={() => router.push('/trainer-invitations')}
>
  <Ionicons name="mail" size={24} color="#ffb300" />
  <Text style={styles.menuItemText}>Invitaciones de Entrenador</Text>
  <Ionicons name="chevron-forward" size={24} color="#666" />
</TouchableOpacity>
```

## ✅ Checklist Final

- [ ] Script SQL ejecutado en Supabase
- [ ] Tablas verificadas
- [ ] Funciones RPC verificadas
- [ ] Vista creada
- [ ] Botón "Modo Entrenador" visible en pestaña Entrenar
- [ ] Prueba de envío de invitación exitosa
- [ ] Prueba de aceptación de invitación exitosa
- [ ] Prueba de visualización de estadísticas exitosa
- [ ] (Opcional) Hook de notificaciones activado
- [ ] (Opcional) Botón de invitaciones en perfil agregado

## 🆘 Soporte

Si encuentras algún error:

1. Revisa los logs de la consola de React Native
2. Revisa los logs de Supabase en la sección "Logs"
3. Verifica que las políticas RLS están activas
4. Verifica que los user_id son correctos (Clerk ID)

## 🎉 ¡Listo!

Una vez completados estos pasos, el sistema de Modo Entrenador estará completamente funcional.

