# 🔍 Verificar Configuración del Subdominio en Hostinger

## Paso 1: Verificar que el Subdominio Existe

1. **Ve a hPanel de Hostinger:**
   - [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Inicia sesión

2. **Busca "Subdomains" o "Subdominios":**
   - Puede estar en: **"Advanced"** → **"Subdomains"**
   - O en: **"Domains"** → **"Subdomains"**
   - O en el menú lateral como **"Subdominios"**

3. **Verifica que aparezca:**
   ```
   admin.luxorfitnessapp.com
   ```
   - ✅ Estado: **Active** o **Activo**
   - ✅ Document Root: `public_html/admin` (o similar)

---

## Paso 2: Si NO Existe, Créalo

1. **Haz clic en "Create Subdomain" o "Crear Subdominio"**

2. **Completa el formulario:**
   - **Subdomain name:** `admin`
   - **Domain:** Selecciona `luxorfitnessapp.com`
   - **Document Root:** Deja el valor por defecto (generalmente `public_html/admin`)
   - O ingresa manualmente: `public_html/admin`

3. **Haz clic en "Create" o "Crear"**

4. **Espera 5-10 minutos** para que se configure

---

## Paso 3: Verificar DNS en Hostinger

1. **Ve a "DNS Zone Editor" o "Editor de Zona DNS":**
   - Puede estar en: **"Domains"** → **"DNS Zone Editor"**
   - O en: **"Advanced"** → **"DNS Zone"**

2. **Busca registros para "admin":**
   - Debe haber un registro tipo **A** o **CNAME** para `admin.luxorfitnessapp.com`
   - O un registro para `admin` que apunte a una IP

3. **Si NO existe ningún registro:**
   - El subdominio puede no estar completamente configurado
   - Intenta eliminar y recrear el subdominio

---

## Paso 4: Verificar Archivos

1. **Ve a "File Manager" o "Administrador de Archivos"**

2. **Navega a:**
   - `public_html/admin/`

3. **Verifica que contenga:**
   - ✅ `index.html`
   - ✅ Carpeta `assets/`

4. **Si la carpeta NO existe o está vacía:**
   - Crea la carpeta `admin` dentro de `public_html`
   - Sube los archivos de `admin-dashboard/dist/`

---

## Paso 5: Tiempo de Espera

**El DNS puede tardar:**
- ⏱️ Mínimo: **15-30 minutos**
- ⏱️ Normal: **1-4 horas**
- ⏱️ Máximo: **24-48 horas** (raro)

**Mientras esperas:**
- ✅ Verifica que el subdominio esté creado
- ✅ Verifica que los archivos estén subidos
- ✅ Intenta acceder cada hora

---

## Paso 6: Probar desde Diferentes Ubicaciones

**Usa estas herramientas para verificar:**
1. [whatsmydns.net](https://www.whatsmydns.net/#A/admin.luxorfitnessapp.com) ✅ (Ya lo hiciste)
2. [dnschecker.org](https://dnschecker.org/#A/admin.luxorfitnessapp.com)
3. [dns.google](https://dns.google/query?name=admin.luxorfitnessapp.com&type=A)

**Si algunas ubicaciones muestran IP pero otras no:**
- Es normal durante la propagación
- Debes esperar a que llegue a tu ubicación

---

## Paso 7: Probar con Otros Navegadores o Modo Incógnito

1. **Abre el navegador en modo incógnito:**
   - Chrome: `Ctrl + Shift + N`
   - Edge: `Ctrl + Shift + P`
   - Firefox: `Ctrl + Shift + P`

2. **Intenta acceder a:**
   - `https://admin.luxorfitnessapp.com`

3. **O prueba desde otro dispositivo/red:**
   - Teléfono móvil con datos
   - Otra red WiFi

---

## ⚠️ Si Después de 24 Horas No Funciona

**Contacta soporte de Hostinger:**
1. Ve a hPanel → **"Support"** o **"Soporte"**
2. Explica que el subdominio `admin.luxorfitnessapp.com` no resuelve
3. Pide que verifiquen la configuración DNS

---

## ✅ Checklist Final

- [ ] Subdominio `admin` creado en Hostinger
- [ ] Estado: **Active** o **Activo**
- [ ] Document Root configurado: `public_html/admin`
- [ ] Archivos subidos a `public_html/admin/`
- [ ] DNS propagado en algunas ubicaciones (whatsmydns.net)
- [ ] Esperando propagación a tu ubicación local
- [ ] Caché DNS limpiado en tu computadora

