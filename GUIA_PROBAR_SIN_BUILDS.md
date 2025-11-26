# 🧪 Guía: Probar la App Sin Hacer Tantas Builds

## 🎯 Estrategia Recomendada

### 1. **Para Desarrollo Diario: Usa Expo Go**

Para probar cambios de UI, lógica de negocio, navegación, etc. (cualquier cambio de JavaScript/TypeScript):

```bash
npm start
```

**Ventajas:**
- ✅ Instantáneo (no requiere build)
- ✅ Hot reload automático
- ✅ No cuenta contra límite de builds
- ✅ Funciona en iOS y Android

**Limitaciones:**
- ❌ No tiene acceso a módulos nativos (Apple Health, Google Fit)
- ❌ Algunas funcionalidades nativas no funcionan

**Cuándo usar:**
- Cambios de UI/UX
- Lógica de negocio
- Navegación
- Integraciones con APIs (Supabase, Clerk, etc.)
- Cualquier cambio de JavaScript/TypeScript

---

### 2. **Para Probar Funcionalidades Nativas: Development Build**

Crea un **Development Build** una vez y úsalo para probar funcionalidades nativas:

#### Paso 1: Crear Development Build (solo una vez)

```bash
# Para iOS (cuando necesites probar Apple Health)
eas build --profile development --platform ios

# Para Android (más rápido, sin límites estrictos)
eas build --profile development --platform android
```

#### Paso 2: Instalar el Development Build

- Descarga el build desde el link que te da EAS
- Instálalo en tu dispositivo
- **No necesitas crear otro build** a menos que agregues nuevos módulos nativos

#### Paso 3: Usar el Development Build para Desarrollo

```bash
npm start
```

- Abre el Development Build (no Expo Go)
- Escanea el QR code
- La app se carga con hot reload
- **Funciona igual que Expo Go pero con acceso a módulos nativos**

**Ventajas:**
- ✅ Acceso completo a módulos nativos (HealthKit, Google Fit)
- ✅ Hot reload como Expo Go
- ✅ Solo necesitas crear el build una vez
- ✅ No necesitas rebuild para cambios de JavaScript

**Cuándo necesitas rebuild:**
- Solo cuando agregas nuevos módulos nativos
- Cuando cambias configuración nativa (app.json, permisos, etc.)

---

### 3. **Para Actualizaciones Rápidas: EAS Update**

Una vez que tienes un build instalado (Development o Production), puedes actualizarlo sin rebuild usando **EAS Update**:

```bash
# Para actualizar el build de desarrollo
eas update --branch development --message "Fix: Corregido bug en pasos"

# Para actualizar el build de producción
eas update --branch production --message "Nueva funcionalidad"
```

**Ventajas:**
- ✅ Actualiza la app sin rebuild
- ✅ No cuenta contra límite de builds
- ✅ Los usuarios reciben la actualización automáticamente
- ✅ Solo actualiza JavaScript/TypeScript

**Limitaciones:**
- ❌ No puede agregar nuevos módulos nativos
- ❌ No puede cambiar configuración nativa

---

## 📋 Flujo de Trabajo Recomendado

### Desarrollo Normal (90% del tiempo)

```bash
# 1. Inicia el servidor
npm start

# 2. Abre Expo Go en tu dispositivo
# 3. Escanea el QR code
# 4. Desarrolla y prueba cambios
# 5. Hot reload automático - ¡sin builds!
```

### Cuando Necesitas Probar Funcionalidades Nativas

```bash
# 1. Asegúrate de tener un Development Build instalado
#    (solo necesitas crearlo una vez)

# 2. Inicia el servidor
npm start

# 3. Abre el Development Build (no Expo Go)
# 4. Escanea el QR code
# 5. Prueba funcionalidades nativas (HealthKit, etc.)
```

### Cuando Terminas una Feature y Quieres Probar en Producción

```bash
# 1. Crea un build de producción (solo cuando sea necesario)
eas build --profile production --platform ios

# 2. Una vez instalado, usa EAS Update para actualizaciones
eas update --branch production --message "Nueva feature"
```

---

## 🎯 Resumen: Cuándo Hacer Builds

| Escenario | ¿Necesitas Build? |
|-----------|-------------------|
| Cambio de UI/JavaScript | ❌ No - Usa Expo Go o Development Build existente |
| Cambio de lógica de negocio | ❌ No - Usa Expo Go o Development Build existente |
| Probar Apple Health/Google Fit | ✅ Sí - Crea Development Build (una vez) |
| Agregar nuevo módulo nativo | ✅ Sí - Crea nuevo Development Build |
| Cambiar permisos en app.json | ✅ Sí - Crea nuevo Build |
| Actualizar para TestFlight | ✅ Sí - Crea Production Build (solo cuando sea necesario) |
| Actualizar JavaScript en build existente | ❌ No - Usa `eas update` |

---

## 💡 Tips para Ahorrar Builds

1. **Usa Expo Go para el 90% del desarrollo**
   - Solo crea builds cuando realmente necesites módulos nativos

2. **Crea un Development Build y úsalo por semanas**
   - No necesitas rebuild a menos que agregues módulos nativos

3. **Usa EAS Update para actualizaciones**
   - Actualiza JavaScript sin rebuild

4. **Agrupa cambios nativos**
   - Si necesitas hacer varios cambios nativos, hazlos todos juntos y crea un solo build

5. **Usa Android para probar (si tienes)**
   - Android no tiene límites tan estrictos y es más rápido

---

## 🚀 Comandos Rápidos

```bash
# Desarrollo diario (sin build)
npm start

# Crear Development Build (solo cuando necesites módulos nativos)
eas build --profile development --platform ios

# Actualizar build existente sin rebuild
eas update --branch development --message "Cambios"

# Ver builds existentes
eas build:list

# Ver updates
eas update:list
```

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo probar Apple Health sin hacer build?**
R: No, necesitas un Development Build o Production Build. Pero solo necesitas crearlo una vez.

**P: ¿Cuántas veces necesito crear un Development Build?**
R: Solo cuando agregas nuevos módulos nativos o cambias configuración nativa. Para cambios de JavaScript, usa el build existente.

**P: ¿Puedo usar Expo Go para todo?**
R: Casi todo, excepto módulos nativos como HealthKit. Para eso necesitas un Development Build.

**P: ¿EAS Update funciona con Development Builds?**
R: Sí, funciona con cualquier build que tenga EAS Update configurado.

