// ============================================================================
// CHAT IMAGE SERVICE
// ============================================================================

import { supabase } from './supabase';

/**
 * Sube una imagen al chat
 */
export async function uploadChatImage(
  userId: string,
  chatId: string,
  imageUri: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // 1. Subir imagen a Supabase Storage
    const fileName = `${chatId}/${userId}_${Date.now()}.jpg`;
    
    // Convertir URI a ArrayBuffer (compatible con React Native)
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    
    // 2. Subir imagen
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading chat image:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 3. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'No se pudo obtener la URL de la imagen' };
    }

    return { success: true, imageUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error('Error uploading chat image:', error);
    return { success: false, error: error.message || 'Error al subir la imagen' };
  }
}

