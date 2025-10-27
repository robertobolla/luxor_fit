# 🧹 Guía para Limpiar Datos de la App FitMind

Esta guía te ayudará a borrar todos los datos de la app para empezar desde cero.

## 📊 Tipos de Datos en la App

### 🗄️ **Datos en Supabase (Base de datos)**

- Perfiles de usuario
- Planes de entrenamiento
- Completaciones de entrenamientos
- Registros de comidas y nutrición
- Fotos de progreso
- Métricas corporales
- Progreso de lecciones

### 📱 **Datos Locales (Dispositivo)**

- Configuración del dashboard (AsyncStorage)
- Tokens de autenticación (SecureStore)
- Sesiones de Supabase (AsyncStorage)
- Caché de la app

## 🚀 Opciones para Limpiar Datos

### Opción 1: Limpieza Completa (Recomendado)

Limpia tanto datos locales como de la base de datos.

#### Paso 1: Limpiar Datos Locales

```bash
# Ejecutar script de limpieza local
npm run clear-local-data

# O usar el comando completo
npm run reset-app
```

#### Paso 2: Limpiar Base de Datos (Opcional)

```bash
# Ejecutar script de Supabase (requiere configuración)
./clear_supabase_data.sh
```

### Opción 2: Solo Datos Locales

Si solo quieres limpiar datos del dispositivo:

```bash
npm run clear-local-data
```

### Opción 3: Desde la App

Usar el componente `ClearDataButton` en la app:

```tsx
import ClearDataButton from "./src/components/ClearDataButton";

// En tu componente
<ClearDataButton
  onDataCleared={() => {
    // Redirigir al onboarding o reiniciar la app
  }}
/>;
```

## 🛠️ Scripts Disponibles

| Comando                    | Descripción                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run clear-local-data` | Limpia solo datos locales                          |
| `npm run reset-app`        | Limpia datos locales y muestra instrucciones       |
| `npm run clear-all-data`   | Limpia datos locales + instrucciones para Supabase |

## 📋 Verificación de Limpieza

### ✅ Datos Locales Limpiados

- [ ] AsyncStorage vacío
- [ ] SecureStore sin tokens
- [ ] Caché de la app limpiado
- [ ] Archivos temporales eliminados

### ✅ Base de Datos Limpiada (si aplica)

- [ ] Tabla `user_profiles` vacía
- [ ] Tabla `workout_plans` vacía
- [ ] Tabla `meal_logs` vacía
- [ ] Storage de fotos vacío
- [ ] Todas las tablas con 0 registros

## 🔧 Configuración para Scripts de Supabase

Si quieres usar el script de limpieza de Supabase, configura estas variables:

```bash
# En tu archivo .env o exportar en terminal
export SUPABASE_URL="tu_url_de_supabase"
export SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
```

## 🚨 Advertencias Importantes

### ⚠️ **Datos de Supabase**

- **IRREVERSIBLE**: Una vez borrados, no se pueden recuperar
- **TODOS LOS USUARIOS**: El script borra datos de todos los usuarios
- **BACKUP**: Haz backup antes de ejecutar en producción

### ⚠️ **Datos Locales**

- **SESIONES**: Se cerrarán todas las sesiones activas
- **CONFIGURACIÓN**: Se perderá la configuración personalizada
- **CACHÉ**: Se limpiará todo el caché de la app

## 🎯 Casos de Uso

### 🧪 **Desarrollo/Testing**

```bash
# Limpieza rápida para pruebas
npm run reset-app
```

### 🔄 **Reinicio Completo**

```bash
# Limpiar todo y empezar desde cero
npm run clear-local-data
# Luego ejecutar script de Supabase si es necesario
```

### 👤 **Solo Mi Usuario**

Si solo quieres borrar tus datos (no todos los usuarios):

1. Usa el script `DELETE_USER_DATA.sql`
2. Reemplaza `'TU_USER_ID_AQUI'` con tu ID de usuario
3. Ejecuta en Supabase

## 🆘 Solución de Problemas

### Error: "Variables de entorno no configuradas"

```bash
# Configurar variables para Supabase
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu_key_aqui"
```

### Error: "No se pueden eliminar archivos de caché"

```bash
# Limpiar manualmente
rm -rf node_modules/.cache
rm -rf .expo
npx expo r -c
```

### La app sigue mostrando datos viejos

1. Cierra completamente la app
2. Reinicia el servidor de desarrollo
3. Limpia el caché del navegador (si usas web)

## 📞 Soporte

Si tienes problemas con la limpieza de datos:

1. **Revisa los logs** en la consola
2. **Verifica las variables** de entorno
3. **Reinicia la app** completamente
4. **Contacta al desarrollador** si persisten los problemas

---

## 🎉 ¡Listo!

Después de ejecutar la limpieza, tu app FitMind estará completamente limpia y lista para empezar desde cero. El próximo usuario que abra la app pasará por el onboarding completo.
