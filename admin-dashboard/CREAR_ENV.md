# 🚀 Crear Archivo .env para Dashboard

## Instrucciones Rápidas

1. Ve a la carpeta `admin-dashboard/`
2. Crea un archivo llamado `.env` (sin extensión)
3. Copia y pega este contenido, reemplazando con tus valores:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZG12aW51LWdvYmxpbi000S5jbGVyay5hY2NvdW5
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Cómo obtener los valores

Si ya tienes un `.env` en la raíz del proyecto con `EXPO_PUBLIC_`, puedes usar los **mismos valores** pero cambiar el prefijo:

- Si tienes: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123`
- Usa: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_abc123` (mismo valor)

- Si tienes: `EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co`
- Usa: `VITE_SUPABASE_URL=https://xxx.supabase.co` (mismo valor)

- Si tienes: `EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...`
- Usa: `VITE_SUPABASE_ANON_KEY=eyJ...` (mismo valor)

## Ejemplo Completo

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZG12aW51LWdvYmxpbi000S5jbGVyay5hY2NvdW5
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZXlvcGh6dmhhZmp5d3l1ZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDE4NjE3MjAsImV4cCI6MjAxNzQzNzcyMH0.tu_clave_completa_aqui
```

