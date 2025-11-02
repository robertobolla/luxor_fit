# 🔧 Cómo Configurar las Variables de Entorno

## 📝 Paso a Paso

### Paso 1: Crear el archivo .env

1. Ve a la carpeta `admin-dashboard/`
2. Crea un nuevo archivo llamado `.env` (sin extensión)
3. Puedes hacerlo desde tu editor de código o desde la terminal:

**Opción A: Desde el editor de código**
- Clic derecho en la carpeta `admin-dashboard/` → "New File"
- Nombra el archivo `.env`

**Opción B: Desde la terminal**
```bash
cd admin-dashboard
touch .env
# O en Windows:
type nul > .env
```

### Paso 2: Agregar las Variables

Abre el archivo `.env` y agrega estas líneas:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Paso 3: Obtener los Valores

#### 🔑 VITE_CLERK_PUBLISHABLE_KEY

**Dónde obtenerla:**
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Selecciona tu aplicación de FitMind
3. En el menú lateral, ve a **API Keys**
4. Copia la **Publishable Key** (la que empieza con `pk_test_` o `pk_live_`)

**Ejemplo:**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_abcdefghijklmnopqrstuvwxyz1234567890
```

#### 🗄️ VITE_SUPABASE_URL

**Dónde obtenerla:**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **Project URL**, copia la URL completa

**Ejemplo:**
```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

#### 🔐 VITE_SUPABASE_ANON_KEY

**Dónde obtenerla:**
1. En la misma página de Supabase (Settings → API)
2. En la sección **Project API keys**
3. Copia la clave **anon/public** (la que empieza con `eyJ...`)

**Ejemplo:**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

### Paso 4: Archivo .env Completo

Tu archivo `.env` debería verse así:

```env
# Clerk Authentication (misma que la app móvil, pero sin EXPO_PUBLIC_)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_tu_clave_de_clerk_aqui

# Supabase (mismas que la app móvil, pero sin EXPO_PUBLIC_)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJtu_clave_de_supabase_aqui
```

### Paso 5: Verificar

1. Guarda el archivo `.env`
2. Reinicia el servidor de desarrollo si está corriendo:
   ```bash
   # Detén el servidor (Ctrl+C)
   # Luego inicia de nuevo:
   npm run dev
   ```

### Paso 6: Probar

Si todo está configurado correctamente:
- El dashboard debería cargar sin errores
- Deberías poder iniciar sesión con Clerk
- Si tienes rol de admin, deberías ver el dashboard

---

## ⚠️ Notas Importantes

### Diferencia con la App Móvil

- **App móvil usa:** `EXPO_PUBLIC_...`
- **Dashboard usa:** `VITE_...`

**Pero los valores son los mismos!** Solo cambia el prefijo.

Por ejemplo:
- App móvil: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- Dashboard: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

Ambos usan la **misma clave** de Clerk, solo que con prefijos diferentes.

### Seguridad

✅ **El archivo `.env` ya está en `.gitignore`** - No se subirá a Git
✅ **NO compartas tu archivo `.env`** con nadie
✅ **Las claves son secretas** - Manténlas privadas

---

## 🐛 Solución de Problemas

### Error: "VITE_CLERK_PUBLISHABLE_KEY is not defined"

**Solución:**
1. Verifica que el archivo `.env` está en `admin-dashboard/` (no en la raíz del proyecto)
2. Verifica que el nombre de la variable es exactamente `VITE_CLERK_PUBLISHABLE_KEY`
3. Reinicia el servidor con `npm run dev`

### Error: "Cannot connect to Supabase"

**Solución:**
1. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están correctas
2. Verifica que copiaste las claves completas (sin cortar caracteres)
3. Verifica que no hay espacios antes o después de los valores

### Las variables no se cargan

**Solución:**
1. Cierra el servidor (Ctrl+C)
2. Elimina `node_modules/.vite/` si existe (caché)
3. Reinicia: `npm run dev`

---

## 📋 Checklist

- [ ] Archivo `.env` creado en `admin-dashboard/`
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` agregada (desde Clerk Dashboard)
- [ ] `VITE_SUPABASE_URL` agregada (desde Supabase Dashboard)
- [ ] `VITE_SUPABASE_ANON_KEY` agregada (desde Supabase Dashboard)
- [ ] Archivo guardado
- [ ] Servidor reiniciado
- [ ] Dashboard carga sin errores

---

**¡Listo!** Una vez configurado, el dashboard debería funcionar correctamente. 🎉

