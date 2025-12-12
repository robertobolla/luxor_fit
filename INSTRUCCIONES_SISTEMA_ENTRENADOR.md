# Sistema de Modo Entrenador - Instrucciones de Configuración

## 📋 Resumen
Se ha implementado un sistema completo de **Modo Entrenador** que permite a los entrenadores gestionar a sus alumnos, ver sus estadísticas, editar sus rutinas y chatear con ellos.

## 🗄️ Paso 1: Configurar Base de Datos

Ejecuta el siguiente script SQL en Supabase para crear las tablas y funciones necesarias:

```bash
# Ejecutar en el SQL Editor de Supabase
supabase_trainer_system.sql
```

Este script crea:
- ✅ Tabla `trainer_student_relationships` - Relaciones entre entrenadores y alumnos
- ✅ Tabla `trainer_permissions` - Permisos específicos por relación
- ✅ Políticas RLS para seguridad
- ✅ Funciones RPC para:
  - `send_trainer_invitation` - Enviar invitación a alumno
  - `respond_to_trainer_invitation` - Aceptar/rechazar invitación
  - `get_student_stats` - Obtener estadísticas del alumno
- ✅ Vista `trainer_students_view` - Vista con información completa de alumnos

## 📱 Paso 2: Verificar Archivos Creados

Se han creado los siguientes archivos:

### Base de Datos
- `supabase_trainer_system.sql` - Script SQL completo

### Servicios
- `src/services/trainerService.ts` - Servicio para gestión de entrenador-alumno

### Hooks
- `src/hooks/useTrainerNotifications.ts` - Hook para notificaciones en tiempo real

### Pantallas
- `app/trainer-mode.tsx` - Pantalla principal del modo entrenador
- `app/trainer-student-detail.tsx` - Pantalla de detalle de alumno con estadísticas
- `app/trainer-invitations.tsx` - Pantalla para que alumnos vean y respondan invitaciones

### Modificaciones
- `app/(tabs)/workout.tsx` - Agregado botón "Modo Entrenador"

## 🚀 Paso 3: Activar Hook de Notificaciones (OPCIONAL)

Para recibir notificaciones en tiempo real, agrega el hook a tu `App.tsx` o `_layout.tsx` principal:

```typescript
import { useTrainerNotifications } from '@/src/hooks/useTrainerNotifications';

export default function RootLayout() {
  // Activar notificaciones de entrenador
  useTrainerNotifications();
  
  // ... resto del código
}
```

## 🎯 Funcionalidades Implementadas

### Para Entrenadores:
1. ✅ **Botón "Modo Entrenador"** - En la pestaña Entrenar, debajo del botón Generar
2. ✅ **Pantalla Modo Entrenador**:
   - Lista de todos los alumnos actuales
   - Botón "Agregar Nuevo Alumno"
   - Búsqueda por nombre de usuario
   - Envío de invitación automática
   - Chat directo con alumnos (integrado con sistema de amigos)

3. ✅ **Estadísticas de Alumnos**:
   - 🏋️ Plan de entrenamiento activo
   - 📊 Entrenamientos completados
   - 📏 Métricas corporales (peso, grasa, músculo)
   - 🍎 Estadísticas de nutrición (últimos 7 días)
   - 👟 Pasos y actividad diaria

4. ✅ **Edición de Rutinas**:
   - Acceso directo al plan activo del alumno
   - Capacidad de editar el plan

5. ✅ **Integración con Chat**:
   - Al enviar invitación, se crea solicitud de amistad automáticamente
   - Cuando alumno acepta, se acepta amistad automáticamente
   - Botón directo para chatear con cada alumno

### Para Alumnos:
1. ✅ **Pantalla de Invitaciones**:
   - Ver invitaciones pendientes de entrenadores
   - Aceptar o rechazar invitaciones
   - Información del entrenador

2. ✅ **Permisos**:
   - Los alumnos pueden controlar qué puede ver el entrenador
   - Permisos por defecto (todos activados):
     - Ver entrenamientos ✅
     - Editar entrenamientos ✅
     - Ver nutrición ✅
     - Ver pasos ✅
     - Ver métricas corporales ✅
     - Ver fotos de progreso ❌ (desactivado por defecto)

## 🔐 Seguridad

- ✅ **RLS (Row Level Security)** activado en todas las tablas
- ✅ Los entrenadores solo pueden ver datos de sus alumnos aceptados
- ✅ Los alumnos controlan sus permisos
- ✅ Las funciones RPC usan `SECURITY DEFINER` para operaciones seguras
- ✅ Verificación de permisos en todas las consultas

## 🔔 Notificaciones en Tiempo Real

El sistema incluye suscripciones a Realtime para:
- 📧 Nuevas invitaciones de entrenador (para alumnos)
- ✅ Invitaciones aceptadas (para entrenadores)
- ❌ Invitaciones rechazadas (para entrenadores)

## 📊 Flujo de Uso

### Como Entrenador:
1. Ir a pestaña "Entrenar"
2. Hacer clic en "Modo Entrenador"
3. Hacer clic en "Agregar Nuevo Alumno"
4. Buscar por nombre de usuario
5. Enviar invitación
6. Esperar a que el alumno acepte
7. Ver estadísticas y gestionar entrenamientos

### Como Alumno:
1. Recibir notificación de invitación
2. Ir a pantalla de invitaciones (o agregar en perfil)
3. Revisar información del entrenador
4. Aceptar o rechazar
5. Si acepta, el entrenador tiene acceso a tus datos
6. Chatear con tu entrenador como amigo

## 🎨 Diseño

- Colores consistentes con el tema de la app (#ffb300 amarillo, #1a1a1a fondo oscuro)
- Cards con bordes redondeados
- Iconos de Ionicons
- Animaciones suaves
- Estados de carga
- Mensajes de error informativos

## 📝 Próximas Mejoras Sugeridas

1. **Pantalla de configuración de permisos** - Para que alumnos personalicen qué ve su entrenador
2. **Gráficas de progreso** - Visualización de evolución en el tiempo
3. **Mensajes predefinidos** - Templates de mensajes para entrenadores
4. **Planes compartidos** - Que entrenadores puedan crear y asignar planes
5. **Sistema de pagos** - Para entrenadores que cobran por sus servicios
6. **Calendario de sesiones** - Agendar entrenamientos con alumnos
7. **Exportar reportes** - PDF con estadísticas del alumno

## 🐛 Troubleshooting

### Error: "No tienes permiso para ver estos datos"
- Verificar que la relación está en estado 'accepted'
- Verificar que las políticas RLS están activas
- Verificar que el user_id es correcto

### No aparecen alumnos en Modo Entrenador
- Verificar que las invitaciones fueron aceptadas
- Verificar que la vista `trainer_students_view` existe
- Verificar los logs de la consola

### Error al enviar invitación
- Verificar que el nombre de usuario existe
- Verificar que no existe una relación previa
- Verificar que la función RPC `send_trainer_invitation` existe

## 📚 Recursos Adicionales

- [Documentación de Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentación de Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Expo Router](https://docs.expo.dev/router/introduction/)

## ✅ Checklist de Implementación

- [x] Crear tablas SQL
- [x] Crear funciones RPC
- [x] Configurar RLS
- [x] Crear servicio TypeScript
- [x] Crear pantalla Modo Entrenador
- [x] Crear pantalla detalle de alumno
- [x] Crear pantalla de invitaciones
- [x] Agregar botón en pestaña Entrenar
- [x] Integrar con sistema de amigos
- [x] Implementar notificaciones en tiempo real
- [x] Documentar el sistema

## 🎉 ¡Listo!

El sistema de Modo Entrenador está completamente implementado y listo para usar. Solo ejecuta el script SQL en Supabase y la funcionalidad estará disponible en la app.

