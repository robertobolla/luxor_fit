import { supabase } from './supabase';

export interface ExerciseVideo {
  canonical_name: string;
  video_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  is_storage_video?: boolean;
  storage_path?: string | null;
  key_points?: string[] | null;  // Puntos clave del ejercicio
}

/**
 * Normaliza el nombre de un ejercicio para mejorar el matching
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina caracteres especiales extra
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Normalizar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Eliminar caracteres especiales excepto espacios y guiones
    .replace(/[^\w\s-]/g, ' ')
    // Normalizar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca un video para un ejercicio dado
 * Usa matching flexible para encontrar videos incluso si el nombre varía
 */
export async function getExerciseVideo(
  exerciseName: string
): Promise<ExerciseVideo | null> {
  try {
    if (!exerciseName || exerciseName.trim().length === 0) {
      console.warn('⚠️ Nombre de ejercicio vacío');
      return null;
    }

    // Normalizar el nombre
    const normalizedName = normalizeExerciseName(exerciseName);
    console.log(`🔍 Buscando video para: "${exerciseName}" (normalizado: "${normalizedName}")`);

    // Llamar a la función SQL que hace matching flexible
    const { data, error } = await supabase.rpc('find_exercise_video', {
      exercise_name: normalizedName,
    });

    if (error) {
      console.error('❌ Error al buscar video:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No se encontró video para: "${exerciseName}"`);
      // Crear registro on-demand para que aparezca en el panel
      try {
        const { error: upErr } = await supabase
          .from('exercise_videos')
          .upsert({
            canonical_name: exerciseName.trim(),
            name_variations: [normalizedName],
            is_primary: true,
            priority: 1,
          }, { onConflict: 'canonical_name' });
        if (upErr) console.warn('⚠️ No se pudo crear registro on-demand:', upErr.message);
      } catch {}
      return null;
    }

    const video = data[0] as ExerciseVideo;
    console.log(`✅ Video encontrado: ${video.canonical_name}`);
    console.log(`   - video_url: ${video.video_url}`);
    console.log(`   - storage_path: ${video.storage_path}`);
    console.log(`   - is_storage_video: ${video.is_storage_video}`);
    return video;
  } catch (error) {
    console.error('❌ Error inesperado al buscar video:', error);
    return null;
  }
}

/**
 * Obtiene múltiples videos para una lista de ejercicios
 */
export async function getExerciseVideos(
  exerciseNames: string[]
): Promise<Map<string, ExerciseVideo | null>> {
  const result = new Map<string, ExerciseVideo | null>();

  // Buscar videos en paralelo para mejor rendimiento
  const promises = exerciseNames.map(async (name) => {
    const video = await getExerciseVideo(name);
    return { name, video };
  });

  const results = await Promise.all(promises);

  results.forEach(({ name, video }) => {
    result.set(name, video);
  });

  return result;
}

/**
 * Genera una URL de búsqueda de YouTube como fallback
 * Si no hay video asignado, abre búsqueda de YouTube
 */
export function getYouTubeSearchUrl(exerciseName: string): string {
  const searchQuery = encodeURIComponent(`${exerciseName} ejercicio correcta técnica`);
  return `https://www.youtube.com/results?search_query=${searchQuery}`;
}

/**
 * Obtiene la URL del video para reproducir
 * - Si está en Supabase Storage, devuelve la URL pública
 * - Si es URL externa, la devuelve tal cual
 */
export async function getExerciseVideoUrl(exerciseName: string): Promise<string | null> {
  try {
    console.log(`🔍 [getExerciseVideoUrl] Buscando URL para: "${exerciseName}"`);
    const video = await getExerciseVideo(exerciseName);

    if (!video) {
      console.log(`⚠️ [getExerciseVideoUrl] No se encontró video para: "${exerciseName}"`);
      return null;
    }

    console.log(`✅ [getExerciseVideoUrl] Video encontrado:`, {
      canonical_name: video.canonical_name,
      is_storage_video: video.is_storage_video,
      storage_path: video.storage_path,
      video_url: video.video_url
    });

    // Si el video está en Supabase Storage, usar la URL pública
    if (video.is_storage_video && video.storage_path) {
      console.log(`📦 [getExerciseVideoUrl] Generando URL pública para storage_path: "${video.storage_path}"`);
      const { data, error } = supabase.storage
        .from('exercise-videos')
        .getPublicUrl(video.storage_path);
      
      if (error) {
        console.error(`❌ [getExerciseVideoUrl] Error al generar URL pública:`, error);
        return null;
      }
      
      console.log(`📹 [getExerciseVideoUrl] URL pública generada: ${data.publicUrl}`);
      return data.publicUrl;
    }

    // Si es URL externa, devolverla tal cual
    if (video.video_url) {
      console.log(`📹 [getExerciseVideoUrl] Usando video_url externa: ${video.video_url}`);
      return video.video_url;
    }

    // Si no tiene ni storage_path ni video_url
    console.log(`⚠️ [getExerciseVideoUrl] Video encontrado pero sin URL válida para: "${exerciseName}"`);
    console.log(`   - is_storage_video: ${video.is_storage_video}`);
    console.log(`   - storage_path: ${video.storage_path}`);
    console.log(`   - video_url: ${video.video_url}`);
    return null;
  } catch (error) {
    console.error('❌ [getExerciseVideoUrl] Error inesperado:', error);
    return null;
  }
}

/**
 * Abre el video del ejercicio
 * - Si hay video asignado, devuelve la URL
 * - Si no, retorna null (sin fallback a YouTube)
 */
export async function openExerciseVideo(
  exerciseName: string,
  onOpenUrl: (url: string) => void | Promise<void>
): Promise<boolean> {
  try {
    console.log(`🎬 [openExerciseVideo] Intentando abrir video para: "${exerciseName}"`);
    const videoUrl = await getExerciseVideoUrl(exerciseName);

    if (videoUrl) {
      console.log(`📹 [openExerciseVideo] URL obtenida: ${videoUrl}`);
      console.log(`📹 [openExerciseVideo] Llamando a onOpenUrl...`);
      await onOpenUrl(videoUrl);
      console.log(`✅ [openExerciseVideo] onOpenUrl ejecutado exitosamente`);
      return true;
    } else {
      console.log(`⚠️ [openExerciseVideo] No hay video asignado para: "${exerciseName}"`);
      return false;
    }
  } catch (error) {
    console.error('❌ [openExerciseVideo] Error al abrir video:', error);
    return false;
  }
}

/**
 * Sube un video a Supabase Storage y lo registra en la base de datos
 */
export async function uploadExerciseVideo(
  canonicalName: string,
  videoUri: string, // URI local del video (file://...)
  nameVariations?: string[],
  options?: {
    thumbnailUrl?: string;
    description?: string;
    category?: string;
    equipment?: string[];
    language?: string;
    isPrimary?: boolean;
    priority?: number;
  }
): Promise<{ success: boolean; error?: string; video?: ExerciseVideo }> {
  try {
    // 1. Generar nombre de archivo seguro (sin espacios, sin caracteres especiales)
    const safeName = canonicalName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^\w-]/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/-+/g, '-') // Eliminar guiones múltiples
      .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final
    
    const fileName = `${safeName}_${Date.now()}.mp4`;
    const storagePath = fileName;

    // 2. Convertir URI a ArrayBuffer (para React Native)
    const response = await fetch(videoUri);
    const arrayBuffer = await response.arrayBuffer();

    // 3. Subir video a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exercise-videos')
      .upload(storagePath, arrayBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading video:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 4. Obtener URL pública del video
    const { data: urlData } = supabase.storage
      .from('exercise-videos')
      .getPublicUrl(storagePath);

    // 5. Guardar registro en base de datos
    const videoData = {
      canonical_name: canonicalName,
      video_url: urlData.publicUrl,
      storage_path: storagePath,
      is_storage_video: true,
      name_variations: nameVariations || [],
      thumbnail_url: options?.thumbnailUrl || null,
      description: options?.description || null,
      category: options?.category || null,
      equipment: options?.equipment || null,
      language: options?.language || 'es',
      is_primary: options?.isPrimary ?? true,
      priority: options?.priority ?? 1,
    };

    const { data: dbData, error: dbError } = await supabase
      .from('exercise_videos')
      .insert([videoData])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error saving video to database:', dbError);
      // Intentar eliminar el archivo subido si falla la BD
      await supabase.storage.from('exercise-videos').remove([storagePath]);
      return { success: false, error: dbError.message };
    }

    console.log(`✅ Video uploaded successfully: ${canonicalName}`);
    return { 
      success: true, 
      video: {
        canonical_name: dbData.canonical_name,
        video_url: dbData.video_url,
        thumbnail_url: dbData.thumbnail_url,
        description: dbData.description,
        is_storage_video: dbData.is_storage_video,
        storage_path: dbData.storage_path,
      }
    };
  } catch (error: any) {
    console.error('❌ Unexpected error uploading video:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Agrega o actualiza un video para un ejercicio
 * Útil para videos externos o URLs ya existentes
 */
export async function upsertExerciseVideo(
  canonicalName: string,
  videoUrl: string,
  nameVariations?: string[],
  options?: {
    thumbnailUrl?: string;
    description?: string;
    category?: string;
    equipment?: string[];
    language?: string;
    isPrimary?: boolean;
    priority?: number;
    isStorageVideo?: boolean;
    storagePath?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('exercise_videos')
      .select('id')
      .eq('canonical_name', canonicalName)
      .eq('is_primary', options?.isPrimary ?? true)
      .limit(1)
      .maybeSingle();

    const videoData = {
      canonical_name: canonicalName,
      video_url: videoUrl,
      storage_path: options?.storagePath || null,
      is_storage_video: options?.isStorageVideo ?? false,
      name_variations: nameVariations || [],
      thumbnail_url: options?.thumbnailUrl || null,
      description: options?.description || null,
      category: options?.category || null,
      equipment: options?.equipment || null,
      language: options?.language || 'es',
      is_primary: options?.isPrimary ?? true,
      priority: options?.priority ?? 1,
    };

    if (existing) {
      // Actualizar existente
      const { error } = await supabase
        .from('exercise_videos')
        .update(videoData)
        .eq('id', existing.id);

      if (error) throw error;
      console.log(`✅ Video actualizado para: ${canonicalName}`);
    } else {
      // Insertar nuevo
      const { error } = await supabase
        .from('exercise_videos')
        .insert([videoData]);

      if (error) throw error;
      console.log(`✅ Video agregado para: ${canonicalName}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error al guardar video:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los puntos clave (key points) de un ejercicio específico
 * Usa matching flexible para encontrar el ejercicio incluso si el nombre varía
 */
export async function getExerciseKeyPoints(
  exerciseName: string
): Promise<string[]> {
  try {
    if (!exerciseName || exerciseName.trim().length === 0) {
      console.warn('⚠️ Nombre de ejercicio vacío');
      return [];
    }

    // Normalizar el nombre
    const normalizedName = normalizeExerciseName(exerciseName);
    console.log(`🔍 Buscando puntos clave para: "${exerciseName}" (normalizado: "${normalizedName}")`);

    // Llamar a la función SQL que hace matching flexible
    const { data, error } = await supabase.rpc('find_exercise_video', {
      exercise_name: normalizedName,
    });

    if (error) {
      console.error('❌ Error al buscar puntos clave:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No se encontró ejercicio para: "${exerciseName}"`);
      return [];
    }

    const exercise = data[0] as ExerciseVideo;
    
    if (exercise.key_points && exercise.key_points.length > 0) {
      console.log(`✅ Puntos clave encontrados: ${exercise.key_points.length} puntos`);
      return exercise.key_points;
    } else {
      console.log(`⚠️ El ejercicio "${exerciseName}" no tiene puntos clave en la BD`);
      return [];
    }
  } catch (error) {
    console.error('❌ Error inesperado al buscar puntos clave:', error);
    return [];
  }
}

