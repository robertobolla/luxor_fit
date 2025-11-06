# 🔧 Solución: Problema con QR de Expo

## Problemas Comunes y Soluciones

### 1. **Error: "Ha generado problemas inesperados"**

Este error generalmente ocurre por:

#### **Solución A: Usar Tunnel (Recomendado)**

Si estás en la misma red WiFi pero el QR no funciona, usa tunnel:

```bash
npx expo start --tunnel
```

Esto crea un túnel seguro que funciona incluso si estás en redes diferentes.

#### **Solución B: Verificar que estás en la misma red**

1. **PC y celular deben estar en la misma WiFi**
2. Verifica la IP local:
   ```bash
   # En Windows (PowerShell)
   ipconfig
   
   # Busca "IPv4 Address" (ej: 192.168.1.100)
   ```
3. Asegúrate de que el firewall no bloquee el puerto 8081

#### **Solución C: Usar LAN explícitamente**

```bash
npx expo start --lan
```

Esto fuerza la conexión por LAN local.

#### **Solución D: Reiniciar el servidor**

1. Detén el servidor actual (Ctrl+C)
2. Limpia la caché:
   ```bash
   npx expo start --clear
   ```
3. Reinicia:
   ```bash
   npx expo start
   ```

### 2. **Error: "Unable to connect to Expo"**

#### Solución:

```bash
# Usar tunnel siempre
npx expo start --tunnel

# O especificar la IP manualmente
npx expo start --host tunnel
```

### 3. **Problemas de Red/Firewall**

#### Windows Firewall:

1. Abre **Windows Defender Firewall**
2. Ve a **Configuración avanzada**
3. Crea regla de entrada para puerto **8081** (TCP)
4. O desactiva temporalmente el firewall para probar

### 4. **Problemas con Expo Go**

#### Verificar versión:

- Asegúrate de tener **Expo Go actualizado** en tu celular
- La versión debe ser compatible con Expo SDK 54

#### Alternativa: Development Build

Si Expo Go sigue dando problemas, usa Development Build:

```bash
# Para Android
npm run build:dev:android

# Para iOS
npm run build:dev:ios
```

### 5. **Usar URL Manual**

Si el QR no funciona, puedes:

1. Abre Expo Go en tu celular
2. Toca "Enter URL manually"
3. Ingresa la URL que aparece en la terminal (ej: `exp://192.168.1.100:8081`)

### 6. **Script de Inicio Mejorado**

Crea un script que siempre use tunnel:

```json
// package.json
{
  "scripts": {
    "start": "expo start --tunnel",
    "start:local": "expo start --lan",
    "start:clear": "expo start --clear --tunnel"
  }
}
```

## 🎯 Solución Rápida (Recomendada)

Ejecuta esto ahora:

```bash
npx expo start --tunnel --clear
```

Esto:
- ✅ Usa tunnel (funciona en cualquier red)
- ✅ Limpia la caché (elimina problemas previos)
- ✅ Debería generar un QR funcional

## 📱 Verificación en el Celular

1. **Abre Expo Go**
2. **Escanea el nuevo QR** (o ingresa URL manualmente)
3. **Espera a que cargue** (puede tardar 30-60 segundos la primera vez)

## ⚠️ Si Nada Funciona

### Opción 1: Development Build (Más Estable)

```bash
# Android
npm run build:dev:android

# iOS  
npm run build:dev:ios
```

Luego instala el APK/IPA en tu celular.

### Opción 2: Emulador Android

```bash
npx expo start --android
```

Esto abre automáticamente en el emulador.

## 🔍 Diagnóstico

Para ver qué está pasando:

```bash
# Ver logs detallados
npx expo start --tunnel --verbose
```

Esto mostrará información detallada de la conexión.

## 📞 Próximos Pasos

1. **Ejecuta**: `npx expo start --tunnel --clear`
2. **Escanea el nuevo QR**
3. **Si funciona**: Agrega `--tunnel` al script de inicio
4. **Si no funciona**: Usa Development Build

