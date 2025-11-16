// ============================================================================
// PROFILE PHOTO SERVICE
// ============================================================================

import { supabase } from './supabase';

/**
 * Sube o actualiza la foto de perfil del usuario
 */
export async function uploadProfilePhoto(
  userId: string,
  photoUri: string
): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  try {
    // 1. Subir imagen a Supabase Storage
    const fileName = `${userId}/profile_${Date.now()}.jpg`;
    
    // Convertir URI a ArrayBuffer (compatible con React Native)
    const response = await fetch(photoUri);
    const arrayBuffer = await response.arrayBuffer();
    
    // 2. Si ya existe una foto de perfil, eliminarla primero
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('profile_photo_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.profile_photo_url) {
      // Extraer el nombre del archivo de la URL
      // La URL puede ser: https://[project].supabase.co/storage/v1/object/public/profile-photos/user_id/file.jpg
      const urlParts = existingProfile.profile_photo_url.split('/');
      const oldFileName = urlParts[urlParts.length - 1];
      const oldFolderName = urlParts[urlParts.length - 2];
      
      if (oldFileName && oldFolderName === userId) {
        // Intentar eliminar la foto anterior
        await supabase.storage
          .from('profile-photos')
          .remove([`${userId}/${oldFileName}`]);
      }
    }

    // 3. Subir nueva foto
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Error uploading profile photo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 4. Obtener URL pública o firmada
    // Para buckets públicos, usar getPublicUrl
    // Para buckets privados, usar createSignedUrl (pero esto requiere regenerar la URL cada vez)
    // SOLUCIÓN: Hacer el bucket público en Supabase Dashboard > Storage > profile-photos > Settings > Make Public
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    // Si el bucket es privado, necesitamos usar signed URLs
    // Pero esto requiere regenerar la URL cada vez que se muestra la imagen
    // Por ahora, asumimos que el bucket es público
    const photoUrl = urlData.publicUrl;

    // 5. Actualizar perfil en base de datos
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ profile_photo_url: photoUrl })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating profile photo URL:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Profile photo uploaded successfully');
    return { success: true, photoUrl };
  } catch (error: any) {
    console.error('❌ Unexpected error uploading profile photo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Elimina la foto de perfil del usuario
 */
export async function deleteProfilePhoto(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener URL de la foto actual
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('profile_photo_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!profile?.profile_photo_url) {
      return { success: true }; // No hay foto para eliminar
    }

    // 2. Extraer nombre del archivo de la URL
    const urlParts = profile.profile_photo_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const fullPath = `${userId}/${fileName}`;

    // 3. Eliminar de Storage
    const { error: deleteError } = await supabase.storage
      .from('profile-photos')
      .remove([fullPath]);

    if (deleteError) {
      console.error('❌ Error deleting photo from storage:', deleteError);
      // Continuar aunque falle el borrado del storage
    }

    // 4. Actualizar perfil en base de datos
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ profile_photo_url: null })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error removing profile photo URL:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Profile photo deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error deleting profile photo:', error);
    return { success: false, error: error.message };
  }
}

