# 🌐 Landing Page de FitMind - Guía de Configuración

## ✅ ¿Qué se ha creado?

Se ha creado una landing page completa y profesional para FitMind en la carpeta `website/` con:

### Archivos Creados:
- **index.html** - Página principal con todas las secciones
- **styles.css** - Estilos modernos y responsive
- **script.js** - JavaScript para interactividad
- **privacy.html** - Política de Privacidad (requerida para Stripe)
- **terms.html** - Términos de Servicio (requerida para Stripe)
- **README.md** - Documentación de despliegue

### Secciones de la Landing Page:
1. **Hero Section** - Presentación principal con CTA
2. **Características** - 6 features principales de la app
3. **Beneficios** - Por qué elegir FitMind
4. **Precios** - Planes mensual y anual
5. **Contacto** - Formulario de contacto
6. **Footer** - Enlaces legales y sociales

## 🚀 Pasos para Desplegar

### Opción 1: Netlify (Recomendado - Más fácil)

1. **Crear cuenta en Netlify:**
   - Ve a [netlify.com](https://netlify.com)
   - Crea una cuenta gratuita con GitHub/Google/Email

2. **Desplegar:**
   - Haz clic en "Add new site" > "Deploy manually"
   - Arrastra la carpeta `website/` completa
   - ¡Listo! Netlify te dará una URL como: `tu-sitio-12345.netlify.app`

3. **Personalizar dominio (opcional):**
   - Ve a "Domain settings"
   - Puedes agregar tu dominio personalizado o cambiar el nombre de la URL

### Opción 2: Vercel

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Desplegar:**
   ```bash
   cd website
   vercel
   ```

3. Sigue las instrucciones en pantalla

### Opción 3: GitHub Pages

1. **Crear repositorio:**
   - Crea un nuevo repositorio en GitHub (puede ser privado o público)
   - Nómbralo, por ejemplo: `fitmind-landing`

2. **Subir archivos:**
   ```bash
   cd website
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/fitmind-landing.git
   git push -u origin main
   ```

3. **Habilitar GitHub Pages:**
   - Ve a Settings > Pages
   - Source: Deploy from a branch
   - Branch: `main` / folder: `/` (root)
   - Guarda

4. Tu sitio estará en: `tu-usuario.github.io/fitmind-landing`

### Opción 4: Otros servicios

- **Surge.sh** - Gratis, simple: `surge website/`
- **Firebase Hosting** - Gratis
- **AWS S3 + CloudFront** - Pago según uso
- **Hosting compartido** - Cualquier hosting con FTP

## ✏️ Personalización Antes de Desplegar

### 1. Actualizar Información de Contacto

Edita `index.html` y busca estas secciones:
- Email de contacto: `soporte@fitmind.app`
- Website: `www.fitmind.app`
- Actualiza con tus datos reales

### 2. Actualizar Fechas en Políticas

Edita `privacy.html` y `terms.html`:
- Busca: `Última actualización: [Fecha]`
- Reemplaza con la fecha actual: `Última actualización: 15 de enero de 2024`

### 3. Personalizar Jurisdicción Legal

En `terms.html`, busca:
- `[Tu País/Jurisdicción]`
- `[Tu Ciudad, País]`
- Reemplaza con tu país/ciudad real (ej: "México", "Ciudad de México, México")

### 4. Agregar Links de Descarga (Cuando esté lista la app)

Cuando la app esté en las stores, actualiza los botones "Descargar App":

```html
<!-- Reemplaza onclick="scrollToDownload()" con links reales -->
<a href="https://apps.apple.com/app/fitmind" class="btn btn-primary">
    Descargar en App Store
</a>
<a href="https://play.google.com/store/apps/details?id=com.fitmind.app" class="btn btn-secondary">
    Descargar en Google Play
</a>
```

### 5. Agregar Screenshots Reales (Opcional)

Crea una carpeta `website/images/` y agrega:
- Capturas de pantalla de la app
- Logo real si tienes uno
- Fotos de uso real

Luego actualiza `index.html` para usar estas imágenes en lugar de los placeholders.

## 📧 Configurar Formulario de Contacto

### Opción 1: Formspree (Gratis, Fácil)

1. Ve a [formspree.io](https://formspree.io)
2. Crea cuenta gratuita
3. Crea un nuevo formulario
4. Obtén tu endpoint (ej: `https://formspree.io/f/xjvqkpwd`)
5. En `index.html`, actualiza el formulario:

```html
<form action="https://formspree.io/f/TU_ENDPOINT" method="POST" id="contactForm">
```

6. Agrega campos ocultos en el form:
```html
<input type="hidden" name="_subject" value="Nuevo contacto desde FitMind">
<input type="hidden" name="_next" value="https://tu-dominio.com/gracias.html">
```

### Opción 2: EmailJS (Gratis)

Permite enviar emails directamente desde el frontend sin backend.

1. Ve a [emailjs.com](https://emailjs.com)
2. Crea cuenta y configura un servicio de email
3. Obtén tus credenciales
4. Actualiza `script.js` para usar EmailJS

### Opción 3: Backend Propio

Si tienes un backend, actualiza el `action` del formulario para que apunte a tu endpoint.

## ✅ Checklist para Stripe

Antes de abrir tu cuenta de Stripe, asegúrate de tener:

- [x] **Website funcional** ✅ (Esta landing page)
- [x] **Política de Privacidad** ✅ (`privacy.html`)
- [x] **Términos de Servicio** ✅ (`terms.html`)
- [ ] **Dominio personalizado** (opcional pero recomendado)
- [ ] **Información de la empresa/producto**
- [ ] **Información bancaria**
- [ ] **Documentos de identidad**
- [ ] **Número de teléfono verificado**

### Información que Stripe puede pedir:

1. **Información del Negocio:**
   - Nombre legal de la empresa
   - Tipo de negocio (individual, empresa)
   - País de operación
   - Industria

2. **Información Bancaria:**
   - IBAN o número de cuenta
   - Banco
   - Nombre del titular

3. **Documentos:**
   - Identificación oficial (pasaporte, licencia)
   - Comprobante de domicilio
   - Si es empresa: documentos de incorporación

4. **Producto/Servicio:**
   - Descripción del servicio
   - URL del website (esta landing page)
   - Términos y condiciones (terms.html)
   - Política de privacidad (privacy.html)

## 🔒 HTTPS (Importante para Stripe)

**Todos los servicios mencionados (Netlify, Vercel, GitHub Pages) proporcionan HTTPS automáticamente y gratis.** No necesitas hacer nada adicional.

Stripe **requiere HTTPS** para procesar pagos, así que asegúrate de que tu sitio esté desplegado en uno de estos servicios que incluyen HTTPS.

## 📱 Próximos Pasos Después de Desplegar

1. **Prueba la landing page:**
   - Abre la URL en diferentes dispositivos
   - Verifica que todos los links funcionen
   - Prueba el formulario de contacto

2. **SEO Básico:**
   - Agrega tu URL a Google Search Console
   - Considera agregar Google Analytics
   - Verifica que los meta tags estén completos

3. **Integrar con la App:**
   - Cuando la app esté lista, actualiza los botones de descarga
   - Agrega deep links si usas Branch.io o similar
   - Considera agregar un código de invitación en la landing

4. **Analytics:**
   ```html
   <!-- Google Analytics (opcional) -->
   <!-- En <head> de index.html -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```

## 🎨 Mejoras Futuras

- [ ] Agregar video demo de la app
- [ ] Testimonios reales de usuarios
- [ ] Blog o artículos sobre fitness
- [ ] Chat en vivo (Intercom, Crisp)
- [ ] Integración con Mailchimp para newsletter
- [ ] A/B testing de CTAs
- [ ] Multi-idioma

## 📞 Soporte

Si tienes problemas con el despliegue:
- Revisa el README.md en `website/`
- Consulta la documentación del servicio de hosting que elijas
- Verifica que todos los archivos estén en la carpeta correcta

---

**¡Tu landing page está lista para desplegar y cumplir con los requisitos de Stripe!** 🎉

Una vez desplegada, tendrás una URL que puedes usar al abrir tu cuenta de Stripe.
