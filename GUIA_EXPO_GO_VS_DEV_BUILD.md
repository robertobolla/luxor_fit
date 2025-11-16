# 📱 Expo Go vs Development Build

## Tu Situación Actual

Tienes `expo-dev-client` instalado, lo que significa que el proyecto está configurado para **Development Builds**, pero puedes usar **Expo Go** también.

---

## 🚀 Opción 1: Expo Go (Más Rápido - Recomendado para Ahora)

### Ventajas:
- ✅ No necesitas compilar nada
- ✅ Escaneas QR y listo
- ✅ Perfecto para desarrollo rápido

### Desventajas:
- ⚠️ Algunos módulos nativos pueden no funcionar
- ⚠️ Notificaciones push limitadas en iOS

### Cómo usar:

1. **Instala Expo Go** en tu iPhone desde App Store

2. **Inicia el servidor:**
   ```bash
   npm start
   ```

3. **Escanea el QR** con la cámara del iPhone
   - Se abrirá automáticamente en Expo Go

4. **Si no conecta:**
   - Presiona "Reload JS" en la app
   - O reinicia el servidor: `npm start -- --clear`

---

## 🔧 Opción 2: Development Build (Mejor a Largo Plazo)

### Ventajas:
- ✅ Todos los módulos nativos funcionan
- ✅ Notificaciones push completas
- ✅ Más cercano a producción

### Desventajas:
- ⚠️ Requiere compilar primero (toma tiempo)
- ⚠️ Necesitas tener el build instalado

### Cómo usar:

1. **Compila el build (solo la primera vez):**
   ```bash
   npm run build:dev:ios
   ```
   - Esto toma 10-20 minutos
   - Te dará un link para instalar en tu iPhone

2. **Instala el build** en tu iPhone

3. **Inicia el servidor:**
   ```bash
   npm start
   ```

4. **Abre el build** y se conectará automáticamente

---

## 💡 Recomendación para Ti

**Para desarrollo rápido ahora: Usa Expo Go**

1. Instala Expo Go desde App Store
2. Ejecuta `npm start`
3. Escanea el QR
4. Listo

**Para cuando vayas a producción o necesites todas las funciones: Development Build**

---

## 🔄 Cambiar Entre Modos

### Usar Expo Go:
```bash
npm start
```
- Escanea QR con Expo Go

### Usar Development Build:
```bash
npm start
```
- Abre el development build instalado
- Se conectará automáticamente

**Nota:** El mismo comando `npm start` funciona para ambos, solo cambia qué app usas para escanear/abrir.

---

## ❓ ¿Cuál Estás Usando Ahora?

Si ves el error "Could not connect to development server", probablemente:

1. **Estás usando Development Build** pero el servidor no está corriendo
   - Solución: Ejecuta `npm start` y espera a que aparezca el QR

2. **O estás usando Expo Go** pero no escaneaste el QR correcto
   - Solución: Escanea el QR que aparece en la terminal

---

## ✅ Solución Rápida

1. **Cierra la app** (si está abierta)
2. **Ejecuta:** `npm start`
3. **Espera** a que aparezca el QR en la terminal
4. **Si usas Expo Go:** Escanea el QR con la cámara
5. **Si usas Development Build:** Abre el build y presiona "Reload JS"

---

**¿Necesitas ayuda con algo específico?** Dime qué opción quieres usar y te guío paso a paso.

