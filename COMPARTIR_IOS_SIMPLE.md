# 📱 Compartir App para iOS - Guía Simple

## ✅ Requisitos

1. **Cuenta Apple Developer** ($99/año)
   - Si no la tienes: https://developer.apple.com/programs/
   - Aprobación: 24-48 horas (a veces instantáneo)

## 🚀 Pasos

### Paso 1: Verificar/Configurar Credenciales

```bash
eas credentials
```

**Selecciona:**
- Plataforma: **ios**
- Profile: **preview**
- ¿Tienes cuenta Apple Developer? → **Y** (Yes)
- ¿EAS maneja credenciales? → **Y** (Yes)
- Ingresa tu **Apple ID** y **contraseña**

### Paso 2: Crear Build para iOS

```bash
eas build --profile preview --platform ios
```

**Tiempo:** 20-40 minutos (se ejecuta en la nube)

### Paso 3: Subir a TestFlight

```bash
eas submit --platform ios --latest
```

**O manualmente:**
1. Ve a: https://appstoreconnect.apple.com
2. Crea la app (si es primera vez):
   - Nombre: "Luxor Fitness"
   - Bundle ID: `com.luxorfitness.app`
3. Ve a **TestFlight**
4. Sube el build

### Paso 4: Invitar Usuarios

1. En TestFlight → **Internal Testing**
2. Agrega emails de los usuarios
3. Selecciona el build
4. Envíales el link

**Los usuarios:**
- Instalan **TestFlight** desde App Store (gratis)
- Aceptan la invitación por email
- Descargan tu app desde TestFlight
- ¡Listo!

## 📊 Límites

- **Internal Testing:** Hasta 100 usuarios (instantáneo)
- **External Testing:** Hasta 10,000 usuarios (requiere aprobación primera vez)

## ⚡ Actualizaciones Rápidas

Una vez instalada, puedes actualizar sin rebuild:
```bash
eas update --branch preview --message "Nueva versión"
```

