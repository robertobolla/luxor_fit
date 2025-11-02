# 🎛️ Dashboard de Administración - FitMind

Este documento explica cómo configurar y usar el dashboard web de administración para FitMind.

---

## 📋 Resumen

El dashboard web permite a **administradores** y **socios** ver información de usuarios, estadísticas y gestionar la aplicación desde un navegador.

---

## 🚀 Configuración Inicial

### Paso 1: Configurar Base de Datos

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta `supabase_admin_roles.sql`
3. Esto creará:
   - Tabla `admin_roles` para gestionar permisos
   - Funciones `is_admin_or_socio()` y `get_user_role()`
   - Vista `user_stats` para estadísticas

### Paso 2: Agregar Tu Usuario como Admin

**Opción A: Desde Supabase Dashboard**

1. Ve a **Table Editor** → `admin_roles`
2. Haz clic en **Insert row**
3. Completa:
   - `user_id`: Tu ID de Clerk (puedes obtenerlo desde la app móvil o Clerk Dashboard)
   - `email`: Tu email
   - `role_type`: `admin` (acceso completo) o `socio` (acceso limitado)
   - `name`: Tu nombre
   - `is_active`: `true`

**Opción B: Usando SQL**

```sql
INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
VALUES (
  'user_abc123...',  -- Tu ID de Clerk
  'tu@email.com',
  'admin',           -- o 'socio'
  'Tu Nombre',
  true
);
```

**Cómo obtener tu User ID de Clerk:**

1. Abre la app móvil
2. Ve a Profile
3. O desde Clerk Dashboard → Users → Selecciona tu usuario → Copia el ID

### Paso 3: Instalar Dashboard

```bash
cd admin-dashboard
npm install
```

### Paso 4: Configurar Variables de Entorno

Crea `.env` en `admin-dashboard/`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # Misma que la app móvil
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...        # Misma que la app móvil
```

### Paso 5: Iniciar Dashboard

```bash
npm run dev
```

Abre `http://localhost:3001` en tu navegador.

---

## 🔐 Autenticación

1. El dashboard usa **Clerk** (mismo sistema que la app móvil)
2. Inicia sesión con tu cuenta de Clerk
3. El sistema verificará si eres admin o socio
4. Si no tienes rol, verás "Acceso Denegado"

---

## 📊 Funcionalidades

### Dashboard Principal (`/`)
- Resumen general de estadísticas
- Total de usuarios
- Nuevos usuarios (7 y 30 días)
- Suscripciones activas
- Distribución por nivel de fitness

### Usuarios (`/users`)
- Lista completa de usuarios con paginación
- Búsqueda por nombre o email
- Ver detalles de cada usuario

### Detalles de Usuario (`/users/:userId`)
- Información personal completa
- Nivel de fitness
- Objetivos y preferencias
- Equipamiento disponible
- Metadata (fechas de registro)

### Estadísticas (`/stats`)
- Métricas detalladas
- Tasa de conversión de suscripciones
- Distribución por niveles
- Gráficos de progresión

### Configuración (`/settings`)
- Instrucciones para gestionar roles
- Información sobre tipos de roles

---

## 🔑 Roles y Permisos

### Admin (Administrador)
- ✅ Acceso completo al dashboard
- ✅ Ver todos los usuarios
- ✅ Ver todas las estadísticas
- ✅ Gestionar roles (futuro)

### Socio
- ✅ Acceso al dashboard
- ✅ Ver usuarios
- ✅ Ver estadísticas
- ❌ No puede gestionar roles

---

## 🚢 Desplegar a Producción

### Opción 1: Vercel (Recomendado)

```bash
npm install -g vercel
cd admin-dashboard
vercel
```

1. Crea cuenta en [Vercel](https://vercel.com)
2. Instala Vercel CLI: `npm i -g vercel`
3. En `admin-dashboard/`, ejecuta `vercel`
4. Agrega las variables de entorno en Vercel Dashboard

### Opción 2: Netlify

1. Crea cuenta en [Netlify](https://netlify.com)
2. Conecta tu repositorio
3. Configuración de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agrega variables de entorno

### Opción 3: Supabase Hosting

```bash
supabase hosting deploy admin-dashboard/dist
```

### Opción 4: Servidor Propio

```bash
npm run build
# Sube la carpeta dist/ a tu servidor web
```

---

## 📝 Agregar Nuevos Admins/Socios

### Desde Supabase Dashboard

1. Ve a **Table Editor** → `admin_roles`
2. **Insert row**
3. Completa los campos con el `user_id` de Clerk del nuevo usuario

### Usando SQL

```sql
INSERT INTO admin_roles (user_id, email, role_type, name, is_active, created_by)
VALUES (
  'user_id_nuevo_usuario',  -- ID de Clerk
  'nuevo@email.com',
  'socio',                   -- o 'admin'
  'Nombre del Socio',
  true,
  'tu_user_id'               -- Tu ID (quien lo crea)
);
```

---

## 🛠️ Desarrollo

### Agregar Nueva Página

1. Crea componente en `src/pages/NuevaPagina.tsx`
2. Agrega ruta en `src/App.tsx`:
   ```tsx
   <Route path="nueva" element={<NuevaPagina />} />
   ```
3. Agrega item en `src/components/Layout.tsx`:
   ```tsx
   { path: '/nueva', label: 'Nueva Página', icon: '📄' }
   ```

### Agregar Nueva Función de Supabase

Agrega en `src/services/adminService.ts`:

```typescript
export async function nuevaFuncion(): Promise<any> {
  const { data, error } = await supabase
    .from('tabla')
    .select('*');
  
  if (error) throw error;
  return data;
}
```

---

## 🔍 Troubleshooting

### "Acceso Denegado"
- Verifica que tu `user_id` esté en la tabla `admin_roles`
- Verifica que `is_active = true`
- Verifica que el `user_id` coincida exactamente con el de Clerk

### No se cargan usuarios
- Verifica las variables de entorno de Supabase
- Verifica que las políticas RLS permitan lectura
- Revisa la consola del navegador para errores

### Error de autenticación
- Verifica `VITE_CLERK_PUBLISHABLE_KEY`
- Asegúrate de usar la misma cuenta de Clerk que en la app móvil

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs en la consola del navegador
2. Verifica que todas las tablas existan en Supabase
3. Confirma que las variables de entorno estén configuradas correctamente

---

**¡Listo!** Ya tienes un dashboard web completo para administrar FitMind. 🎉

