# 🚀 Desplegar Admin Dashboard en Subdominio de Hostinger

## 📋 Configurar Subdominio en Hostinger

### Paso 1: Crear el Subdominio

1. **Ve a hPanel de Hostinger:**
   - [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Inicia sesión

2. **Ve a Dominios → Subdominios:**
   - Busca **"Subdomains"** o **"Subdominios"**
   - O ve a **"Advanced"** → **"Subdomains"**

3. **Crear nuevo subdominio:**
   - **Nombre del subdominio:** `admin`
   - **Dominio principal:** `luxorfitnessapp.com`
   - **Carpeta del documento raíz:** `public_html/admin` (o `/admin`)
   - Haz clic en **"Create"** o **"Crear"**

4. **Espera a que se cree** (puede tardar unos minutos)

---

## 🔨 Crear Build del Admin Dashboard

### Paso 1: Instalar Dependencias (Si No Están Instaladas)

```bash
cd admin-dashboard
npm install
```

### Paso 2: Verificar Variables de Entorno

Asegúrate de tener un archivo `.env` en `admin-dashboard/` con:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_... (modo Live)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Paso 3: Crear Build

```bash
npm run build
```

Esto creará la carpeta `dist/` con los archivos listos para desplegar.

---

## 📤 Subir Archivos a Hostinger

### Paso 1: Acceder a File Manager

1. En hPanel → **"File Manager"** o **"Gestor de Archivos"**

### Paso 2: Navegar a la Carpeta del Subdominio

**Opción A: Si el subdominio está en carpeta separada:**
- Ve a: `public_html/admin/`

**Opción B: Si Hostinger creó carpeta automáticamente:**
- Puede estar en: `admin/` (nivel raíz)
- O: `public_html/admin.luxorfitnessapp.com/`

**Nota:** Si no estás seguro, busca la carpeta que coincide con el nombre del subdominio.

### Paso 3: Limpiar Carpeta (Si Tiene Contenido)

- Elimina cualquier archivo por defecto (index.html, etc.)

### Paso 4: Subir Archivos del Build

Desde `admin-dashboard/dist/`, sube:

1. **`index.html`** - Archivo principal
2. **Carpeta `assets/`** completa - CSS y JS compilados

**Estructura final debe ser:**
```
admin/ (o public_html/admin/)
├── index.html
└── assets/
    ├── index-XXXXX.css
    └── index-XXXXX.js
```

---

## 🔧 Configurar HTTPS para el Subdominio

1. En hPanel → **"SSL"** o **"SSL/TLS"**
2. Busca el subdominio `admin.luxorfitnessapp.com`
3. Activa **"Let's Encrypt SSL"** o **"Auto SSL"**
4. Espera unos minutos para que se active

---

## ✅ Verificar que Funcione

1. **Abre en el navegador:**
   - `https://admin.luxorfitnessapp.com`

2. **Verifica:**
   - ✅ La página carga correctamente
   - ✅ El login de Clerk funciona
   - ✅ Puedes iniciar sesión
   - ✅ El dashboard se muestra correctamente

---

## 🔄 Actualizar el Dashboard

Cada vez que hagas cambios:

1. **Edita los archivos en `admin-dashboard/src/`**
2. **Crea nuevo build:**
   ```bash
   cd admin-dashboard
   npm run build
   ```
3. **Sube los archivos nuevos** de `dist/` a la carpeta del subdominio en Hostinger

---

## ⚠️ Importante: Variables de Entorno

El admin dashboard necesita estas variables en **producción**:

### Opción 1: Build Time (Recomendado)

Las variables `VITE_*` se compilan en el build, así que:

1. **Asegúrate de tener `.env` antes de hacer build:**
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

2. **Crea el build:**
   ```bash
   npm run build
   ```

3. **Las variables ya están incluidas** en el build

### Opción 2: Configurar en Hostinger (Avanzado)

Si necesitas cambiar variables sin hacer rebuild, puedes usar variables de entorno del servidor, pero esto es más complejo y generalmente no es necesario.

---

## 📝 Checklist Final

- [ ] Subdominio `admin.luxorfitnessapp.com` creado en Hostinger
- [ ] Variables de entorno configuradas en `.env`
- [ ] Build creado (`npm run build`)
- [ ] Archivos subidos a la carpeta del subdominio
- [ ] SSL/HTTPS activado para el subdominio
- [ ] Dashboard carga correctamente
- [ ] Login funciona
- [ ] Todas las páginas del dashboard funcionan

---

## 🆘 Troubleshooting

### Si el subdominio no carga:

1. **Verifica que el subdominio esté configurado:**
   - hPanel → Subdomains → Debe aparecer `admin.luxorfitnessapp.com`

2. **Verifica la carpeta:**
   - El subdominio debe apuntar a la carpeta donde subiste los archivos

3. **Espera propagación DNS:**
   - Puede tardar hasta 24 horas, pero generalmente es inmediato

### Si el dashboard no carga:

1. **Revisa la consola del navegador (F12):**
   - Busca errores de carga de archivos
   - Verifica que las rutas de `assets/` sean correctas

2. **Verifica que `index.html` esté en la raíz:**
   - No debe estar en una subcarpeta

---

¡Listo para desplegar! 🚀

