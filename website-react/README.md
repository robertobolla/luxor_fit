# 🌐 Luxor Fitness - Landing Page (React)

Landing page moderna construida con React + TypeScript + Vite para Luxor Fitness.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Build para Producción

```bash
npm run build
```

Los archivos se generarán en la carpeta `dist/` que puedes subir directamente a Hostinger.

### Preview del Build

```bash
npm run preview
```

---

## 📁 Estructura del Proyecto

```
website-react/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx      # Navegación principal
│   │   ├── Hero.tsx        # Sección hero
│   │   ├── Features.tsx    # Características
│   │   ├── Benefits.tsx    # Beneficios
│   │   ├── Pricing.tsx    # Precios
│   │   ├── Contact.tsx    # Formulario de contacto
│   │   ├── Footer.tsx     # Footer
│   │   └── Logo.tsx       # Logo SVG
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Punto de entrada
│   └── index.css          # Estilos globales
├── index.html             # HTML principal
└── package.json           # Dependencias
```

---

## 🌐 Desplegar en Hostinger

### Opción 1: Build y Subir Manualmente

1. **Crear build:**
   ```bash
   npm run build
   ```

2. **Subir contenido de `dist/` a Hostinger:**
   - Accede a File Manager en Hostinger
   - Ve a `public_html/`
   - Sube todos los archivos de la carpeta `dist/`

### Opción 2: Vía FTP

1. **Crear build:**
   ```bash
   npm run build
   ```

2. **Conectar con FileZilla:**
   - Obtén credenciales FTP de Hostinger
   - Conéctate al servidor
   - Sube todo el contenido de `dist/` a `public_html/`

---

## 🔧 Configurar Formulario de Contacto

El formulario actualmente muestra una alerta. Para hacerlo funcional:

### Opción 1: Formspree (Gratis)

1. Ve a [formspree.io](https://formspree.io)
2. Crea cuenta y un formulario
3. Obtén el endpoint
4. Actualiza `src/components/Contact.tsx`:
   ```tsx
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     const response = await fetch('https://formspree.io/f/TU_ENDPOINT', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(formData)
     });
     // Manejar respuesta
   };
   ```

---

## 🎨 Personalización

### Cambiar Colores

Edita `src/index.css` y modifica las variables CSS:

```css
:root {
  --primary-color: #F7931E;
  --primary-dark: #E6850D;
  /* ... más colores */
}
```

### Actualizar Contenido

Edita los componentes en `src/components/`:
- Textos y títulos están directamente en los componentes
- Precios en `Pricing.tsx`
- Características en `Features.tsx`

---

## ✅ Checklist Antes de Desplegar

- [ ] Build creado (`npm run build`)
- [ ] Contenido actualizado (precios, textos)
- [ ] Formulario de contacto configurado
- [ ] Links de App Store/Play Store actualizados (cuando estén listos)
- [ ] Prueba en diferentes navegadores
- [ ] Prueba en móvil (responsive)

---

## 🚀 Tecnologías

- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool rápido
- **CSS Variables** - Estilos modulares

---

¡Listo para desplegar! 🎉
