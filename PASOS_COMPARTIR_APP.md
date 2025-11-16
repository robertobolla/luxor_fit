# 🚀 Pasos para Compartir la App

## ✅ Estado Actual
- ✅ EAS CLI instalado
- ✅ Logueado como: robertobolla9
- ✅ Proyecto configurado

---

## 📱 PASO 1: Crear Build para Android (APK)

### Ejecuta este comando:
```bash
npm run build:preview:android
```

**O directamente:**
```bash
eas build --profile preview --platform android
```

### ¿Qué pasará?
1. EAS te preguntará si quieres subir las credenciales → Responde **"Yes"**
2. El build comenzará (toma 15-30 minutos)
3. Puedes cerrar la terminal, se ejecuta en la nube
4. Recibirás un **link de descarga** cuando termine

### ⏱️ Tiempo estimado: 15-30 minutos

---

## 📲 PASO 2: Obtener el Link de Descarga

### Opción A: Desde la Terminal
- Al finalizar, verás un link como: `https://expo.dev/artifacts/...`
- **Copia este link**

### Opción B: Desde el Dashboard
1. Ve a: https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
2. Busca el build más reciente
3. Haz clic en "Download" o copia el link

---

## 🔗 PASO 3: Compartir el APK

### Método 1: Link Directo (Recomendado)
1. **Copia el link** de descarga
2. **Compártelo** por WhatsApp, Email, Telegram, etc.
3. La persona:
   - Abre el link en su Android
   - Descarga el APK
   - Instala (puede pedir permitir "Fuentes desconocidas")

### Método 2: QR Code
1. **Crea un QR** con el link (usa https://qr-code-generator.com)
2. **Comparte la imagen** del QR
3. La persona escanea y descarga

### Método 3: Google Drive
1. **Descarga el APK** desde el link
2. **Súbelo** a Google Drive
3. **Comparte el link** con permisos de descarga

---

## ⚠️ Instrucciones para los Usuarios

Cuando compartas el link, incluye estas instrucciones:

```
📱 Cómo instalar Luxor Fitness:

1. Abre el link en tu Android
2. Descarga el archivo APK
3. Si te pide "Permitir fuentes desconocidas", acepta
4. Abre el archivo descargado
5. Presiona "Instalar"
6. ¡Listo! Abre la app

⚠️ Nota: Si no puedes instalar, ve a:
Ajustes > Seguridad > Permitir fuentes desconocidas
```

---

## 🍎 Para iOS (Si Tienes Apple Developer)

Si quieres crear un build para iPhone:

```bash
npm run build:preview:ios
```

**Requisitos:**
- Cuenta de Apple Developer ($99/año)
- O solo puedes instalar en tu propio iPhone

---

## 🔄 Actualizar la App (Nuevos Builds)

Cuando hagas cambios:

1. **Actualiza la versión** en `app.json`:
   ```json
   "version": "1.0.2"  // Incrementa el número
   ```

2. **Crea nuevo build:**
   ```bash
   npm run build:preview:android
   ```

3. **Comparte el nuevo link**

---

## 📋 Comandos Útiles

```bash
# Ver todos tus builds
eas build:list

# Ver detalles de un build específico
eas build:view [BUILD_ID]

# Cancelar un build en progreso
eas build:cancel [BUILD_ID]
```

---

## ✅ ¿Listo?

**Ejecuta ahora:**
```bash
npm run build:preview:android
```

**Y espera a que termine. Te daré el link cuando esté listo.** 🚀

