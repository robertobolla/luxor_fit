# 🎯 Recordatorio: Drag & Drop

## Estado Actual
- Drag & Drop está **COMENTADO** para desarrollo en Expo Go
- Variable: `DRAG_DROP_ENABLED = false`

## Al Subir a TestFlight/Producción:
1. Cambiar `DRAG_DROP_ENABLED = false` → `true` en `app/(tabs)/workout/custom-plan-day-detail.tsx`
2. Descomentar imports de `DraggableFlatList` y `GestureHandlerRootView`
3. Descomentar bloque de código del DraggableFlatList
4. Subir build

## Yo (AI) lo recordaré siempre porque:
- ✅ Este archivo existe
- ✅ Los comentarios en el código son claros
- ✅ Buscaré `DRAG_DROP_ENABLED` antes de cada build
- ✅ Está documentado en `ACTIVAR_DRAG_DROP_PRODUCCION.md`

