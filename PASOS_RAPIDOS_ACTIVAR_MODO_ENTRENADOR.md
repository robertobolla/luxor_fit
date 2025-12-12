# ⚡ Activar Modo Entrenador - PASOS RÁPIDOS

## 🚨 ERROR ACTUAL
Si ves este error en la consola:
```
Could not find the table 'public.trainer_students_view' in the schema cache
```

**Significa que necesitas ejecutar el script SQL en Supabase primero.**

## ✅ Solución: Ejecutar Script SQL

### Paso 1: Abrir Supabase
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Abre tu proyecto
3. Click en **"SQL Editor"** en el menú lateral izquierdo

### Paso 2: Ejecutar el Script
1. Click en **"New query"** (botón arriba a la derecha)
2. Abre el archivo `supabase_trainer_system.sql` en tu proyecto
3. **Copia TODO el contenido** del archivo
4. **Pega** en el editor SQL de Supabase
5. Click en **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
6. Espera a que termine (debería decir "Success")

### Paso 3: Verificar
Ejecuta esta consulta para verificar que todo se creó correctamente:

```sql
-- Verificar tablas
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'trainer_student_relationships'
) as tabla_relaciones,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'trainer_permissions'
) as tabla_permisos,
EXISTS (
  SELECT FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'trainer_students_view'
) as vista_alumnos;
```

Deberías ver:
- `tabla_relaciones: true`
- `tabla_permisos: true`
- `vista_alumnos: true`

### Paso 4: Reiniciar la App
1. En la terminal donde corre tu app, presiona `r` para reload
2. O cierra y vuelve a abrir la app

## 🎯 Funcionalidad Temporal

**Nota:** He modificado el código para que funcione incluso sin la vista, pero **debes ejecutar el script SQL** para tener toda la funcionalidad:

### Sin el script SQL:
- ❌ No puedes enviar invitaciones
- ❌ No puedes ver estadísticas de alumnos
- ❌ Las funciones RPC no existen

### Con el script SQL:
- ✅ Enviar invitaciones a alumnos
- ✅ Ver lista de alumnos
- ✅ Ver estadísticas completas
- ✅ Editar rutinas de alumnos
- ✅ Chat con alumnos
- ✅ Notificaciones en tiempo real

## 🆘 Si Sigues Teniendo Problemas

1. **Verifica que el script se ejecutó correctamente**
   - No debe haber errores en rojo en Supabase
   - Todas las verificaciones deben dar `true`

2. **Verifica las políticas RLS**
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('trainer_student_relationships', 'trainer_permissions');
   ```
   Deberías ver varias políticas listadas.

3. **Reinicia completamente la app**
   - Cierra la app completamente
   - Detén el servidor de desarrollo
   - Vuelve a ejecutar `npm start`

## 📞 Siguiente Paso

Una vez ejecutado el script SQL, prueba:
1. Ve a la pestaña **"Entrenar"**
2. Click en **"Modo Entrenador"**
3. Click en **"Agregar Nuevo Alumno"**
4. Debería funcionar sin errores

---

**¿Ya ejecutaste el script?** Si sí y sigues viendo errores, revisa los logs de Supabase en la sección "Logs" del dashboard.

