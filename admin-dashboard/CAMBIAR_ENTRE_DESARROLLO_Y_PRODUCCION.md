# 🔄 Cambiar entre Desarrollo y Producción

## 📋 Resumen

Para alternar entre desarrollo y producción, solo necesitas cambiar las variables en el archivo `.env` del admin dashboard.

---

## 🔧 Configuración para Desarrollo

### Paso 1: Crear/Editar el archivo .env

Ve a la carpeta `admin-dashboard/` y crea o edita el archivo `.env`:

```bash
cd admin-dashboard
```

### Paso 2: Configurar Variables de Desarrollo

Abre el archivo `.env` y configura las claves de **desarrollo**:

```env
# MODE: DESARROLLO (para localhost)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Nota importante:**
- `pk_test_...` = Clave de **desarrollo** (funciona en localhost)
- `pk_live_...` = Clave de **producción** (solo funciona en el dominio de producción)

### Paso 3: Obtener la Clave de Desarrollo de Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Selecciona tu aplicación
3. Si tienes una instancia de desarrollo, selecciónala (o crea una nueva)
4. Ve a **API Keys**
5. Copia la **Publishable Key** que empieza con `pk_test_`

### Paso 4: Reiniciar el Servidor

```bash
# Detén el servidor actual (Ctrl+C si está corriendo)
# Luego inicia:
npm run dev
```

### Paso 5: Verificar

1. Abre `http://localhost:3001` (o el puerto que uses)
2. Deberías ver en la consola del navegador:
   ```
   ✅ Clerk Publishable Key encontrada: pk_test_...
   ```
3. Si ves una advertencia sobre `pk_live_` en localhost, significa que aún estás usando la clave de producción.

---

## 🚀 Configuración para Producción

### Paso 1: Editar el archivo .env

Antes de hacer el build para producción, cambia a las claves de producción:

```env
# MODE: PRODUCCIÓN (para admin.luxorfitnessapp.com)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Nota:** Las claves de Supabase pueden ser las mismas para desarrollo y producción.

### Paso 2: Build para Producción

```bash
cd admin-dashboard
npm run build
```

### Paso 3: Subir a Hostinger

Sube los archivos de `dist/` a la carpeta del subdominio en Hostinger.

---

## 💡 Recomendación: Dos Archivos .env

Puedes tener dos archivos para facilitar el cambio:

### `.env.development`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### `.env.production`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Cambiar entre ellos:

**Para desarrollo:**
```bash
cp .env.development .env
npm run dev
```

**Para producción:**
```bash
cp .env.production .env
npm run build
```

---

## 📝 Diferencias Clave

| Aspecto | Desarrollo (`pk_test_`) | Producción (`pk_live_`) |
|---------|------------------------|-------------------------|
| **Clave Clerk** | `pk_test_...` | `pk_live_...` |
| **Dónde funciona** | `localhost`, cualquier dominio | Solo en `admin.luxorfitnessapp.com` |
| **Uso** | Desarrollo local, pruebas | Producción real |
| **Base de datos** | Misma (puedes usar la misma) | Misma (puedes usar la misma) |

---

## ⚠️ Errores Comunes

### Error: "Access blocked: authorization error"

**Causa:** Estás usando `pk_live_` en localhost o un dominio no autorizado.

**Solución:** Usa `pk_test_` para desarrollo local.

### Error: La clave no funciona en producción

**Causa:** Estás usando `pk_test_` en el dominio de producción.

**Solución:** Usa `pk_live_` y asegúrate de que el dominio esté configurado en Clerk Dashboard.

---

## 🔍 Verificar qué Modo Estás Usando

El código en `main.tsx` te avisará automáticamente:

- ✅ Si usas `pk_test_` en localhost → Todo bien
- ⚠️ Si usas `pk_live_` en localhost → Te mostrará una advertencia
- ✅ Si usas `pk_live_` en producción → Todo bien

---

## 📚 Más Información

- **Clerk Dashboard:** https://dashboard.clerk.com/
- **Documentación de Clerk:** https://clerk.com/docs
- **Configuración de Dominios en Clerk:** Configure → Paths → Home URL

---

**¡Listo!** Ahora puedes cambiar fácilmente entre desarrollo y producción.

