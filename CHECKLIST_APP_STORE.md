# ✅ CHECKLIST COMPLETO PARA APROBACIÓN DE APP STORE

## 📱 **LUXOR FITNESS - Requisitos de Aprobación**

---

## ✅ **1. DOCUMENTACIÓN LEGAL (COMPLETADO)**

### Documentos Requeridos
- ✅ **Política de Privacidad**: https://luxor-fitness.gitbook.io/docs/legal/politica-de-privacidad
- ✅ **Términos y Condiciones**: https://luxor-fitness.gitbook.io/docs/legal/terminos-y-condiciones
- ✅ **Descargo de Responsabilidad Médica**: https://luxor-fitness.gitbook.io/docs/legal/descargo-de-responsabilidad

### Ubicación en la App
- ✅ Pantalla "Acerca de" (`app/about.tsx`) - Accesible desde Perfil
- ✅ Pantalla de Configuración (`app/settings.tsx`) - Sección "Legal"
- ✅ Pantalla de Paywall (`app/paywall.tsx`) - Footer legal

**Estado**: ✅ COMPLETO - Enlaces accesibles sin necesidad de suscripción

---

## ✅ **2. DESCARGO DE RESPONSABILIDAD MÉDICA (COMPLETADO)**

### Requisito de Apple
Como app de salud/fitness, DEBES incluir un disclaimer que indique que:
> "Esta aplicación NO sustituye consejo médico profesional. Consulta con un profesional de la salud antes de comenzar cualquier programa de ejercicio o nutrición."

### Implementación
- ✅ Banner prominente en pantalla "Acerca de" con icono de advertencia
- ✅ Enlace directo al documento completo en GitBook
- ✅ Visible en español e inglés (i18n)

**Estado**: ✅ COMPLETO

---

## ✅ **3. PERMISOS Y JUSTIFICACIONES (COMPLETADO)**

### Permisos Configurados en `app.json`

| Permiso | Descripción | Estado |
|---------|-------------|--------|
| HealthKit | "Luxor Fitness necesita acceso a tus datos de salud para mostrarte estadísticas personalizadas de pasos, calorías, distancia y sueño." | ✅ |
| Cámara | "Luxor Fitness necesita acceso a tu cámara para tomar fotos de progreso y documentar tus cambios físicos." | ✅ |
| Galería | "Luxor Fitness necesita acceso a tu galería para guardar y seleccionar fotos de progreso." | ✅ |
| Ubicación | "Luxor Fitness necesita acceso a tu ubicación para rastrear tus actividades físicas con GPS." | ✅ |
| Sensores de Movimiento | "Luxor Fitness necesita acceso a los sensores de movimiento para contar tus pasos." | ✅ |

**Estado**: ✅ COMPLETO - Todas las justificaciones son claras y específicas

---

## ✅ **4. ASSETS Y MULTIMEDIA (COMPLETADO)**

### Iconos y Splash Screen
- ✅ `assets/icon.png` - Icono principal (1024x1024px recomendado)
- ✅ `assets/adaptive-icon.png` - Icono adaptativo para Android
- ✅ `assets/splash.png` - Pantalla de carga
- ✅ `assets/luxor-logo.png` - Logo para splash screen
- ✅ `assets/notification-icon.png` - Icono de notificaciones

### Configuración en `app.json`
```json
{
  "icon": "./assets/icon.png",
  "splash": {
    "image": "./assets/splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#0a0a0a"
  }
}
```

**Estado**: ✅ COMPLETO

---

## ✅ **5. IN-APP PURCHASES (COMPLETADO)**

### RevenueCat Configurado
- ✅ Integración de RevenueCat
- ✅ Productos configurados (mensual/anual)
- ✅ Restauración de compras funcional
- ✅ Manejo de errores implementado
- ✅ Textos legales de suscripción incluidos

### Productos
- Monthly: `luxor_fitness_monthly` (7 días de prueba gratis)
- Yearly: `luxor_fitness_yearly` (Ahorro del 33%)

**Estado**: ✅ COMPLETO

---

## ✅ **6. INTERNACIONALIZACIÓN (COMPLETADO)**

### Idiomas Soportados
- ✅ Español (es-ES) - 1,443+ claves de traducción
- ✅ Inglés (en-US) - 1,443+ claves de traducción

### Cobertura
- ✅ 100% de la UI traducida
- ✅ Mensajes de error traducidos
- ✅ Tutoriales y ayuda traducidos
- ✅ Documentos legales en ambos idiomas

**Estado**: ✅ COMPLETO - Sincronización perfecta entre ES y EN

---

## ✅ **7. METADATA DE APP STORE CONNECT**

### Información Básica
- ✅ **Nombre**: Luxor Fitness
- ✅ **Bundle ID**: com.luxorfitness.app
- ✅ **Versión**: 1.0.8
- ✅ **Build Number**: 41
- ✅ **App Store ID**: 6755304934

### Categoría Recomendada
- **Primaria**: Health & Fitness
- **Secundaria**: Lifestyle

### Rating de Edad
- **Recomendado**: 4+ (No contiene contenido objetable)

**Estado**: ✅ COMPLETO - Listo para subir a App Store Connect

---

## ⚠️ **8. SCREENSHOTS (PENDIENTE - DEBES HACERLO TÚ)**

### Requisitos de Apple

#### iPhone (OBLIGATORIO)
- **6.7" (iPhone 15 Pro Max, 14 Pro Max, etc.)**
  - Resolución: 1290 x 2796 px
  - Mínimo: 1 screenshot, Máximo: 10
  
- **6.5" (iPhone 11 Pro Max, XS Max, etc.)**
  - Resolución: 1242 x 2688 px
  - Mínimo: 1 screenshot, Máximo: 10

#### iPad (OPCIONAL pero recomendado)
- **12.9" iPad Pro**
  - Resolución: 2048 x 2732 px
  - Mínimo: 1 screenshot, Máximo: 10

### Pantallas Recomendadas para Capturar
1. **Pantalla de Inicio/Home** - Muestra el dashboard principal
2. **Entrenamientos** - Plan de entrenamiento con ejercicios
3. **Nutrición** - Plan nutricional con comidas
4. **Progreso/Métricas** - Gráficos de evolución
5. **Perfil** - Información del usuario

### Herramientas Recomendadas
- **Simulator de Xcode** - Para capturas en diferentes tamaños
- **Fastlane Frameit** - Para agregar marcos de dispositivo
- **Figma/Canva** - Para diseñar screenshots con texto promocional

**Estado**: ⚠️ PENDIENTE - Debes capturar y subir a App Store Connect

---

## ⚠️ **9. DESCRIPCIÓN Y KEYWORDS (PENDIENTE)**

### App Description (Descripción de la App)
**Recomendación** (máximo 4000 caracteres):

```
🏋️ LUXOR FITNESS - Tu Entrenador Personal con IA

Alcanza tus objetivos fitness con planes personalizados de entrenamiento y nutrición generados por inteligencia artificial.

✨ CARACTERÍSTICAS PRINCIPALES:

🤖 PLANES CON IA
• Entrenamientos personalizados según tu nivel y objetivos
• Planes nutricionales adaptados a tus necesidades
• Recomendaciones basadas en evidencia científica

💪 ENTRENAMIENTOS
• Biblioteca completa de ejercicios con videos
• Seguimiento de progreso en tiempo real
• Planes para casa o gimnasio
• Adaptable a tu equipamiento disponible

🥗 NUTRICIÓN INTELIGENTE
• Planes de comidas semanales
• Recetas saludables y balanceadas
• Lista de compras automática
• Seguimiento de macros y calorías

📊 SEGUIMIENTO DE PROGRESO
• Fotos de progreso con análisis visual
• Gráficos de evolución de peso y medidas
• Integración con Apple Health
• Historial completo de entrenamientos

👥 COMUNIDAD
• Conecta con amigos
• Comparte tu progreso
• Modo entrenador para profesionales

🎯 PERFECTO PARA:
• Principiantes que quieren empezar
• Atletas que buscan optimizar resultados
• Personas con objetivos específicos (pérdida de peso, ganancia muscular, etc.)
• Entrenadores que gestionan múltiples clientes

💎 PRUEBA GRATIS DE 7 DÍAS
Accede a todas las funciones premium sin compromiso.

📱 INTEGRACIÓN CON APPLE HEALTH
Sincroniza automáticamente tus datos de salud.

⚠️ IMPORTANTE: Esta app no sustituye consejo médico profesional. Consulta con un profesional de la salud antes de comenzar cualquier programa de ejercicio o nutrición.

Descarga Luxor Fitness hoy y transforma tu vida fitness. 🚀
```

### Keywords (Palabras Clave)
**Máximo 100 caracteres** (separados por comas):

```
fitness,gym,workout,nutrition,diet,health,exercise,training,ai,personal trainer
```

### Promotional Text (Texto Promocional)
**Máximo 170 caracteres**:

```
🎉 Prueba gratis de 7 días. Planes de entrenamiento y nutrición con IA. ¡Transforma tu cuerpo hoy!
```

**Estado**: ⚠️ PENDIENTE - Debes copiar y adaptar en App Store Connect

---

## ⚠️ **10. CUENTA DE PRUEBA PARA REVISORES (RECOMENDADO)**

### ¿Por qué es importante?
Apple requiere que proporciones credenciales de prueba si tu app requiere login.

### Qué Proporcionar
En App Store Connect, sección "App Review Information":

```
Username: reviewer@luxorfitness.com
Password: [Crear una contraseña segura]

Notas adicionales:
- Esta cuenta tiene acceso completo a todas las funciones premium
- Incluye datos de ejemplo para facilitar la revisión
- No requiere verificación de email
```

### Cómo Crear la Cuenta
1. Registra una cuenta de prueba en tu app
2. Activa manualmente la suscripción premium en tu base de datos
3. Agrega datos de ejemplo (entrenamientos, comidas, etc.)
4. Verifica que todo funcione correctamente

**Estado**: ⚠️ RECOMENDADO - Facilita la aprobación

---

## ✅ **11. SIGN IN WITH APPLE (COMPLETADO)**

### Requisito de Apple (Guideline 4.8)
Si tu app usa servicios de login de terceros (Google, TikTok, etc.), **DEBES** ofrecer Sign in with Apple.

### Implementación
- ✅ OAuth de Apple configurado en Clerk
- ✅ Botón "Continuar con Apple" en login (`app/(auth)/login.tsx`)
- ✅ Botón "Continuar con Apple" en registro (`app/(auth)/register.tsx`)
- ✅ Traducciones en ES/EN
- ✅ Solo se muestra en iOS (Platform.OS === 'ios')
- ✅ Estilo según guías de Apple (botón negro con texto blanco)

### Métodos de Login Disponibles
- ✅ Email/Password
- ✅ Sign in with Apple (iOS only)
- ✅ Google Sign-In
- ✅ TikTok Sign-In

**Estado**: ✅ COMPLETO - Cumple con App Store Guidelines 4.8

---

## ✅ **12. CONFIGURACIÓN TÉCNICA (COMPLETADO)**

### Build Configuration
- ✅ `eas.json` configurado correctamente
- ✅ Bundle Identifier: `com.luxorfitness.app`
- ✅ App Store Connect ID: `6755304934`
- ✅ Expo EAS Project ID: `39f4fe90-c5cc-4c8a-baeb-7424da1c4f10`

### Encryption Declaration
- ✅ `ITSAppUsesNonExemptEncryption: false` - No requiere autorización de exportación

**Estado**: ✅ COMPLETO

---

## ✅ **13. ESTABILIDAD Y TESTING (DEBES VERIFICAR)**

### Checklist de Testing

#### Funcionalidad Básica
- [ ] La app inicia sin crashes
- [ ] Login/Registro funciona correctamente
- [ ] Onboarding se completa sin errores
- [ ] Navegación entre tabs funciona

#### Features Principales
- [ ] Generación de plan de entrenamiento con IA
- [ ] Generación de plan nutricional
- [ ] Registro de entrenamientos
- [ ] Registro de comidas
- [ ] Fotos de progreso
- [ ] Integración con Apple Health

#### In-App Purchases
- [ ] Paywall se muestra correctamente
- [ ] Compra de suscripción funciona
- [ ] Restauración de compras funciona
- [ ] Trial de 7 días se activa correctamente

#### Permisos
- [ ] Solicitud de permisos de HealthKit funciona
- [ ] Solicitud de permisos de cámara funciona
- [ ] Solicitud de permisos de ubicación funciona
- [ ] Mensajes de permisos son claros

#### Internacionalización
- [ ] Cambio de idioma funciona (ES ↔ EN)
- [ ] Todos los textos se muestran correctamente
- [ ] No hay textos sin traducir

**Estado**: ⚠️ DEBES VERIFICAR - Prueba exhaustivamente antes de enviar

---

## 📝 **14. NOTAS PARA REVISORES (RECOMENDADO)**

### En App Store Connect, sección "App Review Information" → "Notes"

```
Hola equipo de revisión de Apple,

Gracias por revisar Luxor Fitness. Aquí hay información importante:

FUNCIONALIDADES PRINCIPALES:
1. Generación de planes de entrenamiento con IA (OpenAI)
2. Generación de planes nutricionales personalizados
3. Seguimiento de progreso con fotos y métricas
4. Integración con Apple Health para sincronización de datos

PERMISOS REQUERIDOS:
• HealthKit: Para sincronizar pasos, calorías, distancia y sueño
• Cámara: Para fotos de progreso físico
• Galería: Para guardar y seleccionar fotos
• Ubicación: Para rastrear actividades al aire libre (opcional)

SUSCRIPCIÓN:
• Trial de 7 días gratis, luego $9.99/mes o $79.99/año
• Gestión de suscripción a través de RevenueCat
• Restauración de compras disponible

CUENTA DE PRUEBA:
Username: reviewer@luxorfitness.com
Password: [Tu contraseña]

IMPORTANTE:
• La app incluye descargo de responsabilidad médica
• Enlaces a Política de Privacidad y Términos disponibles sin suscripción
• Cumple con todas las guías de salud y fitness de Apple

Si tienen preguntas, estoy disponible en: soporte@luxorfitnessapp.com

Gracias,
Equipo Luxor Fitness
```

**Estado**: ⚠️ RECOMENDADO - Copia y adapta en App Store Connect

---

## 🚀 **15. PROCESO DE ENVÍO**

### Pasos para Enviar a Revisión

#### 1. Build de Producción
```bash
# Asegúrate de estar en la rama correcta
git checkout main

# Incrementa el buildNumber en app.json si es necesario
# Actualmente: buildNumber: "41"

# Genera el build de producción
eas build --platform ios --profile production

# Espera a que termine (puede tomar 15-30 minutos)
```

#### 2. Subir a App Store Connect
```bash
# Una vez que el build esté listo, súbelo automáticamente
eas submit --platform ios --profile production

# O hazlo manualmente desde App Store Connect
```

#### 3. Completar Metadata en App Store Connect
1. Ve a https://appstoreconnect.apple.com
2. Selecciona tu app "Luxor Fitness"
3. Completa:
   - [ ] Screenshots (OBLIGATORIO)
   - [ ] Descripción de la app
   - [ ] Keywords
   - [ ] Texto promocional
   - [ ] Categoría: Health & Fitness
   - [ ] Rating de edad: 4+
   - [ ] Información de contacto
   - [ ] URL de soporte: https://luxorfitnessapp.com
   - [ ] URL de marketing: https://luxorfitnessapp.com
   - [ ] Política de privacidad: https://luxor-fitness.gitbook.io/docs/legal/politica-de-privacidad

#### 4. Configurar Precios y Disponibilidad
- [ ] Precio: Gratis (con IAP)
- [ ] Disponibilidad: Todos los territorios (o selecciona específicos)

#### 5. Información de Revisión
- [ ] Agrega cuenta de prueba
- [ ] Agrega notas para revisores
- [ ] Información de contacto

#### 6. Enviar a Revisión
- [ ] Revisa que todo esté completo
- [ ] Click en "Submit for Review"
- [ ] Espera la aprobación (típicamente 24-48 horas)

**Estado**: ⚠️ PENDIENTE - Sigue estos pasos cuando estés listo

---

## ⏱️ **TIEMPOS ESTIMADOS**

| Tarea | Tiempo Estimado |
|-------|----------------|
| Capturar screenshots | 30-60 minutos |
| Escribir descripción y keywords | 20-30 minutos |
| Crear cuenta de prueba | 10 minutos |
| Build de producción (EAS) | 15-30 minutos |
| Completar metadata en App Store Connect | 30-45 minutos |
| Revisión de Apple | 24-48 horas |

**Total**: ~2-3 horas de trabajo + 1-2 días de espera

---

## 📋 **RESUMEN FINAL**

### ✅ COMPLETADO (Listo para enviar)
- ✅ Documentación legal (Privacy, Terms, Disclaimer)
- ✅ Pantalla "Acerca de" con enlaces legales
- ✅ Permisos correctamente configurados y justificados
- ✅ Assets (iconos, splash screen)
- ✅ In-App Purchases con RevenueCat
- ✅ Internacionalización (ES/EN) 100%
- ✅ **Sign in with Apple** (Cumple Guidelines 4.8)
- ✅ Configuración técnica (app.json, eas.json)

### ⚠️ PENDIENTE (Debes completar)
- ⚠️ **Screenshots** para App Store Connect (OBLIGATORIO)
- ⚠️ **Descripción y keywords** en App Store Connect
- ⚠️ **Cuenta de prueba** para revisores (RECOMENDADO)
- ⚠️ **Testing exhaustivo** de todas las funciones
- ⚠️ **Build de producción** y envío a revisión

---

## 🎯 **PRÓXIMOS PASOS INMEDIATOS**

1. **HOY**: Captura screenshots en diferentes tamaños de iPhone
2. **HOY**: Escribe la descripción y keywords
3. **HOY**: Crea cuenta de prueba para revisores
4. **HOY**: Testing exhaustivo de la app
5. **MAÑANA**: Build de producción con `eas build`
6. **MAÑANA**: Completar metadata en App Store Connect
7. **MAÑANA**: Enviar a revisión

---

## 📞 **CONTACTO Y RECURSOS**

### Documentación Oficial
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Health & Fitness Apps**: https://developer.apple.com/app-store/review/guidelines/#health-and-health-research
- **Expo EAS Build**: https://docs.expo.dev/build/introduction/
- **App Store Connect**: https://appstoreconnect.apple.com

### Soporte
- **Email**: soporte@luxorfitnessapp.com
- **Website**: https://luxorfitnessapp.com
- **Documentación**: https://luxor-fitness.gitbook.io/docs

---

**¡Estás a solo unos pasos de publicar en la App Store! 🚀**

*Última actualización: Enero 2025*

