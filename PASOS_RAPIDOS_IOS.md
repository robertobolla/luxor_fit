# 🚀 Pasos Rápidos para Compartir App en iPhone

## ✅ PASO 1: Crear Cuenta Apple Developer

1. **Ve a:** https://developer.apple.com/programs/
2. **Haz clic en:** "Enroll" o "Inscríbete"
3. **Inicia sesión** con tu Apple ID (o créalo)
4. **Completa el formulario:**
   - Tipo: Individual
   - Datos personales
   - Pago: $99 USD/año
5. **Espera aprobación:** 24-48 horas (a veces instantáneo)

**📧 Revisa tu email para confirmación**

---

## ✅ PASO 2: Configurar Credenciales (Cuando esté aprobada)

```bash
eas credentials
```

**Selecciona:**
- Plataforma: **ios**
- Profile: **preview**
- ¿Tienes cuenta Apple Developer? → **Y**
- ¿EAS maneja credenciales? → **Y**
- Ingresa tu **Apple ID** y **contraseña**

---

## ✅ PASO 3: Crear Build

```bash
npm run build:preview:ios
```

**Espera:** 20-40 minutos (se ejecuta en la nube)

---

## ✅ PASO 4: Subir a TestFlight

```bash
eas submit --platform ios --latest
```

**O manualmente:**
1. Ve a: https://appstoreconnect.apple.com
2. Crea la app (primera vez)
3. Ve a **TestFlight**
4. Sube el build

---

## ✅ PASO 5: Invitar Usuarios

1. En TestFlight → **Internal Testing**
2. Agrega emails de los usuarios
3. Selecciona el build
4. Envíales el link

**Los usuarios:**
- Instalan TestFlight (gratis)
- Aceptan invitación
- Descargar tu app
- ¡Listo!

---

## 🎯 Empieza Ahora

**Paso 1:** https://developer.apple.com/programs/

**Cuando esté aprobada, avísame y continuamos.** 🚀

