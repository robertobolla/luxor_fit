# 🚀 Desplegar Landing Page React en Hostinger

## ✅ Build Completado

El build ya está creado en la carpeta `dist/`. Ahora solo necesitas subirlo a Hostinger.

---

## 📤 Pasos para Desplegar

### Paso 1: Preparar los Archivos

Los archivos listos para subir están en:
```
website-react/dist/
```

Contenido:
- `index.html`
- Carpeta `assets/` (CSS y JS compilados)

---

### Paso 2: Acceder a Hostinger

1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Inicia sesión
3. Selecciona tu dominio/hosting

---

### Paso 3: Abrir File Manager

1. En el dashboard, busca **"File Manager"** o **"Gestor de Archivos"**
2. Haz clic para abrirlo

---

### Paso 4: Navegar a public_html

1. Abre la carpeta `public_html/` (o `www/` según tu configuración)
2. **Elimina cualquier archivo por defecto** (index.html, etc.) si existe

---

### Paso 5: Subir Archivos

#### Opción A: Desde File Manager (Web)

1. **Haz clic en "Upload" o "Subir"**
2. **Arrastra o selecciona:**
   - `index.html` desde `dist/`
   - Toda la carpeta `assets/` desde `dist/`
3. **Espera a que termine la carga**

#### Opción B: Desde FileZilla (FTP)

1. **Obtén credenciales FTP:**
   - hPanel → **"FTP Accounts"** o **"Cuentas FTP"**
   - Copia: Host, Usuario, Contraseña

2. **Conecta con FileZilla:**
   - Abre FileZilla
   - Ingresa las credenciales
   - Conéctate

3. **Sube los archivos:**
   - Lado remoto: Navega a `public_html/`
   - Lado local: Navega a `C:\roberto\fitmind-new\website-react\dist`
   - Arrastra `index.html` y la carpeta `assets/` al lado remoto

---

### Paso 6: Verificar Estructura

Asegúrate de que en `public_html/` tengas:

```
public_html/
├── index.html
└── assets/
    ├── index-XXXXX.css
    └── index-XXXXX.js
```

---

### Paso 7: Verificar que Funcione

1. **Abre tu dominio en el navegador:**
   - Ejemplo: `https://tudominio.com`
   - O: `https://www.tudominio.com`

2. **Verifica:**
   - ✅ La landing page carga correctamente
   - ✅ El logo de Luxor Fitness se ve
   - ✅ Los colores naranjas están correctos
   - ✅ Todos los links funcionan
   - ✅ El menú móvil funciona
   - ✅ El formulario de contacto funciona

---

### Paso 8: Configurar HTTPS (Si Aún No Está Activo)

1. En hPanel → **"SSL"** o **"SSL/TLS"**
2. Activa **"Let's Encrypt"** o **"Auto SSL"**
3. Espera unos minutos

---

## 🔄 Actualizar la Landing Page

Cada vez que hagas cambios:

1. **Edita los componentes en `src/components/`**
2. **Crea nuevo build:**
   ```bash
   cd website-react
   npm run build
   ```
3. **Sube solo los archivos nuevos** de `dist/` a Hostinger

---

## 📝 Notas Importantes

- **No subas la carpeta `node_modules/`** - Solo `dist/`
- **El build de React es estático** - Funciona perfecto en Hostinger
- **Las rutas deben ser relativas** - Vite ya las configura así
- **Los archivos en `dist/assets/`** tienen nombres con hash - Esto es normal

---

## ✅ Checklist Final

- [ ] Archivos subidos a `public_html/`
- [ ] `index.html` es el archivo principal
- [ ] Carpeta `assets/` subida correctamente
- [ ] HTTPS/SSL activado
- [ ] Sitio carga correctamente
- [ ] Todos los links funcionan
- [ ] Formulario de contacto funciona
- [ ] Prueba en móvil (responsive)

---

¡Tu landing page React está lista y desplegada! 🎉

