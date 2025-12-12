# 🎨 Guía de Custom Alerts - FitMind

## ✨ Nuevo Sistema de Alertas Personalizado

Hemos implementado un sistema de alertas personalizado con la estética de la app (gradientes dorados, fondos oscuros, etc.) para reemplazar los `Alert.alert()` nativos de React Native.

---

## 📦 Componentes Disponibles

### 1. **AlertProvider** (Ya configurado en `app/_layout.tsx`)
Provider global que envuelve toda la app y permite usar alertas desde cualquier componente.

### 2. **useAlert Hook**
Hook para mostrar alertas desde cualquier componente funcional.

### 3. **CustomAlert Component**
Componente de alerta con estética personalizada.

---

## 🚀 Cómo Usar

### Uso Básico

```typescript
import { useAlert } from '@/src/contexts/AlertContext';

function MiComponente() {
  const { showAlert } = useAlert();

  const handleAction = () => {
    showAlert(
      'Título de la Alerta',
      'Mensaje opcional de la alerta'
    );
  };

  return <Button onPress={handleAction} title="Mostrar Alerta" />;
}
```

### Con Botones Personalizados

```typescript
const { showAlert } = useAlert();

showAlert(
  'Confirmar Acción',
  '¿Estás seguro de que deseas continuar?',
  [
    {
      text: 'Cancelar',
      style: 'cancel',
      onPress: () => console.log('Cancelado'),
    },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: () => console.log('Eliminado'),
    },
  ]
);
```

### Con Ícono Personalizado

```typescript
showAlert(
  '¡Éxito!',
  'La operación se completó correctamente',
  [{ text: 'Entendido' }],
  {
    icon: 'checkmark-circle',
    iconColor: '#4CAF50',
  }
);
```

---

## 🎨 Estilos de Botones

### `default` (Botón Principal)
- Fondo con gradiente dorado (#ffb300 → #ff8c00)
- Texto negro (#1a1a1a)
- Negrita

```typescript
{ text: 'Aceptar', style: 'default' }
```

### `cancel` (Botón Secundario)
- Fondo transparente
- Borde gris (#666)
- Texto gris (#999)

```typescript
{ text: 'Cancelar', style: 'cancel' }
```

### `destructive` (Botón de Eliminación)
- Fondo rojo (#ff4444)
- Texto blanco
- Negrita

```typescript
{ text: 'Eliminar', style: 'destructive' }
```

---

## 🔄 Migración de Alert.alert() a CustomAlert

### Antes (Alert Nativo)

```typescript
import { Alert } from 'react-native';

Alert.alert(
  'Error',
  'No se pudo completar la operación',
  [{ text: 'OK' }]
);
```

### Después (Custom Alert)

```typescript
import { useAlert } from '@/src/contexts/AlertContext';

const { showAlert } = useAlert();

showAlert(
  'Error',
  'No se pudo completar la operación',
  [{ text: 'Entendido' }],
  { icon: 'alert-circle', iconColor: '#ff4444' }
);
```

---

## 📋 Ejemplos Comunes

### 1. Alerta de Éxito

```typescript
showAlert(
  '¡Éxito!',
  'Los cambios se guardaron correctamente',
  [{ text: 'Entendido' }],
  { icon: 'checkmark-circle', iconColor: '#4CAF50' }
);
```

### 2. Alerta de Error

```typescript
showAlert(
  'Error',
  'No se pudo conectar al servidor',
  [{ text: 'Reintentar', onPress: () => retry() }],
  { icon: 'alert-circle', iconColor: '#ff4444' }
);
```

### 3. Confirmación de Eliminación

```typescript
showAlert(
  'Eliminar Elemento',
  '¿Estás seguro? Esta acción no se puede deshacer',
  [
    { text: 'Cancelar', style: 'cancel' },
    { 
      text: 'Eliminar', 
      style: 'destructive',
      onPress: () => handleDelete()
    },
  ],
  { icon: 'trash', iconColor: '#ff4444' }
);
```

### 4. Información

```typescript
showAlert(
  'Información',
  'Esta función estará disponible próximamente',
  [{ text: 'Entendido' }],
  { icon: 'information-circle' }
);
```

### 5. Advertencia

```typescript
showAlert(
  'Atención',
  'Debes completar tu perfil antes de continuar',
  [
    { text: 'Después', style: 'cancel' },
    { text: 'Completar Ahora', onPress: () => router.push('/profile-edit') },
  ],
  { icon: 'warning', iconColor: '#ffb300' }
);
```

---

## 🎯 Íconos Disponibles (Ionicons)

Algunos íconos comunes que puedes usar:

- `checkmark-circle` - Éxito ✅
- `alert-circle` - Error/Alerta ⚠️
- `information-circle` - Información ℹ️
- `warning` - Advertencia ⚠️
- `trash` - Eliminar 🗑️
- `heart` - Me gusta ❤️
- `star` - Favorito ⭐
- `settings` - Configuración ⚙️
- `lock-closed` - Bloqueado 🔒
- `fitness` - Ejercicio 💪

Ver más en: https://ionic.io/ionicons

---

## 🔧 Características

✅ **Estética Consistente**: Todos los alerts tienen el mismo diseño que la app
✅ **Gradientes Dorados**: Botones principales con gradiente #ffb300 → #ff8c00
✅ **Fondo Oscuro**: Background #1a1a1a coherente con la app
✅ **Íconos Personalizables**: Cualquier ícono de Ionicons
✅ **Múltiples Botones**: Soporta 1, 2 o más botones
✅ **Animaciones Suaves**: Fade in/out
✅ **Backdrop Dismissible**: Toca fuera para cerrar

---

## 📝 Notas Importantes

1. **No uses `Alert.alert()` directamente** - Siempre usa `useAlert()`
2. **El provider ya está configurado** en `app/_layout.tsx`
3. **Los alerts son globales** - Solo puede haber uno visible a la vez
4. **Texto por defecto** - Si no pasas botones, aparecerá "Entendido"
5. **Ícono por defecto** - Si no especificas ícono, aparecerá "information-circle"

---

## 🐛 Troubleshooting

### "useAlert must be used within an AlertProvider"
**Solución**: Asegúrate de que `AlertProvider` esté en `app/_layout.tsx` envolviendo toda la app.

### El alert no aparece
**Solución**: Verifica que estés llamando a `showAlert()` y no a `Alert.alert()`.

### El alert se cierra inmediatamente
**Solución**: Asegúrate de no estar llamando a `onPress` sin querer en el mismo render.

---

## ✅ TODO: Migración Pendiente

Archivos que aún usan `Alert.alert()` y deben migrarse:

- [ ] `app/(tabs)/workout.tsx`
- [ ] `app/trainer-mode.tsx`
- [ ] `app/profile-edit.tsx`
- [ ] `app/(tabs)/progress-photos.tsx`
- [ ] `src/components/AIWorkoutAdaptationModal.tsx`
- [ ] `src/hooks/useNetworkStatus.ts`
- [ ] Y más... (ver `grep -r "Alert.alert"`)

---

¡Disfruta de las alertas personalizadas! 🎉

