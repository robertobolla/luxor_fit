# 🌐 Desplegar Landing Page - Guía Paso a Paso

## Opción 1: Netlify (Recomendado - Más Fácil)

### Paso 1: Crear Cuenta en Netlify

1. Ve a [netlify.com](https://netlify.com)
2. Haz clic en **"Sign up"**
3. Puedes registrarte con:
   - GitHub (recomendado)
   - Email
   - Google

### Paso 2: Desplegar el Sitio

**Método A: Arrastrar y Soltar (Más Fácil)**

1. Una vez dentro de Netlify Dashboard
2. Busca el área que dice **"Want to deploy a new site without connecting to Git?"**
3. O simplemente **arrastra la carpeta `website/`** completa a Netlify
4. Netlify automáticamente:
   - Detecta que es un sitio estático
   - Lo despliega
   - Te da una URL como: `random-name-12345.netlify.app`

**Método B: Desde Git (Recomendado para actualizaciones)**

1. Si tienes la carpeta `website/` en GitHub:
   - En Netlify Dashboard, haz clic en **"Add new site"** → **"Import an existing project"**
   - Selecciona **GitHub**
   - Autoriza a Netlify
   - Selecciona el repositorio y la carpeta `website/`
   - Netlify detectará automáticamente la configuración
   - Haz clic en **"Deploy site"**

### Paso 3: Personalizar la URL

1. En Netlify Dashboard → Tu sitio → **Site settings**
2. Ve a **"Change site name"**
3. Cambia a algo como: `luxor-fitness` (si está disponible)
4. Tu nueva URL será: `luxor-fitness.netlify.app`

### Paso 4: Configurar Dominio Personalizado (Opcional)

1. En **Site settings** → **Domain management**
2. Haz clic en **"Add custom domain"**
3. Ingresa tu dominio (ej: `luxorfitness.app`)
4. Sigue las instrucciones para configurar DNS

---

## Opción 2: Vercel (Alternativa)

### Paso 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Paso 2: Login

```bash
vercel login
```

### Paso 3: Desplegar

```bash
cd website
vercel --prod
```

Sigue las instrucciones en pantalla. Vercel te dará una URL como: `luxor-fitness.vercel.app`

---

## Opción 3: GitHub Pages (Gratis con GitHub)

### Paso 1: Subir a GitHub

```bash
cd website
git init
git add .
git commit -m "Initial commit - Landing page"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/luxor-landing.git
git push -u origin main
```

### Paso 2: Habilitar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Source: **Deploy from a branch**
4. Branch: `main` / Folder: `/` (root)
5. Save

Tu sitio estará en: `tu-usuario.github.io/luxor-landing`

---

## Opción 4: Firebase Hosting (Google)

### Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### Paso 2: Login

```bash
firebase login
```

### Paso 3: Inicializar

```bash
cd website
firebase init hosting
```

### Paso 4: Desplegar

```bash
firebase deploy --only hosting
```

---

## ✅ Verificación Después del Despliegue

1. **Abre la URL** que te dio el servicio
2. **Verifica que todo se vea bien:**
   - Logo de Luxor Fitness visible
   - Colores naranjas correctos
   - Todas las secciones cargando
   - Formulario de contacto funciona
   - Links a privacidad y términos funcionan

3. **Probar en móvil:**
   - Abre la URL en tu teléfono
   - Verifica que sea responsive

---

## 🔧 Configurar Formulario de Contacto (Opcional)

El formulario actualmente solo muestra una alerta. Para hacerlo funcional:

### Opción A: Formspree (Gratis)

1. Ve a [formspree.io](https://formspree.io)
2. Crea cuenta gratuita
3. Crea un nuevo formulario
4. Obtén el endpoint (ej: `https://formspree.io/f/xjvqkpwd`)
5. Edita `website/index.html`:
   ```html
   <form action="https://formspree.io/f/TU_ENDPOINT" method="POST" id="contactForm">
   ```

### Opción B: EmailJS

Similar a Formspree, pero envía emails directamente desde el frontend.

---

## 📝 Actualizar URLs en Stripe

Después de desplegar, actualiza en Stripe:

1. **Dashboard de Stripe** → **Settings** → **Branding**
2. Agrega la URL de tu landing page
3. Esto ayuda con la verificación de tu cuenta

---

## 🎯 Siguiente Paso Después de Desplegar

Una vez desplegada, actualiza los links en la app móvil cuando esté lista:
- Agrega deep links a la landing page
- Actualiza botones "Descargar App" con links de App Store/Play Store

---

¡Elige el método que prefieras y comienza! 🚀

