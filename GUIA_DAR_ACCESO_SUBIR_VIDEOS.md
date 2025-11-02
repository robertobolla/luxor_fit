# 🎥 Guía: Dar Acceso para Subir Videos

## ✅ Confirmación

**Sí, es la base de datos de producción** (`fseyophzvhafjywyufsa.supabase.co`):
- ✅ Todos los cambios (videos, usuarios, datos) quedan en producción
- ✅ La app móvil usa la misma base de datos
- ✅ Los videos subidos estarán disponibles para todos los usuarios

---

## 🔑 Opciones para Dar Acceso

### Opción 1: Acceso Completo al Admin Dashboard (Recomendado)

**Para usuarios que necesitan gestionar todo:**

1. **Crea un usuario en Clerk** (o usa uno existente)
2. **Agrega como Admin o Socio** desde:
   - Admin Dashboard → Configuración → Agregar Administrador
   - O ejecuta SQL directamente:
   ```sql
   INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
   VALUES (
     'user_id_de_clerk_aqui',
     'email@ejemplo.com',
     'admin', -- o 'socio'
     'Nombre del Usuario',
     true
   );
   ```
3. **Acceso completo a:**
   - Subir videos en "Ejercicios"
   - Gestionar usuarios, empresarios, socios
   - Ver estadísticas y pagos

---

### Opción 2: Solo Acceso para Subir Videos (NO DISPONIBLE)

**⚠️ IMPORTANTE:** Solo los **administradores** pueden subir videos de ejercicios.

Los socios y otros roles **NO** tienen acceso a la funcionalidad de subir videos por razones de control de calidad y seguridad del contenido.

---

### Opción 3: Usar el Admin Dashboard con Rol Específico

**Mejor solución para Clerk:**

1. **Crea un rol "video_uploader"** o usa "socio"
2. **Agrega al usuario** en `admin_roles` con `role_type = 'socio'`
3. **Acceso al dashboard**:
   - Puede ver/seleccionar pestañas según su rol
   - Puede subir videos desde "Ejercicios"

---

## 📋 Pasos Recomendados (Opción 1)

### Paso 1: Registrar el Usuario en Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. **Users** → **Create User**
3. Ingresa email del usuario
4. Copia el `user_id` generado (ej: `user_xxxxx...`)

### Paso 2: Agregar como Socio/Admin

**Desde Admin Dashboard:**
1. Inicia sesión como admin en `admin.luxorfitnessapp.com`
2. Ve a **Configuración**
3. Busca el usuario por email
4. Selecciona rol: **Admin** o **Socio**
5. Haz clic en **Agregar**

**O desde SQL:**
```sql
INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
VALUES (
  'user_id_de_clerk',
  'usuario@ejemplo.com',
  'socio', -- o 'admin'
  'Nombre del Usuario',
  true
);
```

### Paso 3: Notificar al Usuario

El usuario puede:
1. Ir a `admin.luxorfitnessapp.com`
2. Iniciar sesión con su email (si no tiene cuenta, crearla primero)
3. Acceder a la pestaña **Ejercicios**
4. Buscar un ejercicio y subir videos

---

## 🔒 Permisos por Rol

| Rol | Puede subir videos | Puede ver usuarios | Puede ver pagos | Puede gestionar empresarios |
|-----|-------------------|-------------------|-----------------|----------------------------|
| **admin** | ✅ | ✅ | ✅ | ✅ |
| **socio** | ❌ | ✅ | ✅ | ❌ |
| **empresario** | ❌ | Solo sus usuarios | Solo sus usuarios | ❌ |
| **user** | ❌ | ❌ | ❌ | ❌ |

**Nota:** Solo los **administradores** pueden subir videos de ejercicios.

---

## ✅ Verificación

1. **Verifica que el usuario tiene acceso:**
   ```sql
   SELECT user_id, email, role_type, is_active
   FROM admin_roles
   WHERE email = 'usuario@ejemplo.com';
   ```

2. **Prueba subir un video:**
   - Inicia sesión como el nuevo usuario en `admin.luxorfitnessapp.com`
   - Ve a **Ejercicios**
   - Busca "Press de banca"
   - Haz clic en subir video
   - Selecciona un archivo

3. **Verifica en la app móvil:**
   - Abre la app
   - Ve a un entrenamiento
   - Haz clic en el botón de video de un ejercicio
   - El video debería reproducirse

---

## 📝 Notas Importantes

- ⚠️ **Todos los videos subidos quedan en producción** y serán visibles para todos los usuarios
- ⚠️ **Usa el mismo proyecto de Supabase** para desarrollo y producción, o configura variables de entorno diferentes
- ✅ **Los videos son públicos** (cualquiera puede verlos), pero solo admins/socios pueden subirlos si usas la política restringida
- 💾 **Espacio de Storage**: Revisa el uso de Storage en Supabase Dashboard

---

## 🆘 Troubleshooting

### El usuario no puede subir videos

1. **Verifica el rol:**
   ```sql
   SELECT * FROM admin_roles WHERE email = 'usuario@ejemplo.com';
   ```

2. **Verifica que `is_active = true`**

3. **Verifica el bucket existe:**
   - Supabase Dashboard → Storage
   - Debe existir `exercise-videos`

4. **Verifica políticas de Storage:**
   - Storage → Policies
   - Debe existir política de INSERT

### El video no aparece en la app

1. **Verifica que se guardó en la BD:**
   ```sql
   SELECT * FROM exercise_videos 
   WHERE canonical_name = 'nombre_del_ejercicio';
   ```

2. **Verifica la URL del video:**
   - Debe ser una URL pública de Supabase Storage

3. **Revisa los logs de la app** para errores al cargar videos

---

**¡Listo!** Ahora puedes dar acceso a otros usuarios para subir videos en producción.

