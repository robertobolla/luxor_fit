# FitMind Admin Dashboard

Dashboard web de administración para FitMind. Permite a administradores y socios ver información de usuarios, estadísticas y gestionar la aplicación.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
cd admin-dashboard
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Configurar Base de Datos

Ejecuta el SQL en Supabase:

1. `supabase_admin_roles.sql` - Crea tabla de roles y vistas

2. Agrega tu usuario como admin:

```sql
INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
VALUES ('tu_user_id_de_clerk', 'tu@email.com', 'admin', 'Tu Nombre', true);
```

### 4. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

El dashboard estará disponible en `http://localhost:3001`

### 5. Build para Producción

```bash
npm run build
```

Los archivos estarán en `dist/`. Puedes desplegar esto en:
- Vercel
- Netlify
- Supabase Hosting
- Cualquier servicio de hosting estático

## 📋 Características

- ✅ **Autenticación con Clerk** - Mismo sistema que la app móvil
- ✅ **Verificación de Roles** - Solo admins y socios pueden acceder
- ✅ **Dashboard Principal** - Estadísticas generales
- ✅ **Lista de Usuarios** - Ver todos los usuarios con paginación
- ✅ **Detalles de Usuario** - Información completa de cada usuario
- ✅ **Estadísticas Detalladas** - Métricas y análisis
- ✅ **Búsqueda de Usuarios** - Por nombre o email

## 🔐 Roles

### Admin
- Acceso completo al dashboard
- Puede ver todos los usuarios
- Puede gestionar roles (futuro)
- Acceso a todas las estadísticas

### Socio
- Acceso al dashboard
- Puede ver usuarios
- Puede ver estadísticas
- No puede gestionar roles

## 📁 Estructura

```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Layout principal con sidebar
│   │   └── Layout.css
│   ├── pages/
│   │   ├── Dashboard.tsx       # Página principal
│   │   ├── Users.tsx            # Lista de usuarios
│   │   ├── UserDetail.tsx       # Detalles de usuario
│   │   ├── Stats.tsx            # Estadísticas
│   │   └── Settings.tsx         # Configuración
│   ├── services/
│   │   └── adminService.ts      # Servicios de Supabase
│   ├── App.tsx                  # Componente principal
│   ├── main.tsx                 # Entry point
│   └── index.css                # Estilos globales
├── package.json
├── vite.config.ts
└── index.html
```

## 🔧 Desarrollo

### Agregar Nuevas Páginas

1. Crea el componente en `src/pages/`
2. Agrega la ruta en `src/App.tsx`
3. Agrega el item de navegación en `src/components/Layout.tsx`

### Agregar Nuevas Funciones

Agrega funciones en `src/services/adminService.ts` para interactuar con Supabase.

## 📝 Notas

- El dashboard usa las mismas credenciales de Clerk que la app móvil
- Los roles se gestionan directamente en Supabase (tabla `admin_roles`)
- Las estadísticas vienen de la vista `user_stats` en Supabase

## 🚢 Despliegue

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Sube la carpeta dist/ a Netlify
```

### Supabase Hosting

```bash
npm run build
# Usa Supabase CLI para desplegar
```

