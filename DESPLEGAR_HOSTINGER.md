# 🌐 Desplegar Landing Page en Hostinger

## 📋 Preparación

Tu landing page es estática (HTML, CSS, JS), así que es compatible con Hostinger.

---

## Paso 1: Acceder a Hostinger

1. **Ve a tu cuenta de Hostinger:**
   - [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Inicia sesión

2. **Selecciona tu dominio/hosting**

---

## Paso 2: Acceder al File Manager (Gestor de Archivos)

### Opción A: Desde hPanel

1. En el dashboard, busca **"File Manager"** o **"Gestor de Archivos"**
2. Haz clic para abrirlo

### Opción B: Desde cPanel (si tienes acceso)

1. Busca **"File Manager"** en el menú
2. Haz clic para abrirlo

---

## Paso 3: Navegar a la Carpeta Correcta

**Para el dominio principal:**
- Ve a la carpeta: `public_html/` o `www/`

**Para un subdominio:**
- Ve a la carpeta: `public_html/subdominio/` (ej: `public_html/landing/`)

**Para un dominio específico:**
- Si tienes múltiples dominios, selecciona la carpeta del dominio correcto

---

## Paso 4: Subir Archivos

### Método 1: Desde File Manager (Web Interface)

1. **Elimina archivos por defecto (si existen):**
   - Elimina `index.html` por defecto (si existe)
   - Elimina cualquier archivo de ejemplo

2. **Subir archivos:**
   - Haz clic en **"Upload"** o **"Subir"**
   - Selecciona todos los archivos de la carpeta `website/`:
     - `index.html`
     - `privacy.html`
     - `terms.html`
     - `styles.css`
     - `script.js`
     - `README.md` (opcional)
   
3. **Arrastra y suelta** los archivos o usa el botón de selección

4. **Espera a que termine la carga**

### Método 2: Vía FTP (Más Rápido)

**Si prefieres usar un cliente FTP como FileZilla:**

1. **Obtener credenciales FTP:**
   - En hPanel → **"FTP Accounts"** o **"Cuentas FTP"**
   - Anota:
     - **Host:** `ftp.tudominio.com` o la IP
     - **Usuario:** Tu usuario FTP
     - **Contraseña:** Tu contraseña FTP
     - **Puerto:** `21` (o `22` para SFTP)

2. **Conectar con FileZilla:**
   - Descarga [FileZilla](https://filezilla-project.org/) si no lo tienes
   - Abre FileZilla
   - Ingresa las credenciales FTP
   - Conéctate

3. **Navegar y subir:**
   - En el lado remoto (derecha), ve a `public_html/`
   - En el lado local (izquierda), navega a `C:\roberto\fitmind-new\website`
   - Selecciona todos los archivos y arrástralos al lado remoto

---

## Paso 5: Verificar Estructura de Archivos

Asegúrate de que en `public_html/` tengas:

```
public_html/
├── index.html
├── privacy.html
├── terms.html
├── styles.css
└── script.js
```

**Importante:** El archivo `index.html` debe estar directamente en `public_html/`, no en una subcarpeta.

---

## Paso 6: Configurar Permisos (Si es Necesario)

En algunos casos, necesitas ajustar permisos:

1. **Selecciona todos los archivos**
2. **Clic derecho → "Change Permissions"** o **"Cambiar Permisos"**
3. **Configura:**
   - Archivos: `644` (rw-r--r--)
   - Carpetas: `755` (rwxr-xr-x)

---

## Paso 7: Verificar que Funcione

1. **Abre tu dominio en el navegador:**
   - Ejemplo: `https://tudominio.com`
   - O: `https://www.tudominio.com`

2. **Verifica:**
   - ✅ La landing page carga correctamente
   - ✅ El logo de Luxor Fitness se ve
   - ✅ Los colores naranjas están correctos
   - ✅ Todos los links funcionan
   - ✅ El formulario de contacto funciona

3. **Probar links:**
   - `https://tudominio.com/privacy.html`
   - `https://tudominio.com/terms.html`

---

## Paso 8: Configurar HTTPS (SSL)

Hostinger normalmente incluye SSL gratuito (Let's Encrypt):

1. **En hPanel:**
   - Ve a **"SSL"** o **"SSL/TLS"**
   - Activa **"Let's Encrypt"** o **"Auto SSL"**
   - Esto puede tardar unos minutos

2. **Verificar:**
   - Tu sitio debería cargar con `https://`
   - El candado verde debe aparecer en el navegador

---

## 🔧 Troubleshooting

### Si el sitio no carga:

1. **Verifica que `index.html` esté en `public_html/`:**
   - No debe estar en una subcarpeta

2. **Verifica permisos:**
   - Los archivos deben tener permisos de lectura (644)

3. **Limpia caché:**
   - Ctrl + F5 en el navegador
   - O limpia caché del navegador

4. **Verifica en cPanel/hPanel:**
   - Que el dominio esté correctamente configurado
   - Que apunte a `public_html/`

### Si los estilos no cargan:

1. **Verifica la ruta en `index.html`:**
   ```html
   <link rel="stylesheet" href="styles.css">
   ```
   - Debe ser relativa (sin `/` al inicio)

2. **Verifica permisos del archivo `styles.css`**

### Si JavaScript no funciona:

1. **Verifica la ruta en `index.html`:**
   ```html
   <script src="script.js"></script>
   ```
   - Debe ser relativa

2. **Abre la consola del navegador (F12):**
   - Revisa si hay errores de carga

---

## 📝 Actualizar URLs en Stripe

Después de desplegar:

1. **Ve a Stripe Dashboard:**
   - Settings → Branding
   - Agrega la URL de tu sitio: `https://tudominio.com`

---

## 🎯 Optimizaciones Adicionales (Opcional)

### 1. Configurar www o sin www

En hPanel/cPanel:
- Busca **"Redirects"** o **"Redirects"**
- Configura redirección:
  - `www.tudominio.com` → `tudominio.com`
  - O viceversa

### 2. Configurar Caché (Si está disponible)

Algunos planes de Hostinger incluyen caché:
- Activa **"LiteSpeed Cache"** si está disponible
- Mejora la velocidad de carga

---

## ✅ Checklist Final

- [ ] Archivos subidos a `public_html/`
- [ ] `index.html` es el archivo principal
- [ ] HTTPS/SSL activado
- [ ] Sitio carga correctamente en el navegador
- [ ] Todos los links funcionan
- [ ] Formulario de contacto funciona (o configurado)
- [ ] Prueba en móvil (responsive)
- [ ] URL agregada en Stripe

---

¡Una vez completado, tu landing page estará en línea! 🚀

Si necesitas ayuda con algún paso específico, avísame.

