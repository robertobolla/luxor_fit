# 🚨 CREAR ARCHIVO .env URGENTE

## Problema
**Pantalla negra en admin dashboard** = Falta archivo `.env`

---

## ✅ Solución Rápida

### 1. Crear archivo `.env` en `admin-dashboard/`

```bash
cd admin-dashboard
```

### 2. Agregar este contenido al archivo `.env`:

```env
# CLERK AUTHENTICATION (REQUERIDO)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZml0bWluZC1wcm8uY2xlcmsuYWNjb3VudHMuZGV2JA

# SUPABASE (REQUERIDO)
VITE_SUPABASE_URL=https://bxqicpcqhfggwtxtcubq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljcGNxaGZnZ3d0eHRjdWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NjcxNjEsImV4cCI6MjA0ODE0MzE2MX0.2rBtEr-aE8HwdFqTKUYG_MDRcvPYS-Hq3F8MJo48YYs
```

### 3. Reiniciar el servidor:

```bash
# Detener el servidor actual (Ctrl+C)
# Luego:
npm run dev
```

---

## 📝 Comandos Exactos

### Windows PowerShell:
```powershell
cd admin-dashboard
New-Item .env -ItemType File
notepad .env
# Pegar el contenido de arriba
# Guardar y cerrar
npm run dev
```

### Windows CMD:
```cmd
cd admin-dashboard
echo. > .env
notepad .env
# Pegar el contenido de arriba
# Guardar y cerrar
npm run dev
```

### Git Bash / Mac / Linux:
```bash
cd admin-dashboard
cat > .env << 'EOF'
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZml0bWluZC1wcm8uY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_SUPABASE_URL=https://bxqicpcqhfggwtxtcubq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljcGNxaGZnZ3d0eHRjdWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NjcxNjEsImV4cCI6MjA0ODE0MzE2MX0.2rBtEr-aE8HwdFqTKUYG_MDRcvPYS-Hq3F8MJo48YYs
EOF
npm run dev
```

---

## 🔍 Verificación

Después de crear el `.env`, verás en la consola del navegador (F12):

```
✅ Clerk Publishable Key encontrada: pk_test_Y2xlcmsuZml0...
✅ Supabase configurado correctamente
```

En lugar de:

```
⚠️ VITE_CLERK_PUBLISHABLE_KEY no está configurada
```

---

## ⚠️ IMPORTANTE

### Para DESARROLLO (localhost):
- Usa `pk_test_...` (la clave que está arriba)
- ✅ Ya está configurada correctamente

### Para PRODUCCIÓN (admin.luxorfitness.lat):
- Necesitas cambiar a `pk_live_...`
- Contacta a Roberto para la clave de producción

---

## 📁 Estructura Correcta

```
admin-dashboard/
├── .env                  ← DEBE EXISTIR (crear ahora)
├── .env.example          (opcional)
├── src/
├── package.json
└── vite.config.ts
```

---

## 🐛 Troubleshooting

### Problema: Sigue pantalla negra
**Solución**: 
1. Verifica que el archivo se llama `.env` (no `.env.txt`)
2. Está en `admin-dashboard/` (no en la raíz)
3. Reinicia el servidor completamente (Ctrl+C y luego `npm run dev`)

### Problema: "pk_live_ only works in production"
**Solución**:
- Estás usando clave de producción en localhost
- Cambia a `pk_test_...` (la clave que está arriba)

---

## ✅ Una Vez Que Funcione

Deberías ver:
1. ✅ Login de Clerk
2. ✅ Pantalla de "Verificando permisos..."
3. ✅ Dashboard (si eres admin) o "Acceso Denegado" (si no)

**NO más pantalla negra** 🎉

---

## 📞 Ayuda

Si sigue sin funcionar:
1. Abre la consola del navegador (F12)
2. Busca mensajes de error
3. Comparte el error específico

