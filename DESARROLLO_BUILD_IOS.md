# 📱 Development Build para iOS - Guía Completa

## ✅ ¿Qué es Development Build?

Un **Development Build** es una versión de la app que puedes instalar directamente en dispositivos iPhone específicos, sin pasar por la App Store.

**Limitaciones:**
- ⚠️ Máximo **100 dispositivos**
- ⚠️ Requiere obtener **UDID** de cada iPhone
- ⚠️ El certificado expira cada 7 días (hay que renovar)
- ⚠️ Solo funciona con los UDIDs registrados

**Ventajas:**
- ✅ No requiere cuenta App Store Connect configurada completamente
- ✅ Instalación directa
- ✅ Útil para pruebas con pocos usuarios

---

## 📋 Requisitos

1. **Cuenta Apple Developer** ($99/año)
2. Acceso a https://developer.apple.com/account
3. UDIDs de los iPhones que usarán la app

---

## 🚀 Paso a Paso

### Paso 1: Obtener UDIDs de los Testers

Cada persona que probará la app necesita darte su **UDID**.

**Instrucciones para los testers:**

1. En su iPhone, abrir **Ajustes**
2. Ir a **General** → **Acerca de**
3. Buscar **Identificador** (ese es el UDID)
4. Mantener presionado y copiar
5. Enviártelo a ti

**O usar un sitio web (más fácil):**
- Pedirles que vayan a https://udid.tech en Safari
- Seguir las instrucciones
- El sitio les mostrará el UDID para copiar

Ver `OBTENER_UDID_IPHONE.md` para más métodos.

---

### Paso 2: Registrar UDIDs en Apple Developer

1. Ve a https://developer.apple.com/account/resources/devices/list
2. Inicia sesión con tu cuenta Apple Developer
3. Haz clic en **"+"** (Agregar dispositivo)
4. Completa:
   - **Nombre**: Nombre del tester (ej: "Juan Pérez")
   - **UDID**: El identificador que te envió
   - **Tipo**: iPhone
5. Haz clic en **Continuar** y luego **Registrar**
6. Repite para todos los testers (hasta 100)

**Nota:** Puedes registrar múltiples dispositivos, pero hay un límite de 100 por cuenta por año.

---

### Paso 3: Crear Development Build

```bash
# Desde la raíz del proyecto
eas build --profile development --platform ios
```

**Durante el proceso te preguntará:**
- ¿Generar certificado de desarrollo? → **Y** (sí)
- ¿Generar provisioning profile? → **Y** (sí)
- Selecciona los dispositivos → Elige los que registraste

**Tiempo:** 20-45 minutos

---

### Paso 4: Descargar e Instalar en iPhones

Una vez que el build esté completo:

1. **Obtén el link de descarga:**
   - Ve a https://expo.dev/accounts/robertobolla9/projects/fitmind/builds
   - Encuentra el build recién creado
   - Haz clic para ver detalles
   - Copia el **link de descarga**

2. **Distribuye el link a los testers:**
   - Envíales el link (email, WhatsApp, etc.)

3. **Los testers instalan:**
   - Abren el link en su iPhone (Safari)
   - Siguen las instrucciones para instalar
   - Pueden necesitar ir a **Ajustes** → **General** → **VPN y gestión de dispositivos**
   - Confiar en el certificado de desarrollo

---

## 🔄 Renovar Certificado (Cada 7 días)

Los certificados de desarrollo expiran después de 7 días. Para renovar:

```bash
# Simplemente crea un nuevo build
eas build --profile development --platform ios
```

Los dispositivos seguirán funcionando con el nuevo build.

---

## 📝 Archivo de Referencia de UDIDs

Te recomiendo crear un archivo para mantener registro:

```txt
UDIDs_registrados.txt:

- Juan Pérez: 00008030-001E1D1234567890
- María García: 00008030-001E1D0987654321
- Carlos López: 00008030-001E1D1122334455
...
```

---

## ⚠️ Problemas Comunes

### "Device not registered"
- El UDID no está registrado en Apple Developer
- Verifica que lo agregaste correctamente
- Espera unos minutos después de registrar (puede tardar en propagarse)

### "Provisioning profile expired"
- El certificado expiró (después de 7 días)
- Crea un nuevo build: `eas build --profile development --platform ios`

### "App cannot be installed"
- Verifica que el UDID esté registrado
- El usuario debe confiar en el certificado:
  - **Ajustes** → **General** → **VPN y gestión de dispositivos**
  - Confiar en el certificado del desarrollador

---

## 🎯 Flujo Completo Resumido

```bash
# 1. Recopilar UDIDs de los testers
# 2. Registrar en Apple Developer Portal
# 3. Crear build
eas build --profile development --platform ios

# 4. Distribuir el link de descarga
# 5. Los testers instalan desde el link
# 6. Renovar cada 7 días si es necesario
```

---

## 💡 Consejos

1. **Organiza los UDIDs**: Usa un archivo Excel/Google Sheets para mantener registro
2. **Comunica claramente**: Envía instrucciones simples a los testers
3. **Renueva proactivamente**: Crea nuevo build antes de que expire (día 6)
4. **Límite de 100**: Si necesitas más, considera TestFlight

---

## 📊 Comparación: Development Build vs TestFlight

| Característica | Development Build | TestFlight |
|---------------|-------------------|------------|
| Máx. Dispositivos | 100 | 10,000 |
| Requiere UDID | ✅ Sí | ❌ No |
| Expira en | 7 días | 90 días |
| Facilidad | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Instalación | Link directo | App TestFlight |
| Renovación | Manual cada 7 días | Automática |

---

¿Listo para empezar? Sigue los pasos arriba. 🚀

