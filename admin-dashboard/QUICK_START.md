# 🚀 Inicio Rápido - Dashboard Admin

## Pasos para Configurar

### 1. Instalar Dependencias

```bash
cd admin-dashboard
npm install
```

### 2. Crear Archivo .env

Crea `.env` con:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Ejecutar SQL en Supabase

Ejecuta `supabase_admin_roles.sql` en Supabase SQL Editor.

### 4. Agregar Tu Usuario como Admin

En Supabase → Table Editor → `admin_roles` → Insert row:

- `user_id`: Tu ID de Clerk
- `email`: Tu email
- `role_type`: `admin`
- `name`: Tu nombre
- `is_active`: `true`

### 5. Iniciar Dashboard

```bash
npm run dev
```

Abre `http://localhost:3001` en tu navegador.

¡Listo! 🎉

