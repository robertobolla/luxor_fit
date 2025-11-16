# 🔧 Usar URL Fija con Development Build

## 🎯 Objetivo

Usar una URL fija para OAuth en lugar de tener que cambiar la URL cada vez que reinicias el servidor de Expo Go.

## ✅ Solución: Development Build

Un **Development Build** es como Expo Go, pero personalizado para tu app. Usa URLs fijas que no cambian.

### Tu URL Fija será:
```
luxorfitness://oauth-native-callback
```

Esta URL **nunca cambia**, sin importar cuántas veces reinicies el servidor.

---

## 📋 Pasos para Configurar

### Paso 1: Crear Development Build para iOS

Ejecuta este comando:

```bash
npx eas-cli build --profile development --platform ios
```

**Nota:** Este build puede tardar 10-20 minutos. Se ejecuta en la nube de EAS.

### Paso 2: Instalar el Development Build en tu iPhone

Una vez que termine el build:

1. **Opción A: Descargar directamente**
   - EAS te dará un link para descargar el `.ipa`
   - Ábrelo en tu iPhone
   - Ve a Configuración → General → Gestión de dispositivos
   - Confía en el certificado del desarrollador
   - Abre la app "Luxor Fitness" (Development Build)

2. **Opción B: Usar TestFlight (si lo prefieres)**
   - El build se subirá automáticamente si usas el perfil `preview`
   - Descárgalo desde TestFlight

### Paso 3: Configurar URL Fija en Clerk

1. Ve a: https://dashboard.clerk.com
2. **Configure** → **Native applications** → **iOS**
3. En **"Redirect URLs"**, agrega:
   ```
   luxorfitness://oauth-native-callback
   ```
4. Haz clic en **"Add"**
5. ✅ Esta URL **nunca cambiará**

### Paso 4: Usar el Development Build

1. **Inicia el servidor de desarrollo:**
   ```bash
   npm start
   ```

2. **Abre la app "Luxor Fitness" (Development Build)** en tu iPhone
   - NO uses Expo Go
   - Usa la app que acabas de instalar

3. **Escanea el QR** que aparece en la terminal
   - O presiona `i` para abrir en simulador

4. **¡Listo!** Ahora OAuth funcionará con la URL fija

---

## 🔄 Diferencias: Expo Go vs Development Build

| Característica | Expo Go | Development Build |
|---------------|---------|-------------------|
| **URL OAuth** | Cambia cada vez (`exp://...`) | Fija (`luxorfitness://`) |
| **Instalación** | Descargar Expo Go | Instalar tu app personalizada |
| **Tiempo setup** | Inmediato | 10-20 min (solo primera vez) |
| **Funcionalidades** | Limitadas | Completas (notificaciones, etc.) |
| **Recomendado para** | Pruebas rápidas | Desarrollo serio |

---

## 🚀 Comandos Rápidos

### Crear Development Build (primera vez):
```bash
npx eas-cli build --profile development --platform ios
```

### Iniciar servidor de desarrollo:
```bash
npm start
```

### Ver builds disponibles:
```bash
npx eas-cli build:list
```

---

## ⚠️ Notas Importantes

1. **Solo necesitas crear el Development Build UNA VEZ**
   - Después, solo actualizas el código con `npm start`
   - El build se actualiza automáticamente

2. **La URL fija es:**
   ```
   luxorfitness://oauth-native-callback
   ```
   - Esta es la única URL que necesitas en Clerk
   - Nunca cambiará

3. **Si cambias el scheme en `app.json`:**
   - Tendrás que crear un nuevo build
   - Y actualizar la URL en Clerk

4. **Para Android:**
   - El mismo proceso, pero con `--platform android`
   - La URL será la misma: `luxorfitness://oauth-native-callback`

---

## ✅ Verificación

Después de configurar todo:

1. ✅ Development Build instalado en tu iPhone
2. ✅ URL `luxorfitness://oauth-native-callback` agregada en Clerk
3. ✅ Servidor de desarrollo corriendo (`npm start`)
4. ✅ App abierta (Development Build, NO Expo Go)
5. ✅ Intenta iniciar sesión con Google/TikTok → Debería funcionar sin errores

---

## 🆘 Si Tienes Problemas

### Error: "Could not connect to development server"
- Asegúrate de que `npm start` esté corriendo
- Verifica que tu iPhone esté en la misma WiFi

### Error: "OAuth redirect URI doesn't match"
- Verifica que agregaste `luxorfitness://oauth-native-callback` en Clerk
- Asegúrate de que no tenga espacios ni comillas

### La app no se actualiza
- Cierra completamente la app
- Ábrela de nuevo
- O reinicia el servidor con `npm start -- --clear`

