# 🍎 Guía Completa: Compartir App en iPhone

## 📋 Resumen del Proceso

1. ✅ Crear cuenta Apple Developer ($99/año)
2. ✅ Configurar credenciales en EAS
3. ✅ Crear build para iOS
4. ✅ Distribuir vía TestFlight (recomendado) o Ad-Hoc

**Tiempo total:** 1-2 horas (la mayoría es esperar)

---

## 🚀 PASO 1: Crear Cuenta Apple Developer

### 1.1 Ir al sitio de Apple Developer
Ve a: **https://developer.apple.com/programs/**

### 1.2 Iniciar el proceso
1. Haz clic en **"Enroll"** o **"Inscríbete"**
2. Inicia sesión con tu **Apple ID** (o créalo si no tienes)
3. Si no tienes Apple ID: https://appleid.apple.com

### 1.3 Completar el registro
1. **Tipo de cuenta:** Selecciona "Individual" (si eres persona física)
2. **Información personal:** Completa tus datos
3. **Pago:** $99 USD/año (se renueva automáticamente)
4. **Verificación:** Apple puede tardar 24-48 horas en aprobar

### 1.4 Verificar aprobación
- Revisa tu email
- O ve a: https://developer.apple.com/account
- Cuando veas "Active" en tu cuenta, estás listo

**⏱️ Tiempo:** 24-48 horas (puede ser instantáneo a veces)

---

## 🔧 PASO 2: Configurar Proyecto con EAS

### 2.1 Verificar que estás logueado en EAS
```bash
eas whoami
```

Si no estás logueado:
```bash
eas login
```

### 2.2 Configurar credenciales de iOS
```bash
eas credentials
```

**Durante la configuración:**
1. Selecciona: **"ios"**
2. Selecciona: **"preview"** (o "production" para TestFlight)
3. EAS te preguntará sobre tu cuenta Apple Developer
4. Responde las preguntas:
   - **"Do you have an Apple Developer account?"** → **Y** (Yes)
   - **"Would you like EAS to manage your credentials?"** → **Y** (Yes)
   - Ingresa tu **Apple ID** y **contraseña** cuando te lo pida
   - EAS configurará todo automáticamente

**⏱️ Tiempo:** 5-10 minutos

---

## 📦 PASO 3: Crear Build para iOS

### Opción A: Build para TestFlight (Recomendado)

**TestFlight es la mejor opción porque:**
- ✅ Hasta 10,000 testers
- ✅ Fácil de compartir (solo envían email)
- ✅ Actualizaciones automáticas
- ✅ Los usuarios solo instalan TestFlight (gratis)

```bash
npm run build:preview:ios
```

O directamente:
```bash
eas build --profile preview --platform ios
```

**Durante el build:**
- EAS usará las credenciales que configuraste
- El build tomará **20-40 minutos**
- Puedes cerrar la terminal, se ejecuta en la nube

**⏱️ Tiempo:** 20-40 minutos

---

## 📲 PASO 4: Distribuir la App

### Opción A: TestFlight (Más Fácil - Recomendado)

#### 4.1 Subir a App Store Connect

Una vez que el build termine:

```bash
eas submit --platform ios --latest
```

O manualmente:
1. Ve a: https://appstoreconnect.apple.com
2. Inicia sesión con tu Apple ID
3. Crea una nueva app (si es primera vez):
   - Nombre: "Luxor Fitness"
   - Bundle ID: `com.luxorfitness.app` (debe coincidir con `app.json`)
   - Idioma: Español
4. Ve a la pestaña **"TestFlight"**
5. Sube el archivo `.ipa` que descargaste de EAS

#### 4.2 Configurar TestFlight

1. En **TestFlight**, selecciona el build que subiste
2. Completa la información requerida:
   - Descripción de la app
   - Screenshots (opcional para pruebas internas)
   - Notas de versión
3. Haz clic en **"Submit for Review"** (solo primera vez para testers externos)

#### 4.3 Invitar Testers

**Para Testers Internos (Hasta 100, instantáneo):**
1. En TestFlight → **"Internal Testing"**
2. Agrega emails de los testers
3. Selecciona el build
4. Envíales el link de invitación

**Para Testers Externos (Hasta 10,000, requiere aprobación primera vez):**
1. En TestFlight → **"External Testing"**
2. Crea un grupo (ej: "Beta Testers")
3. Agrega emails
4. Selecciona el build
5. Envía para revisión (primera vez toma 1-2 días)
6. Después de aprobado, invita testers

#### 4.4 Los usuarios reciben:
- Email de invitación de Apple
- Instalan **TestFlight** desde App Store (gratis)
- Abren TestFlight y aceptan la invitación
- Descargan tu app
- ¡Listo!

---

### Opción B: Ad-Hoc Distribution (Sin TestFlight)

**Limitaciones:**
- ⚠️ Solo hasta **100 dispositivos**
- ⚠️ Necesitas el **UDID** de cada iPhone
- ⚠️ Más complicado de compartir

#### 4.1 Obtener UDIDs de los usuarios

Cada usuario debe darte su UDID:
1. En iPhone: **Ajustes** → **General** → **Acerca de**
2. Buscar **"Identificador"** (ese es el UDID)
3. Mantener presionado y copiar
4. Enviártelo

**O usar sitio web:**
- Pedirles que vayan a: https://udid.tech
- Seguir instrucciones
- Copiar UDID

#### 4.2 Registrar UDIDs en Apple Developer

1. Ve a: https://developer.apple.com/account/resources/devices/list
2. Haz clic en **"+"** (Agregar dispositivo)
3. Completa:
   - **Nombre:** Nombre del usuario
   - **UDID:** El identificador que te envió
   - **Tipo:** iPhone
4. Haz clic en **"Continuar"** y **"Registrar"**
5. Repite para todos (hasta 100)

#### 4.3 Crear build Ad-Hoc

```bash
eas build --profile preview --platform ios --distribution ad-hoc
```

#### 4.4 Compartir el IPA

1. Descarga el `.ipa` del build
2. Compártelo (Google Drive, Dropbox, etc.)
3. Los usuarios:
   - Descargan el `.ipa`
   - Lo instalan vía iTunes/Finder (macOS) o AltStore
   - Confían en el certificado en Ajustes

**⚠️ Más complicado, no recomendado para muchos usuarios**

---

## ✅ Checklist Completo

### Antes de empezar:
- [ ] Tener Apple ID
- [ ] Tarjeta de crédito para pagar $99/año
- [ ] Esperar aprobación de Apple Developer (24-48h)

### Configuración:
- [ ] `eas login`
- [ ] `eas credentials` (configurar iOS)
- [ ] Verificar que las credenciales estén correctas

### Build:
- [ ] `npm run build:preview:ios`
- [ ] Esperar 20-40 minutos
- [ ] Verificar que el build fue exitoso

### Distribución (TestFlight):
- [ ] Crear app en App Store Connect
- [ ] Subir build a TestFlight
- [ ] Configurar información de la app
- [ ] Invitar testers
- [ ] Enviar para revisión (si es primera vez externa)

---

## 🎯 Recomendación Final

**Usa TestFlight:**
- ✅ Es la forma más fácil
- ✅ No necesitas UDIDs
- ✅ Hasta 10,000 usuarios
- ✅ Actualizaciones automáticas
- ✅ Los usuarios solo instalan TestFlight

**Solo usa Ad-Hoc si:**
- Tienes menos de 100 usuarios
- No quieres usar TestFlight
- Necesitas distribución directa

---

## 🚀 ¿Listo para Empezar?

**Paso 1:** Ve a https://developer.apple.com/programs/ y crea tu cuenta.

**Cuando esté aprobada, avísame y continuamos con el siguiente paso.** 🎉

---

## 📞 ¿Necesitas Ayuda?

Si algo falla:
1. Revisa los logs en: https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
2. Verifica tu cuenta Apple Developer: https://developer.apple.com/account
3. Revisa App Store Connect: https://appstoreconnect.apple.com

