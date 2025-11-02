# 🔧 Solucionar Error DNS del Subdominio

## ❌ Error Actual: `DNS_PROBE_FINISHED_NXDOMAIN`

Este error significa que el subdominio `admin.luxorfitnessapp.com` no está configurado en DNS o aún no se ha propagado.

---

## ✅ Soluciones

### Solución 1: Verificar que el Subdominio Esté Creado

1. **Ve a hPanel de Hostinger:**
   - [hpanel.hostinger.com](https://hpanel.hostinger.com)

2. **Ve a Dominios → Subdominios:**
   - O: **"Advanced"** → **"Subdomains"**

3. **Verifica que exista:**
   - Debe aparecer: `admin.luxorfitnessapp.com`
   - Estado: **Activo** o **Active**

4. **Si NO existe, créalo:**
   - Haz clic en **"Create Subdomain"** o **"Crear Subdominio"**
   - **Nombre:** `admin`
   - **Dominio:** `luxorfitnessapp.com`
   - **Document Root:** `public_html/admin`
   - Guarda/Crea

---

### Solución 2: Verificar Configuración DNS

1. **En Hostinger, ve a DNS:**
   - hPanel → **"DNS Zone Editor"** o **"Editor de Zona DNS"**

2. **Verifica que exista el registro:**
   - Busca un registro tipo **A** o **CNAME** para `admin`
   - Debe apuntar a la IP del servidor

3. **Si no existe, Hostinger debería crearlo automáticamente** al crear el subdominio

---

### Solución 3: Verificar que los Archivos Estén en la Carpeta Correcta

**Mientras esperas que el DNS se propague, asegúrate de que los archivos estén listos:**

1. **Abre File Manager en Hostinger**

2. **Verifica o crea la carpeta:**
   - `public_html/admin/`

3. **Sube los archivos de `admin-dashboard/dist/`:**
   - `index.html`
   - Carpeta `assets/` completa

---

### Solución 4: Tiempo de Propagación DNS

**El DNS puede tardar:**
- Mínimo: 5-15 minutos
- Normal: 1-4 horas
- Máximo: 24-48 horas (raro)

**Mientras esperas:**
1. Verifica que el subdominio esté creado en Hostinger
2. Verifica que los archivos estén subidos
3. Espera la propagación

**Para verificar propagación:**
- Ve a [whatsmydns.net](https://www.whatsmydns.net)
- Ingresa: `admin.luxorfitnessapp.com`
- Verifica que aparezca una IP

---

## 🔍 Verificación Paso a Paso

### 1. Verificar en Hostinger

```
hPanel → Subdomains
✅ Debe aparecer: admin.luxorfitnessapp.com
✅ Estado: Active
✅ Document Root: public_html/admin
```

### 2. Verificar Archivos

```
File Manager → public_html/admin/
✅ Debe contener:
   - index.html
   - assets/
```

### 3. Verificar DNS

```
hPanel → DNS Zone Editor
✅ Buscar registro para "admin"
✅ Tipo: A o CNAME
✅ Apunta a IP del servidor
```

---

## 🆘 Si el Subdominio No Se Crea

**Intenta esto:**

1. **Elimina y vuelve a crear el subdominio:**
   - Elimina si existe
   - Crea nuevamente con la misma configuración

2. **Contacta soporte de Hostinger:**
   - Si después de crear el subdominio no funciona en 24 horas
   - Pueden ayudar a verificar la configuración

---

## 💡 Acceso Temporal (Mientras Esperas DNS)

**Si necesitas probar el dashboard ahora:**

Puedes acceder temporalmente usando la IP del servidor si Hostinger te la proporciona, pero esto es complicado. Es mejor esperar la propagación DNS.

---

## ✅ Una Vez que Funcione

Cuando `admin.luxorfitnessapp.com` responda:

1. **Verifica HTTPS:**
   - Activa SSL para el subdominio en hPanel

2. **Prueba el login:**
   - Debe aparecer la pantalla de Clerk
   - Inicia sesión con cuenta admin/socio

---

¡Revisa primero que el subdominio esté creado en Hostinger!

