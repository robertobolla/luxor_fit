# ✅ Checklist de Publicación - FitMind

## 📋 Pre-requisitos Obligatorios

### 1. 🔑 Variables de Entorno de la App Móvil

#### En archivo `.env` (desarrollo) o EAS Secrets (producción):

- [ ] **Clerk (Producción)**
  - [ ] `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...` (NO `pk_test_`)
  - Obtener en: [Clerk Dashboard](https://dashboard.clerk.com/) → API Keys → Publishable Key (Live Mode)

- [ ] **Supabase (Producción)**
  - [ ] `EXPO_PUBLIC_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `eyJ...` (anon key)
  - Obtener en: [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API

- [ ] **OpenAI (Opcional pero Recomendado)**
  - [ ] `EXPO_PUBLIC_OPENAI_API_KEY` = `sk-...`
  - Obtener en: [OpenAI Platform](https://platform.openai.com/) → API Keys

#### Configurar en EAS Secrets (para producción):
```bash
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-..."
```

---

### 2. 💳 Configuración de Stripe (Edge Functions)

#### En Supabase Edge Functions Secrets:

- [ ] **Stripe Secret Key (Producción)**
  - [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (NO `sk_test_`)
  - Obtener en: [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → API keys → Secret key (Live Mode)

- [ ] **Stripe Price ID (Producción)**
  - [ ] `STRIPE_PRICE_ID` = `price_...` (precio mensual de $12.99)
  - Crear en: [Stripe Dashboard](https://dashboard.stripe.com/products) → Products → Add Product
    - Nombre: "FitMind Mensual"
    - Precio: $12.99 USD
    - Recurrencia: Mensual
    - Copiar el Price ID

- [ ] **Stripe Webhook Secret (Producción)**
  - [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...`
  - Configurar en: [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
    - URL del webhook: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
    - Eventos a escuchar:
      - `checkout.session.completed`
      - `customer.subscription.created`
      - `customer.subscription.updated`
      - `customer.subscription.deleted`
    - Copiar el Signing Secret

- [ ] **APP_RETURN_URL**
  - [ ] `APP_RETURN_URL` = URL de tu Edge Function `return-to-app`
  - Ejemplo: `https://tu-proyecto.supabase.co/functions/v1/return-to-app`

- [ ] **Supabase Service Role Key**
  - [ ] `SUPABASE_SERVICE_ROLE` = Service Role Key de Supabase
  - Obtener en: [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API → Service Role Key
  - ⚠️ **MUY IMPORTANTE**: Mantener esta clave secreta, nunca exponerla en el cliente

#### Configurar en Supabase:
1. Ve a: [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → Edge Functions
2. Haz clic en "Secrets"
3. Agrega cada variable:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   APP_RETURN_URL=https://tu-proyecto.supabase.co/functions/v1/return-to-app
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE=eyJ... (service role key)
   ```

---

### 3. 📱 Edge Functions en Supabase

Verificar que estén desplegadas:

- [ ] `create-checkout-session` - Crea sesiones de Stripe Checkout
- [ ] `stripe-webhook` - Maneja eventos de Stripe
- [ ] `return-to-app` - Redirige de vuelta a la app después del pago

#### Desplegar Edge Functions:
```bash
# Desde la raíz del proyecto
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy return-to-app
```

O desde Supabase Dashboard:
1. Ve a: Edge Functions → Deploy
2. Sube cada función desde `supabase_edge_functions_*.ts`

---

### 4. 🗄️ Base de Datos (SQL Scripts)

Ejecutar todos los scripts SQL en orden:

- [ ] `supabase_subscriptions.sql` - Tabla de suscripciones
- [ ] `supabase_admin_roles.sql` - Tabla de roles de admin
- [ ] `supabase_admin_roles_fix_rls.sql` - Fix de RLS policies
- [ ] `supabase_partner_discount_system.sql` - Sistema de socios y descuentos
- [ ] `supabase_partner_tracking_payments.sql` - Tracking de usuarios activos
- [ ] `supabase_partner_commissions.sql` - Sistema de comisiones
- [ ] `supabase_exercise_videos.sql` - Tabla de videos de ejercicios
- [ ] `supabase_exercise_videos_storage.sql` - Storage bucket para videos

#### Verificar:
```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar vistas
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';
```

---

### 5. 🎨 Assets de la App

- [ ] **Icono de la App** (`assets/icon.png`)
  - Tamaño: 1024x1024px
  - Formato: PNG
  - Sin transparencia
  - Debe ser visible en fondos claros y oscuros

- [ ] **Adaptive Icon** (`assets/adaptive-icon.png`)
  - Android: 1024x1024px
  - PNG sin transparencia

- [ ] **Splash Screen** (`assets/splash.png`)
  - Tamaño: 2048x2048px recomendado
  - Formato: PNG
  - Color de fondo: `#1a1a1a` (coincide con app.json)

- [ ] **Notification Icon** (`assets/notification-icon.png`)
  - Tamaño: 96x96px (Android) / múltiples tamaños para iOS
  - Formato: PNG
  - Color de fondo: `#00D4AA` (color de la app)

- [ ] **Favicon** (`assets/favicon.png`)
  - Tamaño: 48x48px o 64x64px
  - Formato: PNG

---

### 6. 🗺️ Google Maps API Key

- [ ] **Configurar API Key de Google Maps**
  - [ ] Obtener en: [Google Cloud Console](https://console.cloud.google.com/)
  - [ ] Habilitar "Maps SDK for Android" y "Maps SDK for iOS"
  - [ ] Crear API Key y restringirla por dominio/aplicación
  - [ ] Agregar en `app.json`:
    ```json
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "TU_API_KEY_AQUI"
        }
      }
    }
    ```

---

### 7. 🔐 Configuración de Producción

#### Clerk:
- [ ] Cambiar a modo "Live" en [Clerk Dashboard](https://dashboard.clerk.com/)
- [ ] Verificar que las URLs de redirect estén configuradas
- [ ] Configurar dominios permitidos (si aplica)

#### Supabase:
- [ ] Verificar que el proyecto esté en plan de producción
- [ ] Configurar backups automáticos
- [ ] Revisar límites de almacenamiento y ancho de banda

#### Stripe:
- [ ] Cambiar a modo "Live" en [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Verificar información de negocio completa
- [ ] Configurar notificaciones por email
- [ ] Probar webhook en modo live

---

### 8. 📝 Legal y Compliance

- [ ] **Política de Privacidad**
  - Crear página web o documento
  - Explicar qué datos se recopilan (Apple Health, Google Fit)
  - Explicar cómo se usan los datos
  - Link en App Store / Play Store

- [ ] **Términos de Servicio**
  - Crear página web o documento
  - Explicar términos de uso de la app
  - Link en App Store / Play Store

- [ ] **GDPR Compliance** (si aplica)
  - Mecanismo para exportar datos del usuario
  - Mecanismo para eliminar cuenta y datos

---

### 9. 📦 Build de Producción

#### Android (Google Play Store):
```bash
eas build --profile production --platform android
```

- [ ] **App Bundle (AAB)** generado correctamente
- [ ] **Version Code** incrementado en `app.json`
- [ ] **Version Name** actualizado
- [ ] Probar instalación del APK/AAB en dispositivo real

#### iOS (App Store):
```bash
eas build --profile production --platform ios
```

- [ ] **IPA** generado correctamente
- [ ] **Bundle Identifier** verificado: `com.fitmind.app`
- [ ] **Version Code** incrementado en `app.json`
- [ ] **Version Name** actualizado
- [ ] Certificados de distribución configurados en EAS

---

### 10. 🧪 Testing Final

#### Funcionalidades Críticas:

- [ ] **Autenticación**
  - [ ] Registro nuevo usuario
  - [ ] Login con email/password
  - [ ] OAuth (Google, TikTok)
  - [ ] Logout
  - [ ] Recuperación de contraseña

- [ ] **Onboarding**
  - [ ] Flujo completo de onboarding
  - [ ] Datos se guardan correctamente
  - [ ] Generación de plan con IA

- [ ] **Pagos y Suscripciones**
  - [ ] Paywall se muestra para usuarios sin suscripción
  - [ ] Checkout de Stripe funciona
  - [ ] Prueba gratuita de 7 días funciona
  - [ ] Suscripción mensual se cobra después del trial
  - [ ] Códigos de descuento funcionan
  - [ ] Códigos de socios funcionan (acceso gratuito y descuentos)

- [ ] **Entrenamientos**
  - [ ] Ver planes de entrenamiento
  - [ ] Generar nuevo plan con IA
  - [ ] Adaptar plan existente con IA
  - [ ] Completar entrenamientos
  - [ ] Ver historial de entrenamientos

- [ ] **Nutrición**
  - [ ] Ver plan de nutrición semanal
  - [ ] Generar plan con IA
  - [ ] Registrar comidas
  - [ ] Ver objetivos y progreso

- [ ] **Dashboard**
  - [ ] Datos de salud se muestran correctamente
  - [ ] Navegación entre fechas
  - [ ] Pull-to-refresh funciona
  - [ ] Personalización de dashboard

- [ ] **Fotos de Progreso**
  - [ ] Tomar/subir fotos
  - [ ] Ver galería
  - [ ] Comparar fotos
  - [ ] Análisis con IA

- [ ] **Perfil**
  - [ ] Ver perfil
  - [ ] Editar perfil
  - [ ] Registrar peso
  - [ ] Ver progreso

- [ ] **Notificaciones**
  - [ ] Permisos se solicitan correctamente
  - [ ] Notificaciones se reciben
  - [ ] Recordatorios de comida funcionan
  - [ ] Recordatorios de entrenamiento funcionan

---

### 11. 📊 Monitoreo y Analytics

- [ ] **Configurar Sentry o similar** (opcional pero recomendado)
  - Error tracking
  - Performance monitoring
  - Crash reporting

- [ ] **Stripe Dashboard**
  - Revisar transacciones
  - Configurar alertas
  - Monitorear webhooks

- [ ] **Supabase Dashboard**
  - Monitorear uso de base de datos
  - Revisar logs de Edge Functions
  - Configurar alertas de límites

---

### 12. 🚀 Publicación en Tiendas

#### Google Play Store:

- [ ] **Cuenta de Desarrollador** creada ($25 USD única vez)
- [ ] **App Bundle** subido
- [ ] **Store Listing** completo:
  - [ ] Título (máx. 50 caracteres)
  - [ ] Descripción corta (máx. 80 caracteres)
  - [ ] Descripción completa (máx. 4000 caracteres)
  - [ ] Icono (512x512px)
  - [ ] Capturas de pantalla (mín. 2, máx. 8)
  - [ ] Video promocional (opcional)
  - [ ] Categoría y tags
  - [ ] Política de privacidad (URL)
  - [ ] Términos de servicio (URL)

- [ ] **Clasificación de Contenido**
  - [ ] Completar cuestionario
  - [ ] Indicar si es app de salud/fitness

- [ ] **Permisos**
  - [ ] Explicar por qué se necesitan (ubicación, cámara, etc.)

#### App Store (iOS):

- [ ] **Cuenta de Desarrollador** ($99 USD/año)
- [ ] **IPA** subido con App Store Connect
- [ ] **App Information** completo:
  - [ ] Nombre de la app
  - [ ] Subtítulo
  - [ ] Categoría
  - [ ] Palabras clave
  - [ ] URL de soporte
  - [ ] Política de privacidad (URL)

- [ ] **App Store Listing**:
  - [ ] Descripción
  - [ ] Capturas de pantalla para diferentes tamaños de iPhone/iPad
  - [ ] Video promocional (opcional)
  - [ ] Icono (1024x1024px)

- [ ] **Información de Salud**:
  - [ ] Indicar si es app de salud/fitness
  - [ ] Explicar uso de HealthKit

- [ ] **Aprobar para publicación**

---

### 13. ✅ Checklist Final

- [ ] Todas las variables de entorno configuradas (app y edge functions)
- [ ] Edge Functions desplegadas y funcionando
- [ ] Base de datos con todas las tablas creadas
- [ ] Stripe en modo Live configurado
- [ ] Webhook de Stripe configurado y probado
- [ ] Assets de la app actualizados
- [ ] Builds de producción generados y probados
- [ ] Testing completo de funcionalidades críticas
- [ ] Política de privacidad y términos de servicio publicados
- [ ] Listo para enviar a tiendas

---

## 🎯 Resumen de URLs Importantes

- **Clerk Dashboard**: https://dashboard.clerk.com/
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **OpenAI Platform**: https://platform.openai.com/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Expo Dashboard**: https://expo.dev/
- **Google Play Console**: https://play.google.com/console/
- **App Store Connect**: https://appstoreconnect.apple.com/

---

## 💡 Consejos Finales

1. **Test en dispositivos reales**: No confíes solo en simuladores
2. **Usa modo test primero**: Prueba todo en modo test antes de pasar a producción
3. **Mantén backups**: Asegúrate de tener backups de la base de datos
4. **Monitorea los primeros días**: Revisa logs y errores diariamente
5. **Comunica cambios**: Si hay cambios importantes, comunícalos a los usuarios

---

## 🐛 Si Algo Sale Mal

1. **Revisa logs**: Supabase Edge Functions, Stripe Webhooks, Expo EAS
2. **Verifica variables de entorno**: Asegúrate de que todas estén configuradas
3. **Prueba endpoints manualmente**: Usa Postman o curl para probar Edge Functions
4. **Revisa documentación**: Cada servicio tiene documentación detallada
5. **Pide ayuda**: Comunidades de Expo, Supabase, Stripe, etc.

¡Éxito con el lanzamiento! 🚀

