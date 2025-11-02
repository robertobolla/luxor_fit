# FitMind - Landing Page

Landing page promocional para la aplicación FitMind. Diseñada para promocionar la app y cumplir con los requisitos de Stripe para abrir una cuenta.

## 🚀 Características

- ✅ Diseño moderno y responsive
- ✅ Secciones principales: Hero, Características, Beneficios, Precios, Contacto
- ✅ Optimizada para SEO
- ✅ Animaciones suaves
- ✅ Mobile-first design
- ✅ Lista para desplegar en cualquier hosting

## 📁 Estructura de Archivos

```
website/
├── index.html      # Página principal
├── styles.css      # Estilos CSS
├── script.js       # JavaScript para interactividad
└── README.md       # Este archivo
```

## 🛠️ Instalación y Uso Local

1. **Abre el archivo directamente:**
   ```bash
   # Simplemente abre index.html en tu navegador
   open index.html
   ```

2. **O usa un servidor local:**
   ```bash
   # Con Python
   python -m http.server 8000

   # Con Node.js (http-server)
   npx http-server -p 8000

   # Con PHP
   php -S localhost:8000
   ```

3. **Accede a:** `http://localhost:8000`

## 🌐 Opciones de Despliegue

### Opción 1: Netlify (Recomendado - Gratis)

1. Visita [netlify.com](https://netlify.com)
2. Crea una cuenta (gratis)
3. Arrastra la carpeta `website` a Netlify
4. ¡Listo! Obtendrás una URL como `tu-sitio.netlify.app`

### Opción 2: Vercel (Gratis)

1. Instala Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Despliega:
   ```bash
   cd website
   vercel
   ```

3. Sigue las instrucciones en pantalla

### Opción 3: GitHub Pages (Gratis)

1. Crea un repositorio en GitHub
2. Sube los archivos de `website/`
3. Ve a Settings > Pages
4. Selecciona la rama `main` y carpeta `/`
5. Tu sitio estará en `tu-usuario.github.io/tu-repo`

### Opción 4: Surge.sh (Gratis)

1. Instala Surge:
   ```bash
   npm install -g surge
   ```

2. Despliega:
   ```bash
   cd website
   surge
   ```

3. Sigue las instrucciones (necesitas crear una cuenta)

### Opción 5: Servidor propio

Puedes subir los archivos a cualquier hosting:
- AWS S3 + CloudFront
- Google Cloud Storage
- DigitalOcean App Platform
- Cualquier hosting compartido

## ✏️ Personalización

### Cambiar Colores

Edita `styles.css` y modifica las variables CSS en `:root`:

```css
:root {
    --primary-color: #00D4AA;
    --primary-dark: #00A8CC;
    /* ... más colores */
}
```

### Actualizar Contenido

Edita `index.html` para cambiar:
- Textos y títulos
- Precios
- Información de contacto
- Estadísticas

### Agregar Imágenes

1. Crea una carpeta `images/` dentro de `website/`
2. Agrega tus imágenes
3. Actualiza las referencias en `index.html`

## 📧 Formulario de Contacto

El formulario actualmente solo muestra una alerta. Para hacerlo funcional:

### Opción 1: Formspree (Gratis)

1. Ve a [formspree.io](https://formspree.io)
2. Crea una cuenta
3. Obtén tu endpoint
4. En `index.html`, actualiza el `action` del formulario:
   ```html
   <form action="https://formspree.io/f/TU_ENDPOINT" method="POST">
   ```

### Opción 2: Backend propio

Puedes crear un endpoint en tu backend para procesar el formulario.

## ✅ Checklist para Stripe

Para abrir una cuenta de Stripe, necesitas:

- ✅ Website funcional (este proyecto)
- ✅ Información de la empresa/producto
- ✅ Política de privacidad (agregar página)
- ✅ Términos de servicio (agregar página)
- ✅ Información bancaria
- ✅ Documentos de identidad

## 📱 Integración con la App

Cuando la app esté lista para descargar:

1. Actualiza los botones "Descargar App" con:
   - Link a App Store (iOS)
   - Link a Google Play (Android)
   - O un link universal (usando Branch.io o similar)

2. Ejemplo:
   ```html
   <a href="https://apps.apple.com/app/fitmind" class="btn btn-primary">
     Descargar en App Store
   </a>
   ```

## 🔒 Seguridad y Privacidad

Para producción, considera agregar:

1. **Página de Política de Privacidad**
   - Crea `privacy.html`
   - Agrega link en el footer

2. **Página de Términos de Servicio**
   - Crea `terms.html`
   - Agrega link en el footer

3. **HTTPS** (obligatorio para Stripe)
   - Todos los servicios mencionados incluyen HTTPS por defecto
   - Netlify, Vercel, GitHub Pages todos usan HTTPS

## 📊 Analytics (Opcional)

Para rastrear visitantes, puedes agregar:

1. **Google Analytics**
   ```html
   <!-- En <head> -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   ```

2. **Plausible Analytics** (más privado)
   ```html
   <script defer data-domain="tu-dominio.com" src="https://plausible.io/js/script.js"></script>
   ```

## 🎨 Mejoras Futuras

- [ ] Agregar capturas de pantalla reales de la app
- [ ] Video demo de la app
- [ ] Testimonios de usuarios reales
- [ ] Blog/Artículos sobre fitness
- [ ] Chat en vivo (Intercom, Crisp)
- [ ] Integración con Mailchimp para newsletter

## 📞 Soporte

Si tienes preguntas sobre el despliegue o personalización, revisa la documentación de cada servicio de hosting mencionado.

## 📄 Licencia

Este proyecto es parte de FitMind y está protegido por derechos de autor.

---

**Nota:** Esta landing page está diseñada específicamente para cumplir con los requisitos de Stripe de tener un sitio web funcional antes de abrir una cuenta comercial.
