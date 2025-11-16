# 📱 Guía: Compartir App Instalable (Sin Expo Go)

Esta guía te enseñará cómo crear builds instalables que otras personas pueden descargar directamente en sus teléfonos.

---

## 🎯 Opciones Disponibles

### ✅ Android (Más Fácil)
- **APK instalable** - Cualquiera puede descargarlo
- **No requiere cuenta especial**
- **Tiempo:** 15-30 minutos

### ⚠️ iOS (Más Complejo)
- **Requiere cuenta de Apple Developer** ($99/año)
- **O usar TestFlight** (requiere cuenta de Apple Developer)
- **Sin cuenta:** Solo puedes instalar en tu propio iPhone

---

## 🚀 PASO 1: Preparar EAS CLI

### 1.1 Instalar EAS CLI (si no lo tienes)
```bash
npm install -g eas-cli
```

### 1.2 Iniciar sesión en Expo
```bash
eas login
```
- Te pedirá tu email y contraseña de Expo
- Si no tienes cuenta, créala en: https://expo.dev

### 1.3 Verificar que estás logueado
```bash
eas whoami
```

---

## 📦 PASO 2: Crear Build para Android (APK)

### 2.1 Crear el build
```bash
npm run build:preview:android
```

**O directamente:**
```bash
eas build --profile preview --platform android
```

### 2.2 Durante el build:
- Te preguntará si quieres subir las credenciales a Expo
- Responde **"Yes"** (recomendado)
- El build tomará **15-30 minutos**
- Puedes cerrar la terminal, se ejecuta en la nube

### 2.3 Cuando termine:
- Te dará un **link de descarga**
- Ejemplo: `https://expo.dev/artifacts/...`
- **Guarda este link**

---

## 📲 PASO 3: Compartir el APK

### Opción A: Link Directo (Más Fácil)
1. **Copia el link** que te dio EAS
2. **Compártelo** por WhatsApp, Email, etc.
3. La persona:
   - Abre el link en su Android
   - Descarga el APK
   - Instala (puede pedir permitir "Fuentes desconocidas")

### Opción B: Subir a Google Drive/Dropbox
1. **Descarga el APK** desde el link de EAS
2. **Súbelo** a Google Drive o Dropbox
3. **Comparte el link** con permisos de descarga
4. La persona descarga e instala

### Opción C: QR Code
1. **Crea un QR** con el link de descarga
2. **Compártelo** (imagen, WhatsApp, etc.)
3. La persona escanea y descarga

---

## 🍎 PASO 4: Crear Build para iOS (Si Tienes Apple Developer)

### 4.1 Si tienes cuenta de Apple Developer:
```bash
npm run build:preview:ios
```

### 4.2 Durante el build:
- Te pedirá credenciales de Apple Developer
- Sigue las instrucciones
- Toma **20-40 minutos**

### 4.3 Cuando termine:
- Te dará un **link de descarga**
- La persona necesita:
  - iPhone con iOS compatible
  - Instalar desde el link
  - Puede requerir confiar en el desarrollador en Ajustes

---

## ⚠️ PASO 5: iOS Sin Cuenta de Apple Developer

### Opción A: TestFlight (Requiere cuenta)
- Necesitas cuenta de Apple Developer ($99/año)
- Subes a TestFlight
- Invitas usuarios por email
- Ellos instalan TestFlight y tu app

### Opción B: Solo Tu iPhone
- Solo puedes instalar en tu propio iPhone
- No puedes compartir con otros sin cuenta

### Opción C: Usar Android
- Para pruebas, usa Android (más fácil)
- iOS para producción requiere cuenta

---

## 🔄 PASO 6: Actualizar la App (Nuevos Builds)

Cuando hagas cambios y quieras compartir una nueva versión:

### 6.1 Actualizar versión
Edita `app.json`:
```json
{
  "expo": {
    "version": "1.0.1"  // Incrementa la versión
  }
}
```

### 6.2 Crear nuevo build
```bash
npm run build:preview:android
```

### 6.3 Compartir nuevo link
- EAS te dará un nuevo link
- Compártelo con los usuarios

---

## 📋 Checklist Rápido

### Para Android:
- [ ] `npm install -g eas-cli`
- [ ] `eas login`
- [ ] `npm run build:preview:android`
- [ ] Copiar link de descarga
- [ ] Compartir link con usuarios

### Para iOS (con cuenta):
- [ ] `npm run build:preview:ios`
- [ ] Configurar credenciales de Apple
- [ ] Copiar link de descarga
- [ ] Compartir link con usuarios

---

## 🛠️ Solución de Problemas

### Error: "Not logged in"
```bash
eas login
```

### Error: "No EAS project found"
```bash
eas build:configure
```

### Build falla
- Revisa los logs en: https://expo.dev
- Verifica que todas las dependencias estén instaladas
- Asegúrate de que `app.json` esté correcto

### APK no se instala en Android
- El usuario debe permitir "Fuentes desconocidas" en Ajustes
- Verifica que el APK sea compatible con la versión de Android

---

## 💡 Tips Importantes

1. **Versiones:** Siempre incrementa la versión en `app.json` antes de un nuevo build
2. **Tiempo:** Los builds toman tiempo, hazlos cuando tengas cambios importantes
3. **Pruebas:** Prueba el APK en tu propio Android antes de compartir
4. **Link:** Guarda los links de descarga, los necesitarás para actualizaciones
5. **Android:** Es más fácil para compartir, úsalo para pruebas

---

## 🎯 Comandos Rápidos

```bash
# Ver builds anteriores
eas build:list

# Ver detalles de un build
eas build:view [BUILD_ID]

# Cancelar un build en progreso
eas build:cancel [BUILD_ID]

# Configurar proyecto (primera vez)
eas build:configure
```

---

## 📞 ¿Necesitas Ayuda?

Si algo falla:
1. Revisa los logs en: https://expo.dev/accounts/[tu-usuario]/projects
2. Verifica que estés logueado: `eas whoami`
3. Asegúrate de tener conexión a internet estable

---

**¿Listo para crear tu primer build?** Empieza con Android, es más fácil. 🚀

