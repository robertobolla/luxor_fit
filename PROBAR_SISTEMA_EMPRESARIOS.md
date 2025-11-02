# 🧪 Guía para Probar el Sistema de Empresarios

## Paso 1: Ejecutar el SQL en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo `supabase_empresarios_system.sql`
5. Copia y pega todo el contenido en el editor SQL
6. Haz clic en **Run** (o presiona `Ctrl+Enter`)
7. Verifica que no haya errores (debe aparecer "Success")

---

## Paso 2: Verificar que el Usuario de Prueba Existe en Clerk

**Necesitas tener un usuario en Clerk que será el empresario:**

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu aplicación
3. Ve a **Users**
4. **Opción A**: Usa un usuario existente y copia su `User ID` (empieza con `user_`)
5. **Opción B**: Crea un nuevo usuario de prueba y copia su `User ID`

**⚠️ Importante:** Anota el `User ID` porque lo necesitarás en el siguiente paso.

---

## Paso 3: Crear un Empresario desde el Admin Dashboard

1. **Inicia el admin dashboard:**
   ```bash
   cd admin-dashboard
   npm run dev
   ```

2. **Inicia sesión** con una cuenta de **admin**

3. Ve a **"Empresarios"** en el menú lateral (🏢)

4. Haz clic en **"+ Agregar Empresario"**

5. **Completa el formulario:**
   - **User ID (Clerk)**: Pega el `User ID` del usuario de Clerk que será empresario
   - **Email**: Email del empresario
   - **Nombre**: Nombre del empresario (opcional)
   - **Nombre del Gimnasio**: Ej. "Gimnasio XYZ"
   - **Tarifa Mensual ($)**: Ej. `500.00`
   - **Límite de Usuarios**: Ej. `100` (opcional, déjalo vacío para sin límite)
   - **Dirección**: Dirección del gimnasio (opcional)
   - **Teléfono**: Teléfono (opcional)
   - **Email de Contacto**: Email adicional (opcional)

6. Haz clic en **"Crear Empresario"**

7. Deberías ver una tarjeta con el nuevo empresario mostrando:
   - Nombre del gimnasio
   - Contacto
   - Tarifa mensual
   - 0 usuarios activos (inicialmente)

---

## Paso 4: Agregar Usuarios al Empresario

### Opción A: Desde el Admin Dashboard (usando usuarios existentes)

1. En la página de **"Empresarios"**, haz clic en **"Ver Usuarios"** del empresario creado

2. Haz clic en **"+ Agregar Usuario"**

3. **Busca un usuario existente:**
   - En el campo de búsqueda, escribe parte del nombre o email de un usuario
   - Haz clic en **"Buscar"**
   - Aparecerán usuarios que coincidan

4. **Agrega el usuario:**
   - Haz clic en **"Agregar"** junto al usuario que quieres agregar
   - El usuario será asociado al empresario

5. **Verifica que aparezca en la lista:**
   - El usuario debería aparecer con:
     - Nombre y email
     - Fecha de ingreso
     - Estado: "Activo"

---

## Paso 5: Verificar Acceso Gratuito del Usuario

1. **En la app móvil**, inicia sesión con el usuario que agregaste al empresario

2. **El usuario debería tener acceso completo** sin necesidad de suscripción

3. Puedes verificar esto de dos formas:

   **Forma 1: Revisar el código de suscripción**
   - El usuario NO debería ver el paywall
   - Debería poder acceder a todas las funciones

   **Forma 2: Verificar en la base de datos**
   - Ve a Supabase → Table Editor → `gym_members`
   - Busca el `user_id` del usuario
   - Verifica que `is_active = true` y que tiene un `empresario_id`

---

## Paso 6: Verificar Dashboard del Empresario

### Como Admin:

1. En el admin dashboard, ve a **"Empresarios"**
2. Deberías ver:
   - Lista de todos los empresarios
   - Estadísticas de cada uno (usuarios activos, total, etc.)
3. Haz clic en **"Ver Usuarios"** de cualquier empresario
4. Deberías ver la lista completa de usuarios de ese empresario

### Como Empresario:

1. **Inicia sesión en el admin dashboard** con la cuenta del empresario (el `User ID` que usaste)

2. **Deberías ver el menú específico para empresarios:**
   - Dashboard
   - Mis Usuarios 👥
   - Configuración

3. **Ve a "Mis Usuarios"**
4. Deberías ver:
   - Lista de TODOS los usuarios que agregaste
   - Información de cada usuario (nombre, email, edad, nivel, etc.)
   - Estado de suscripción
   - Si tienen plan de entrenamiento

5. **Prueba agregar un usuario:**
   - Haz clic en **"+ Agregar Usuario"**
   - Busca un usuario
   - Agrégalo al gimnasio

---

## Paso 7: Probar Remover un Usuario

1. En la página de usuarios del empresario, encuentra un usuario
2. Haz clic en **"Remover"** junto al usuario
3. Confirma la acción
4. El usuario debería:
   - Cambiar su estado a "Inactivo" en la tabla
   - **Perder el acceso gratuito** automáticamente

---

## ✅ Checklist de Pruebas

- [ ] SQL ejecutado sin errores en Supabase
- [ ] Empresario creado desde admin dashboard
- [ ] Usuario agregado al empresario
- [ ] Usuario tiene acceso gratuito en la app móvil
- [ ] Admin puede ver todos los empresarios y sus usuarios
- [ ] Empresario puede ver solo sus propios usuarios
- [ ] Empresario puede agregar usuarios
- [ ] Empresario puede remover usuarios
- [ ] Usuario removido pierde acceso gratuito

---

## 🔍 Verificación en Base de Datos

Puedes verificar manualmente ejecutando estas consultas en Supabase SQL Editor:

### Ver todos los empresarios:
```sql
SELECT * FROM admin_roles WHERE role_type = 'empresario';
```

### Ver estadísticas de empresarios:
```sql
SELECT * FROM empresario_stats;
```

### Ver usuarios de un empresario específico:
```sql
SELECT 
  gm.*,
  up.name,
  up.email
FROM gym_members gm
JOIN user_profiles up ON gm.user_id = up.user_id
WHERE gm.empresario_id = 'user_id_del_empresario';
```

### Verificar acceso de un usuario:
```sql
SELECT 
  gm.user_id,
  gm.is_active,
  ar.gym_name,
  vs.is_active as subscription_active,
  vs.is_gym_member
FROM gym_members gm
JOIN admin_roles ar ON gm.empresario_id = ar.user_id
LEFT JOIN v_user_subscription vs ON gm.user_id = vs.user_id
WHERE gm.user_id = 'user_id_del_usuario';
```

---

## ⚠️ Problemas Comunes

### Error: "User ID no encontrado"
- **Solución**: Verifica que el `User ID` de Clerk sea correcto y que el usuario exista

### Error: "Usuario ya pertenece a otro gimnasio"
- **Solución**: Un usuario solo puede pertenecer a un gimnasio a la vez. Primero remuévelo del gimnasio anterior

### El usuario no tiene acceso gratuito
- **Solución**: Verifica que `gym_members.is_active = true` y que el usuario esté correctamente asociado

### El empresario no ve sus usuarios
- **Solución**: Verifica que el empresario esté usando su propia cuenta (`user_id` correcto)

---

## 📝 Notas Importantes

1. **Un usuario solo puede pertenecer a un gimnasio** (constraint `unique_user_gym`)
2. **Los usuarios del gimnasio tienen acceso gratuito automáticamente** (verificado en `payments.ts`)
3. **El admin puede ver TODOS los empresarios y usuarios**
4. **El empresario solo ve SUS propios usuarios**
5. **Al remover un usuario**, se desactiva pero no se elimina (historial preservado)

---

¡Ya está todo listo para probar! Si encuentras algún problema, avísame y lo solucionamos. 🚀

