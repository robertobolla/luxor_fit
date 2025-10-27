// ============================================================================
// PROGRESS PHOTOS SERVICE
// ============================================================================

import { supabase } from './supabase';
import { ProgressPhoto, PhotoType, PhotoReminder, PhotoComparison, AIAnalysis } from '../types/progressPhotos';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const DAYS_BETWEEN_PHOTOS = 14; // 2 semanas

// ============================================================================
// UPLOAD PHOTO
// ============================================================================

export async function uploadProgressPhoto(
  userId: string,
  photoUri: string,
  photoType: PhotoType,
  weight?: number,
  notes?: string
): Promise<{ success: boolean; photo?: ProgressPhoto; error?: string }> {
  try {
    // 1. Subir imagen a Supabase Storage
    const fileName = `${userId}/${Date.now()}_${photoType}.jpg`;
    
    // Convertir URI a ArrayBuffer (compatible con React Native)
    const response = await fetch(photoUri);
    const arrayBuffer = await response.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading photo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 2. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(fileName);

    // 3. Guardar registro en base de datos
    const { data: photoData, error: dbError } = await supabase
      .from('progress_photos')
      .insert({
        user_id: userId,
        photo_url: urlData.publicUrl,
        photo_date: new Date().toISOString().split('T')[0],
        photo_type: photoType,
        weight_kg: weight,
        notes: notes,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error saving photo to database:', dbError);
      return { success: false, error: dbError.message };
    }

    console.log('✅ Photo uploaded successfully:', photoData.id);
    return { success: true, photo: photoData };
  } catch (error: any) {
    console.error('❌ Unexpected error uploading photo:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// GET USER PHOTOS
// ============================================================================

export async function getUserPhotos(
  userId: string,
  limit?: number
): Promise<ProgressPhoto[]> {
  try {
    let query = supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('photo_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching photos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Unexpected error fetching photos:', error);
    return [];
  }
}

// ============================================================================
// CHECK IF REMINDER NEEDED (cada 2 semanas)
// ============================================================================

export async function checkPhotoReminder(userId: string): Promise<PhotoReminder> {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('photo_date')
      .eq('user_id', userId)
      .order('photo_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error checking photo reminder:', error);
    }

    if (!data) {
      // No hay fotos, mostrar recordatorio
      return {
        nextPhotoDate: new Date().toISOString(),
        daysSinceLastPhoto: 0,
        shouldShowReminder: true,
      };
    }

    const lastPhotoDate = new Date(data.photo_date);
    const today = new Date();
    const daysSince = Math.floor(
      (today.getTime() - lastPhotoDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const nextPhotoDate = new Date(lastPhotoDate);
    nextPhotoDate.setDate(nextPhotoDate.getDate() + DAYS_BETWEEN_PHOTOS);

    return {
      nextPhotoDate: nextPhotoDate.toISOString(),
      daysSinceLastPhoto: daysSince,
      shouldShowReminder: daysSince >= DAYS_BETWEEN_PHOTOS,
    };
  } catch (error) {
    console.error('❌ Unexpected error checking photo reminder:', error);
    return {
      nextPhotoDate: new Date().toISOString(),
      daysSinceLastPhoto: 0,
      shouldShowReminder: false,
    };
  }
}

// ============================================================================
// GET PHOTO COMPARISON (para comparar 2 fotos)
// ============================================================================

export async function getPhotoComparison(
  userId: string,
  beforePhotoId: string,
  afterPhotoId: string
): Promise<PhotoComparison | null> {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .in('id', [beforePhotoId, afterPhotoId]);

    if (error || !data || data.length !== 2) {
      console.error('❌ Error fetching photos for comparison:', error);
      return null;
    }

    const [photo1, photo2] = data;
    const before = new Date(photo1.photo_date) < new Date(photo2.photo_date) ? photo1 : photo2;
    const after = new Date(photo1.photo_date) < new Date(photo2.photo_date) ? photo2 : photo1;

    const daysBetween = Math.floor(
      (new Date(after.photo_date).getTime() - new Date(before.photo_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const weightChange =
      before.weight_kg && after.weight_kg ? after.weight_kg - before.weight_kg : undefined;

    return {
      before,
      after,
      daysBetween,
      weightChange,
    };
  } catch (error) {
    console.error('❌ Unexpected error getting photo comparison:', error);
    return null;
  }
}

// ============================================================================
// ANALYZE PHOTOS WITH AI (GPT-4 Vision)
// ============================================================================

export async function analyzePhotoWithAI(
  beforePhotoUrl: string,
  afterPhotoUrl: string
): Promise<AIAnalysis | null> {
  try {
    console.log('🤖 Analizando fotos con IA...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en fitness y análisis de composición corporal. 
          Analiza las dos fotos de progreso y detecta cambios físicos objetivos.
          
          Responde SOLO con un JSON válido en este formato exacto:
          {
            "overallChange": "descripción general de los cambios",
            "detectedChanges": ["cambio1", "cambio2", "cambio3"],
            "muscleGrowth": {
              "arms": "increased|maintained|decreased",
              "chest": "increased|maintained|decreased",
              "shoulders": "increased|maintained|decreased",
              "abs": "more_visible|same|less_visible",
              "legs": "increased|maintained|decreased"
            },
            "bodyFat": {
              "change": "increased|maintained|decreased"
            },
            "confidence": 0.85
          }`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analiza estos dos fotos de progreso. La primera es ANTES, la segunda es DESPUÉS. Detecta cambios en masa muscular, definición, y composición corporal.',
            },
            {
              type: 'image_url',
              image_url: {
                url: beforePhotoUrl,
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: afterPhotoUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ No content in AI response');
      return null;
    }

    // Parsear JSON
    const analysis: AIAnalysis = JSON.parse(content);
    console.log('✅ Análisis de IA completado:', analysis);
    
    return analysis;
  } catch (error: any) {
    console.error('❌ Error analyzing photos with AI:', error);
    return null;
  }
}

// ============================================================================
// SAVE AI ANALYSIS TO PHOTO
// ============================================================================

export async function saveAIAnalysis(
  photoId: string,
  analysis: AIAnalysis
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('progress_photos')
      .update({ ai_analysis: analysis })
      .eq('id', photoId);

    if (error) {
      console.error('❌ Error saving AI analysis:', error);
      return false;
    }

    console.log('✅ AI analysis saved to photo:', photoId);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error saving AI analysis:', error);
    return false;
  }
}

// ============================================================================
// DELETE PHOTO
// ============================================================================

export async function deleteProgressPhoto(
  photoId: string,
  photoUrl: string
): Promise<boolean> {
  try {
    // 1. Eliminar de storage
    const fileName = photoUrl.split('/progress-photos/')[1];
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([fileName]);

      if (storageError) {
        console.error('⚠️ Error deleting from storage:', storageError);
      }
    }

    // 2. Eliminar de base de datos
    const { error: dbError } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      console.error('❌ Error deleting from database:', dbError);
      return false;
    }

    console.log('✅ Photo deleted successfully:', photoId);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error deleting photo:', error);
    return false;
  }
}

