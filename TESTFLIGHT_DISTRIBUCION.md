# 📲 Distribuir App en iOS sin App Store - TestFlight

## ✅ ¿Qué es TestFlight?

**TestFlight** es la plataforma oficial de Apple para distribuir apps en pruebas beta. Es **GRATIS** y permite:

- ✅ Hasta **10,000 testers** beta
- ✅ Distribución sin publicar en App Store pública
- ✅ Los usuarios solo necesitan instalar la app **TestFlight** (gratis)
- ✅ Actualizaciones automáticas para testers
- ✅ Feedback directo desde la app

---

## 📋 Requisitos

1. **Cuenta Apple Developer** ($99/año) - REQUERIDO para cualquier distribución iOS
2. **App Store Connect** configurado
3. Build de producción compilado

**Nota:** Necesitas la cuenta de Apple Developer de todos modos para publicar iOS, así que TestFlight es la mejor opción.

---

## 🚀 Paso a Paso

### Paso 1: Crear Build de Producción para iOS

```bash
# Desde la raíz del proyecto
eas build --profile production --platform ios
```

Este proceso:
- Tarda 20-45 minutos
- Compila la app en la nube
- Genera un `.ipa` listo para subir

---

### Paso 2: Subir a App Store Connect

Una vez que el build esté completo:

```bash
# Opción A: Automático desde EAS
eas submit --platform ios --latest
```

O manualmente:

1. Ve a https://appstoreconnect.apple.com
2. Selecciona tu app o créala si es primera vez
3. Ve a **TestFlight** tab
4. Sube el `.ipa` que descargaste de EAS

---

### Paso 3: Configurar TestFlight

1. En **App Store Connect** → **TestFlight**
2. Selecciona el build que subiste
3. Completa información requerida (screenshots, descripción, etc.)
4. Configura los grupos de testers

---

### Paso 4: Invitar Testers

#### Opción A: Testers Internos (Hasta 100)
- Solo miembros de tu equipo Apple Developer
- Reciben builds instantáneamente
- No requiere revisión de Apple

#### Opción B: Testers Externos (Hasta 10,000)
- Cualquier persona con email
- Primera versión requiere revisión de Apple (1-2 días)
- Versiones posteriores son instantáneas

**Para agregar testers externos:**

1. **TestFlight** → **External Testing**
2. Crea un grupo (ej: "Beta Testers")
3. Agrega emails de los testers
4. Asigna el build al grupo
5. Envía invitaciones

---

### Paso 5: Instalación para Testers

Los testers recibirán un email con:

1. Link para descargar **TestFlight** (si no lo tienen)
2. Link para unirse al beta
3. Una vez instalado TestFlight:
   - Abren el link de invitación
   - Se instala tu app automáticamente
   - ¡Listo para usar!

---

## 🔄 Actualizar Builds

Cuando hagas cambios:

1. Crea nuevo build:
   ```bash
   eas build --profile production --platform ios
   ```

2. Sube a TestFlight:
   ```bash
   eas submit --platform ios --latest
   ```

3. Los testers recibirán actualización automáticamente al abrir la app

---

## 📊 Alternativas (Si no tienes Apple Developer aún)

### Opción 2: Development Build Interno

**⚠️ Limitado a 100 dispositivos específicos**

Requiere:
- Obtener **UDID** de cada iPhone
- Agregar UDIDs en Apple Developer Portal
- Crear build de desarrollo

**Pasos:**

1. Obtener UDID de cada tester:
   - iPhone: **Ajustes** → **General** → **Acerca de** → **Identificador**
   
2. Agregar UDIDs en https://developer.apple.com/account/resources/devices/list

3. Crear build:
   ```bash
   eas build --profile development --platform ios
   ```

4. Distribuir el link de descarga que EAS genera

**Problema:** Cada dispositivo nuevo requiere agregar UDID manualmente.

---

## 💡 Comparación

| Característica | TestFlight | Development Build |
|---------------|------------|-------------------|
| Costo | $99/año (Apple Developer) | $99/año (Apple Developer) |
| Máx. Testers | 10,000 | 100 dispositivos |
| Facilidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Revisión Apple | Solo primera vez | No |
| Actualizaciones | Automáticas | Manuales |
| Feedback | Integrado | Manual |

---

## ✅ Recomendación

**Usa TestFlight** - Es la forma más profesional y escalable para distribuir betas en iOS.

**Si aún no tienes cuenta Apple Developer:**
- Tendrás que pagar $99/año de todos modos para publicar iOS
- TestFlight viene incluido con la cuenta
- Vale la pena para distribuir a muchos testers

---

## 🎯 Resumen Rápido

```bash
# 1. Crear build
eas build --profile production --platform ios

# 2. Subir a TestFlight
eas submit --platform ios --latest

# 3. Invitar testers desde App Store Connect
# 4. Los testers instalan TestFlight y tu app
# 5. ¡Listo!
```

---

¿Necesitas ayuda con algún paso específico?

