# 🚀 Próximos Pasos para Lanzar a Producción

## ✅ Si Stripe Ya Funciona, Esto Es Lo Que Sigue:

---

## 1. 📱 Crear Builds de Producción de la App

### Para iOS (App Store):

1. **Configurar Apple Developer Account:**
   - Necesitas cuenta de Apple Developer ($99/año)
   - [developer.apple.com](https://developer.apple.com/)

2. **Configurar Certificados y Provisioning Profiles:**
   ```bash
   # EAS maneja esto automáticamente, pero verifica:
   eas build:configure
   ```

3. **Crear Build de iOS:**
   ```bash
   eas build --platform ios --profile production
   ```
   - Esto toma ~15-30 minutos
   - Genera un archivo `.ipa`

4. **Subir a App Store Connect:**
   ```bash
   eas submit --platform ios
   ```
   - O manualmente desde App Store Connect

### Para Android (Google Play):

1. **Configurar Google Play Console:**
   - Cuenta de Google Play Developer ($25 una vez)
   - [play.google.com/console](https://play.google.com/console)

2. **Crear Build de Android:**
   ```bash
   eas build --platform android --profile production
   ```
   - Esto toma ~15-20 minutos
   - Genera un archivo `.aab` (Android App Bundle)

3. **Subir a Google Play Console:**
   ```bash
   eas submit --platform android
   ```
   - O manualmente desde Google Play Console

---

## 2. 🌐 Desplegar Landing Page

### Opción Recomendada: Netlify (Gratis)

1. **Crear cuenta en Netlify:**
   - [netlify.com](https://netlify.com)
   - Conéctate con GitHub o crea cuenta

2. **Desplegar:**
   - Arrastra la carpeta `website/` a Netlify
   - O usa CLI:
   ```bash
   cd website
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **Obtener URL:**
   - Netlify te da una URL como: `luxor-fitness.netlify.app`
   - O puedes conectar tu dominio personalizado

### Otras Opciones:
- **Vercel:** Similar a Netlify
- **GitHub Pages:** Gratis con GitHub
- **Firebase Hosting:** Gratis con Google

---

## 3. 📝 Preparar Contenido para App Stores

### App Store (iOS) - Requiere:

- [ ] **Nombre de la App:** "Luxor Fitness"
- [ ] **Descripción corta:** "Tu entrenador personal con IA"
- [ ] **Descripción completa:** Detalle de todas las características
- [ ] **Palabras clave:** fitness, entrenamiento, IA, nutrición
- [ ] **Categorías:** Salud y Fitness
- [ ] **Capturas de pantalla:**
   - iPhone: 6.5", 5.5", 6.7"
   - iPad (si soporta tablet)
- [ ] **Icono de la App:** 1024x1024px
- [ ] **Política de Privacidad:** URL de tu landing page + `/privacy.html`
- [ ] **Soporte:** Email de contacto

### Google Play (Android) - Requiere:

- [ ] **Nombre de la App:** "Luxor Fitness"
- [ ] **Descripción corta:** "Tu entrenador personal con IA"
- [ ] **Descripción completa:** Mismo que iOS
- [ ] **Categoría:** Salud y Fitness
- [ ] **Capturas de pantalla:**
   - Mínimo 2, máximo 8
   - Mínimo 320px de alto
- [ ] **Icono:** 512x512px
- [ ] **Banner destacado:** 1024x500px (opcional)
- [ ] **Política de Privacidad:** URL
- [ ] **Contenido clasificado:** PEGI/USK ratings

---

## 4. 🔧 Configuraciones Finales

### Variables de Entorno en Producción:

**En EAS Secrets (ya deberías tenerlas):**
```bash
# Verificar que estén todas
eas secret:list

# Si falta alguna:
eas secret:create --scope project --name VARIABLE_NAME --value "valor"
```

**Variables necesarias:**
- ✅ `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (modo Live)
- ✅ `EXPO_PUBLIC_SUPABASE_URL`
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `EXPO_PUBLIC_OPENAI_API_KEY` (opcional)

### Verificar Edge Functions:

```bash
# Verificar que estén desplegadas
supabase functions list

# Si falta alguna:
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy return-to-app
```

---

## 5. ✅ Checklist Final Antes de Lanzar

### Funcionalidad:
- [ ] Stripe checkout funciona correctamente
- [ ] Webhooks reciben eventos
- [ ] Suscripciones se crean en la base de datos
- [ ] Paywall funciona (muestra/oculta según suscripción)
- [ ] Login/Registro funcionan
- [ ] Onboarding completo funciona
- [ ] Planes de entrenamiento se generan
- [ ] Integración con Health/Google Fit funciona (si aplica)
- [ ] Notificaciones funcionan

### Seguridad:
- [ ] Todas las claves están en modo Live (no test)
- [ ] `.env` no está en Git
- [ ] Secrets no están expuestos
- [ ] RLS policies configuradas correctamente
- [ ] HTTPS en todas las conexiones

### Legal:
- [ ] Política de Privacidad en la landing page
- [ ] Términos de Servicio en la landing page
- [ ] Links en App Store/Play Store apuntan a las políticas
- [ ] Email de soporte configurado

### Testing:
- [ ] Probar checkout con ambos planes (mensual y anual)
- [ ] Probar cancelación de suscripción
- [ ] Probar flujo completo de usuario nuevo
- [ ] Probar en dispositivos reales (iOS y Android)

---

## 6. 📊 Configurar Analytics y Monitoreo

### Opcional pero Recomendado:

1. **Firebase Analytics** (Gratis):
   - Track de eventos de usuario
   - Conversión de suscripciones
   - Retención de usuarios

2. **Sentry** (Error Tracking):
   - Monitoreo de errores en producción
   - Alertas automáticas

3. **Stripe Dashboard:**
   - Monitorear pagos
   - Ver suscripciones activas
   - Revisar webhooks

4. **Supabase Dashboard:**
   - Monitorear uso de base de datos
   - Ver logs de Edge Functions
   - Revisar suscripciones en la tabla

---

## 7. 🎯 Estrategia de Lanzamiento

### Soft Launch (Recomendado):

1. **Fase 1: Beta Testing**
   - Invita a 10-20 usuarios beta
   - Recolecta feedback
   - Ajusta problemas

2. **Fase 2: Lanzamiento Limitado**
   - Publica en App Store/Play Store
   - Sin marketing masivo todavía
   - Monitorea métricas

3. **Fase 3: Lanzamiento Completo**
   - Marketing en redes sociales
   - Publicidad (si aplica)
   - Press release

---

## 8. 📱 Actualizar Links en la Landing Page

Cuando tengas los links de las stores:

1. **Actualizar `website/index.html`:**
   - Busca los botones "Descargar App"
   - Reemplaza con links reales:
   ```html
   <a href="https://apps.apple.com/app/luxor-fitness/idXXXXXXXX" class="btn btn-primary">
     Descargar en App Store
   </a>
   <a href="https://play.google.com/store/apps/details?id=com.luxorfitness.app" class="btn btn-secondary">
     Descargar en Google Play
   </a>
   ```

---

## 9. 🔄 Flujo de Actualizaciones Futuras

### Para Actualizar la App:

```bash
# 1. Hacer cambios en el código
# 2. Crear nuevo build
eas build --platform all --profile production

# 3. Subir a stores
eas submit --platform all

# O usar OTA Updates (para cambios pequeños):
eas update --branch production --message "Descripción del cambio"
```

---

## 10. 📈 Métricas a Monitorear Después del Lanzamiento

- **Conversión:** % de usuarios que se suscriben
- **Retención:** % de usuarios activos día 1, 7, 30
- **Churn:** % de cancelaciones
- **LTV:** Lifetime Value (ingresos por usuario)
- **CAC:** Customer Acquisition Cost (costo de adquirir usuario)
- **MRR:** Monthly Recurring Revenue

---

## 🎉 ¡Listo para Lanzar!

Una vez completado todo lo anterior:

1. ✅ **Publica en App Store y Google Play**
2. ✅ **Activa tu landing page**
3. ✅ **Comienza marketing**
4. ✅ **Monitorea métricas diariamente**

---

## 🆘 Si Necesitas Ayuda

- **Documentación Expo:** [docs.expo.dev](https://docs.expo.dev)
- **Documentación Stripe:** [stripe.com/docs](https://stripe.com/docs)
- **Documentación Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **Foros de Expo:** [forums.expo.dev](https://forums.expo.dev)

¡Mucha suerte con el lanzamiento! 🚀

