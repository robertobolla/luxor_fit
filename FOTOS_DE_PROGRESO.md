# 📸 Fotos de Progreso - FitMind

## ✅ Implementación Completa

### 🎯 Funcionalidades

#### **1. Galería de Fotos**

- ✅ Grid de fotos en 2 columnas
- ✅ Cada foto muestra fecha y peso (si está disponible)
- ✅ Modal para ver foto ampliada con detalles
- ✅ Eliminar fotos individuales
- ✅ Acceso desde la pestaña Métricas

#### **2. Tomar/Subir Fotos**

- ✅ Tomar foto con la cámara
- ✅ Seleccionar de galería
- ✅ Agregar notas opcionales
- ✅ Subida automática a Supabase Storage
- ✅ Relación de aspecto 3:4 (vertical)

#### **3. Recordatorios Automáticos**

- ✅ Sistema que detecta cuándo tomar fotos
- ✅ Frecuencia: **Cada 2 semanas (14 días)**
- ✅ Banner visible cuando es hora de tomar foto
- ✅ Muestra días transcurridos desde última foto

#### **4. Comparación Lado a Lado**

- ✅ Seleccionar 2 fotos (Antes/Después)
- ✅ Vista lado a lado para comparar
- ✅ Información de tiempo transcurrido
- ✅ Cambio de peso automático
- ✅ Navegación intuitiva para seleccionar fotos

#### **5. Análisis con IA (GPT-4 Vision)**

- ✅ Análisis automático de cambios físicos
- ✅ Detección de cambios en:
  - 💪 **Brazos** (aumentado/mantenido/reducido)
  - 🫁 **Pecho** (aumentado/mantenido/reducido)
  - 🤸 **Hombros** (aumentado/mantenido/reducido)
  - 🏋️ **Abdomen** (más visible/igual/menos visible)
  - 🦵 **Piernas** (aumentado/mantenido/reducido)
  - 📊 **Grasa corporal** (aumentado/mantenido/reducido)
- ✅ Resumen general escrito por la IA
- ✅ Lista de cambios detectados
- ✅ Nivel de confianza del análisis
- ✅ Guardar análisis en la base de datos

---

## 📁 Archivos Creados

### **Base de Datos**

- `supabase_progress_photos.sql` - Tabla y configuración de Storage

### **Tipos**

- `src/types/progressPhotos.ts` - Tipos TypeScript

### **Servicios**

- `src/services/progressPhotos.ts` - Lógica de negocio y API

### **Pantallas**

- `app/(tabs)/progress-photos.tsx` - Galería principal
- `app/compare-photos.tsx` - Comparación con IA

### **Configuración**

- `app.json` - Permisos de cámara y galería
- `app/(tabs)/_layout.tsx` - Rutas agregadas

---

## 🚀 Cómo Usar

### **Para el Usuario**

1. **Ver Fotos de Progreso**

   - Ir a pestaña **Métricas**
   - Presionar botón "📸 Fotos de Progreso"

2. **Agregar Nueva Foto**

   - En la galería, presionar "Agregar foto"
   - Elegir "Tomar foto" o "Elegir de galería"
   - Opcionalmente agregar notas
   - La foto se sube automáticamente

3. **Comparar Fotos**

   - En la galería, presionar el ícono de comparación (⚖️)
   - Seleccionar foto "Antes" (se marca con ✓)
   - Seleccionar foto "Después" (se marca con ✓)
   - Presionar "Analizar con IA" ✨
   - Ver análisis detallado

4. **Recordatorios**
   - Si han pasado 14 días, verás un banner recordándote
   - Banner muestra cuántos días han transcurrido

---

## 🗄️ Configuración de Supabase

### **1. Crear Tabla**

Ejecutar el script `supabase_progress_photos.sql` en Supabase SQL Editor.

### **2. Crear Storage Bucket**

1. Ir a **Storage** en Supabase Dashboard
2. Crear nuevo bucket llamado `progress-photos`
3. Configurar como **PRIVADO** (no público)
4. Agregar las siguientes políticas:

```sql
-- Policy 1: Users can upload their own photos
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view their own photos
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### **3. Estructura de Almacenamiento**

Las fotos se guardan en:

```
progress-photos/
  ├── user_34ABC.../
  │   ├── 1729467600000_front.jpg
  │   ├── 1730067600000_front.jpg
  │   └── ...
```

---

## 🤖 IA - Análisis de Fotos

### **Cómo Funciona**

1. Usuario selecciona 2 fotos (Antes/Después)
2. App envía ambas fotos a **GPT-4o** (Vision)
3. IA analiza cambios en masa muscular, definición, grasa
4. Responde con JSON estructurado
5. App muestra análisis en UI amigable
6. Análisis se guarda en `ai_analysis` (JSONB) de la foto

### **Ejemplo de Análisis**

```json
{
  "overallChange": "Se observa una notable mejora en definición muscular, especialmente en el tren superior. Reducción visible de grasa corporal.",
  "detectedChanges": [
    "Mayor definición en brazos y hombros",
    "Abdomen más marcado",
    "Reducción de grasa en zona media"
  ],
  "muscleGrowth": {
    "arms": "increased",
    "chest": "increased",
    "shoulders": "increased",
    "abs": "more_visible",
    "legs": "maintained"
  },
  "bodyFat": {
    "change": "decreased"
  },
  "confidence": 0.85
}
```

---

## 📊 Base de Datos

### **Tabla: progress_photos**

| Campo         | Tipo        | Descripción             |
| ------------- | ----------- | ----------------------- |
| `id`          | UUID        | ID único                |
| `user_id`     | TEXT        | ID del usuario (Clerk)  |
| `photo_url`   | TEXT        | URL de Supabase Storage |
| `photo_date`  | DATE        | Fecha de la foto        |
| `photo_type`  | TEXT        | front/side/back/other   |
| `weight_kg`   | NUMERIC     | Peso opcional           |
| `notes`       | TEXT        | Notas del usuario       |
| `ai_analysis` | JSONB       | Análisis de IA          |
| `created_at`  | TIMESTAMPTZ | Fecha de creación       |
| `updated_at`  | TIMESTAMPTZ | Última actualización    |

### **Índices**

- `user_id` - Búsquedas por usuario
- `photo_date DESC` - Ordenar por fecha
- `(user_id, photo_date DESC)` - Combinado

---

## ⚡ Rendimiento

- **Fotos optimizadas**: Quality 0.8, aspect ratio 3:4
- **Carga lazy**: Solo las fotos visibles
- **Storage privado**: Seguridad por usuario
- **Análisis IA**: On-demand (no automático)

---

## 🔐 Seguridad

- ✅ RLS habilitado en la tabla
- ✅ Storage con políticas por usuario
- ✅ Solo el dueño puede ver/editar/eliminar sus fotos
- ✅ Fotos organizadas por carpeta de usuario

---

## 🎨 UI/UX

- **Diseño oscuro** consistente con la app
- **Iconos intuitivos** (cámara, comparar, eliminar)
- **Feedback visual** (loading, selección, análisis)
- **Animaciones suaves** (modales, transiciones)
- **Textos en español** completamente traducidos

---

## 📱 Permisos Necesarios

### **iOS**

- `NSCameraUsageDescription` - Cámara
- `NSPhotoLibraryUsageDescription` - Galería

### **Android**

- Automático con `expo-image-picker`

---

## 🐛 Debugging

### **Si no se suben las fotos:**

1. Verificar que el bucket `progress-photos` existe
2. Verificar políticas de Storage
3. Verificar permisos de cámara en el dispositivo
4. Ver logs en consola

### **Si el análisis falla:**

1. Verificar `EXPO_PUBLIC_OPENAI_API_KEY` en `.env`
2. Verificar créditos de OpenAI
3. Ver logs de error en consola

---

## 💰 Costos de IA

**GPT-4o (Vision)**:

- $5.00 por 1M tokens input
- $15.00 por 1M tokens output
- Cada análisis: ~$0.01 - 0.03 USD
- 100 análisis ≈ $1-3 USD

**Optimización**:

- Análisis on-demand (usuario presiona botón)
- No análisis automático
- Resultados cacheados en DB

---

## 🚀 Futuras Mejoras

1. **Múltiples ángulos** - Front, side, back
2. **Historial de análisis** - Ver evolución en el tiempo
3. **Compartir comparaciones** - Social
4. **Overlays de medidas** - Circunferencias virtuales
5. **Timelapses** - Video con todas las fotos
6. **Recordatorios push** - Notificación cada 2 semanas
7. **Filtros de fecha** - Ver fotos por rango
8. **Exportar PDF** - Reporte de progreso

---

## ✨ ¡Listo para Usar!

1. ✅ Ejecutar script SQL en Supabase
2. ✅ Crear bucket `progress-photos`
3. ✅ Configurar políticas de Storage
4. ✅ Reiniciar app: `npm start -- --clear`
5. ✅ Ir a Métricas → Fotos de Progreso
6. ✅ Subir primera foto
7. ✅ Esperar 14 días (o subir otra para probar)
8. ✅ Comparar y analizar con IA 🎉
