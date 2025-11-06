// ============================================================================
// NUTRITION SERVICE
// ============================================================================

import { supabase } from './supabase';
import OpenAI from 'openai';
import {
  Activity,
  Goal,
  UserProfileLite,
  NutritionTarget,
  WeekPlan,
  DayPlan,
  MealOption,
  FoodItem,
  GroceryItem,
  NutritionProfile,
} from '../types/nutrition';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

// ============================================================================
// BASE DE DATOS DE ALIMENTOS (Embebida)
// ============================================================================

export const FOOD_DATABASE: FoodItem[] = [
  // ============================================================================
  // PROTEÍNAS (IDs 1-50)
  // ============================================================================
  
  // Carnes
  { id: 1, name: 'Pechuga de pollo', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fats_per_100g: 3.6, category: 'protein', tags: ['budget', 'rapido', 'carne'] },
  { id: 2, name: 'Muslo de pollo', calories_per_100g: 209, protein_per_100g: 26, carbs_per_100g: 0, fats_per_100g: 12, category: 'protein', tags: ['carne'] },
  { id: 3, name: 'Pavo pechuga', calories_per_100g: 135, protein_per_100g: 30, carbs_per_100g: 0, fats_per_100g: 1.2, category: 'protein', tags: ['carne'] },
  { id: 4, name: 'Carne molida 90/10', calories_per_100g: 176, protein_per_100g: 20, carbs_per_100g: 0, fats_per_100g: 10, category: 'protein', tags: ['carne'] },
  { id: 5, name: 'Carne molida 80/20', calories_per_100g: 254, protein_per_100g: 17, carbs_per_100g: 0, fats_per_100g: 20, category: 'protein', tags: ['carne'] },
  { id: 6, name: 'Solomillo de ternera', calories_per_100g: 250, protein_per_100g: 26, carbs_per_100g: 0, fats_per_100g: 15, category: 'protein', tags: ['carne'] },
  { id: 7, name: 'Chuletas de cerdo', calories_per_100g: 231, protein_per_100g: 27, carbs_per_100g: 0, fats_per_100g: 13, category: 'protein', tags: ['carne'] },
  { id: 8, name: 'Jamón serrano', calories_per_100g: 370, protein_per_100g: 30, carbs_per_100g: 0, fats_per_100g: 28, category: 'protein', tags: ['carne', 'procesado'] },
  { id: 9, name: 'Pechuga de pavo', calories_per_100g: 135, protein_per_100g: 30, carbs_per_100g: 0, fats_per_100g: 1.2, category: 'protein', tags: ['carne'] },
  { id: 10, name: 'Cordero', calories_per_100g: 294, protein_per_100g: 25, carbs_per_100g: 0, fats_per_100g: 21, category: 'protein', tags: ['carne'] },

  // Pescados y mariscos
  { id: 11, name: 'Salmón', calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fats_per_100g: 13, category: 'protein', tags: ['pescado'] },
  { id: 12, name: 'Atún fresco', calories_per_100g: 144, protein_per_100g: 30, carbs_per_100g: 0, fats_per_100g: 1, category: 'protein', tags: ['pescado'] },
  { id: 13, name: 'Atún en lata', calories_per_100g: 116, protein_per_100g: 26, carbs_per_100g: 0, fats_per_100g: 0.8, category: 'protein', tags: ['rapido', 'pescado'] },
  { id: 14, name: 'Bacalao', calories_per_100g: 82, protein_per_100g: 18, carbs_per_100g: 0, fats_per_100g: 0.7, category: 'protein', tags: ['pescado'] },
  { id: 15, name: 'Merluza', calories_per_100g: 71, protein_per_100g: 16, carbs_per_100g: 0, fats_per_100g: 0.6, category: 'protein', tags: ['pescado'] },
  { id: 16, name: 'Sardinas', calories_per_100g: 208, protein_per_100g: 25, carbs_per_100g: 0, fats_per_100g: 11, category: 'protein', tags: ['pescado'] },
  { id: 17, name: 'Anchoas', calories_per_100g: 131, protein_per_100g: 20, carbs_per_100g: 0, fats_per_100g: 4.8, category: 'protein', tags: ['pescado'] },
  { id: 18, name: 'Gambas', calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0, fats_per_100g: 0.3, category: 'protein', tags: ['marisco'] },
  { id: 19, name: 'Langostinos', calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0, fats_per_100g: 0.3, category: 'protein', tags: ['marisco'] },
  { id: 20, name: 'Mejillones', calories_per_100g: 86, protein_per_100g: 12, carbs_per_100g: 3.7, fats_per_100g: 2.2, category: 'protein', tags: ['marisco'] },

  // Huevos y lácteos
  { id: 21, name: 'Huevos', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fats_per_100g: 11, category: 'protein', tags: ['budget', 'rapido'] },
  { id: 22, name: 'Claras de huevo', calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fats_per_100g: 0.2, category: 'protein', tags: ['rapido'] },
  { id: 23, name: 'Yogur griego 0%', calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 3.6, fats_per_100g: 0.4, category: 'dairy', tags: ['rapido', 'lacteo'] },
  { id: 24, name: 'Yogur griego 2%', calories_per_100g: 73, protein_per_100g: 10, carbs_per_100g: 3.6, fats_per_100g: 2, category: 'dairy', tags: ['lacteo'] },
  { id: 25, name: 'Queso cottage', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fats_per_100g: 4.3, category: 'dairy', tags: ['rapido', 'lacteo'] },
  { id: 26, name: 'Queso fresco', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fats_per_100g: 4.3, category: 'dairy', tags: ['lacteo'] },
  { id: 27, name: 'Requesón', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fats_per_100g: 4.3, category: 'dairy', tags: ['lacteo'] },
  { id: 28, name: 'Leche desnatada', calories_per_100g: 34, protein_per_100g: 3.4, carbs_per_100g: 5, fats_per_100g: 0.1, category: 'dairy', tags: ['lacteo'] },
  { id: 29, name: 'Leche semidesnatada', calories_per_100g: 46, protein_per_100g: 3.2, carbs_per_100g: 4.7, fats_per_100g: 1.6, category: 'dairy', tags: ['lacteo'] },
  { id: 30, name: 'Kéfir', calories_per_100g: 41, protein_per_100g: 3.3, carbs_per_100g: 4.5, fats_per_100g: 1, category: 'dairy', tags: ['lacteo'] },

  // Legumbres y proteínas vegetales
  { id: 31, name: 'Lentejas cocidas', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fats_per_100g: 0.4, category: 'protein', tags: ['budget', 'vegetal'] },
  { id: 32, name: 'Garbanzos cocidos', calories_per_100g: 164, protein_per_100g: 8.9, carbs_per_100g: 27, fats_per_100g: 2.6, category: 'protein', tags: ['budget', 'vegetal'] },
  { id: 33, name: 'Frijoles negros cocidos', calories_per_100g: 132, protein_per_100g: 8.9, carbs_per_100g: 24, fats_per_100g: 0.5, category: 'protein', tags: ['budget', 'vegetal'] },
  { id: 34, name: 'Alubias blancas', calories_per_100g: 127, protein_per_100g: 8.2, carbs_per_100g: 23, fats_per_100g: 0.3, category: 'protein', tags: ['budget', 'vegetal'] },
  { id: 35, name: 'Tofu firme', calories_per_100g: 76, protein_per_100g: 8, carbs_per_100g: 1.9, fats_per_100g: 4.8, category: 'protein', tags: ['rapido', 'vegetal'] },
  { id: 36, name: 'Tempeh', calories_per_100g: 192, protein_per_100g: 20, carbs_per_100g: 9, fats_per_100g: 11, category: 'protein', tags: ['vegetal'] },
  { id: 37, name: 'Seitán', calories_per_100g: 370, protein_per_100g: 75, carbs_per_100g: 14, fats_per_100g: 1.9, category: 'protein', tags: ['vegetal'] },
  { id: 38, name: 'Quinoa', calories_per_100g: 368, protein_per_100g: 14, carbs_per_100g: 64, fats_per_100g: 6, category: 'protein', tags: ['vegetal'] },
  { id: 39, name: 'Amaranto', calories_per_100g: 371, protein_per_100g: 14, carbs_per_100g: 65, fats_per_100g: 7, category: 'protein', tags: ['vegetal'] },
  { id: 40, name: 'Trigo sarraceno', calories_per_100g: 343, protein_per_100g: 13, carbs_per_100g: 72, fats_per_100g: 3.4, category: 'protein', tags: ['vegetal'] },

  // Frutos secos y semillas
  { id: 41, name: 'Almendras', calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 22, fats_per_100g: 50, category: 'protein', tags: ['grasa'] },
  { id: 42, name: 'Nueces', calories_per_100g: 654, protein_per_100g: 15, carbs_per_100g: 14, fats_per_100g: 65, category: 'protein', tags: ['grasa'] },
  { id: 43, name: 'Anacardos', calories_per_100g: 553, protein_per_100g: 18, carbs_per_100g: 30, fats_per_100g: 44, category: 'protein', tags: ['grasa'] },
  { id: 44, name: 'Pistachos', calories_per_100g: 560, protein_per_100g: 20, carbs_per_100g: 28, fats_per_100g: 45, category: 'protein', tags: ['grasa'] },
  { id: 45, name: 'Semillas de chía', calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fats_per_100g: 31, category: 'protein', tags: ['grasa'] },
  { id: 46, name: 'Semillas de lino', calories_per_100g: 534, protein_per_100g: 18, carbs_per_100g: 29, fats_per_100g: 42, category: 'protein', tags: ['grasa'] },
  { id: 47, name: 'Semillas de girasol', calories_per_100g: 584, protein_per_100g: 21, carbs_per_100g: 20, fats_per_100g: 51, category: 'protein', tags: ['grasa'] },
  { id: 48, name: 'Semillas de calabaza', calories_per_100g: 559, protein_per_100g: 30, carbs_per_100g: 10, fats_per_100g: 49, category: 'protein', tags: ['grasa'] },
  { id: 49, name: 'Cacahuetes', calories_per_100g: 567, protein_per_100g: 26, carbs_per_100g: 16, fats_per_100g: 49, category: 'protein', tags: ['grasa'] },
  { id: 50, name: 'Avellanas', calories_per_100g: 628, protein_per_100g: 15, carbs_per_100g: 17, fats_per_100g: 61, category: 'protein', tags: ['grasa'] },

  // ============================================================================
  // CARBOHIDRATOS (IDs 51-100)
  // ============================================================================
  
  // Cereales y granos
  { id: 51, name: 'Arroz blanco cocido', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fats_per_100g: 0.3, category: 'carb', tags: ['budget'] },
  { id: 52, name: 'Arroz integral cocido', calories_per_100g: 111, protein_per_100g: 2.6, carbs_per_100g: 23, fats_per_100g: 0.9, category: 'carb', tags: ['budget'] },
  { id: 53, name: 'Avena', calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fats_per_100g: 7, category: 'carb', tags: ['budget', 'rapido', 'gluten'] },
  { id: 54, name: 'Pasta integral cocida', calories_per_100g: 124, protein_per_100g: 5, carbs_per_100g: 26, fats_per_100g: 0.5, category: 'carb', tags: ['gluten'] },
  { id: 55, name: 'Pasta blanca cocida', calories_per_100g: 131, protein_per_100g: 5, carbs_per_100g: 25, fats_per_100g: 1.1, category: 'carb', tags: ['gluten'] },
  { id: 56, name: 'Quinoa cocida', calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21, fats_per_100g: 1.9, category: 'carb', tags: ['vegetal'] },
  { id: 57, name: 'Cebada cocida', calories_per_100g: 123, protein_per_100g: 2.3, carbs_per_100g: 28, fats_per_100g: 0.4, category: 'carb', tags: ['gluten'] },
  { id: 58, name: 'Bulgur cocido', calories_per_100g: 83, protein_per_100g: 3.1, carbs_per_100g: 19, fats_per_100g: 0.2, category: 'carb', tags: ['gluten'] },
  { id: 59, name: 'Cuscús cocido', calories_per_100g: 112, protein_per_100g: 3.8, carbs_per_100g: 23, fats_per_100g: 0.2, category: 'carb', tags: ['gluten'] },
  { id: 60, name: 'Mijo cocido', calories_per_100g: 119, protein_per_100g: 3.5, carbs_per_100g: 23, fats_per_100g: 1, category: 'carb', tags: ['vegetal'] },

  // Tubérculos
  { id: 61, name: 'Papa cocida', calories_per_100g: 87, protein_per_100g: 1.9, carbs_per_100g: 20, fats_per_100g: 0.1, category: 'carb', tags: ['budget'] },
  { id: 62, name: 'Batata cocida', calories_per_100g: 90, protein_per_100g: 2, carbs_per_100g: 21, fats_per_100g: 0.2, category: 'carb', tags: ['budget'] },
  { id: 63, name: 'Boniato', calories_per_100g: 90, protein_per_100g: 2, carbs_per_100g: 21, fats_per_100g: 0.2, category: 'carb', tags: ['budget'] },
  { id: 64, name: 'Yuca cocida', calories_per_100g: 160, protein_per_100g: 1.4, carbs_per_100g: 38, fats_per_100g: 0.3, category: 'carb', tags: ['budget'] },
  { id: 65, name: 'Ñame cocido', calories_per_100g: 118, protein_per_100g: 1.5, carbs_per_100g: 28, fats_per_100g: 0.2, category: 'carb', tags: ['budget'] },

  // Panes
  { id: 66, name: 'Pan integral', calories_per_100g: 247, protein_per_100g: 13, carbs_per_100g: 41, fats_per_100g: 3.4, category: 'carb', tags: ['rapido', 'gluten'] },
  { id: 67, name: 'Pan blanco', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fats_per_100g: 3.2, category: 'carb', tags: ['rapido', 'gluten'] },
  { id: 68, name: 'Pan de centeno', calories_per_100g: 259, protein_per_100g: 8.5, carbs_per_100g: 48, fats_per_100g: 3.3, category: 'carb', tags: ['gluten'] },
  { id: 69, name: 'Pan de avena', calories_per_100g: 247, protein_per_100g: 13, carbs_per_100g: 41, fats_per_100g: 3.4, category: 'carb', tags: ['gluten'] },
  { id: 70, name: 'Tortillas de maíz', calories_per_100g: 218, protein_per_100g: 5.7, carbs_per_100g: 45, fats_per_100g: 2.3, category: 'carb', tags: ['budget'] },

  // Frutas
  { id: 71, name: 'Plátano', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 72, name: 'Manzana', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 73, name: 'Naranja', calories_per_100g: 47, protein_per_100g: 0.9, carbs_per_100g: 12, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 74, name: 'Pera', calories_per_100g: 57, protein_per_100g: 0.4, carbs_per_100g: 15, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 75, name: 'Uvas', calories_per_100g: 67, protein_per_100g: 0.6, carbs_per_100g: 17, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 76, name: 'Fresas', calories_per_100g: 32, protein_per_100g: 0.7, carbs_per_100g: 8, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 77, name: 'Kiwi', calories_per_100g: 61, protein_per_100g: 1.1, carbs_per_100g: 15, fats_per_100g: 0.5, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 78, name: 'Piña', calories_per_100g: 50, protein_per_100g: 0.5, carbs_per_100g: 13, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 79, name: 'Mango', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fats_per_100g: 0.4, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 80, name: 'Melón', calories_per_100g: 34, protein_per_100g: 0.8, carbs_per_100g: 8, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },

  // Frutas deshidratadas
  { id: 81, name: 'Pasas', calories_per_100g: 299, protein_per_100g: 3.1, carbs_per_100g: 79, fats_per_100g: 0.5, category: 'carb', tags: ['dulce'] },
  { id: 82, name: 'Dátiles', calories_per_100g: 277, protein_per_100g: 1.8, carbs_per_100g: 75, fats_per_100g: 0.2, category: 'carb', tags: ['dulce'] },
  { id: 83, name: 'Higos secos', calories_per_100g: 249, protein_per_100g: 3.3, carbs_per_100g: 64, fats_per_100g: 0.9, category: 'carb', tags: ['dulce'] },
  { id: 84, name: 'Ciruelas pasas', calories_per_100g: 240, protein_per_100g: 2.2, carbs_per_100g: 64, fats_per_100g: 0.4, category: 'carb', tags: ['dulce'] },
  { id: 85, name: 'Albaricoques secos', calories_per_100g: 241, protein_per_100g: 3.4, carbs_per_100g: 63, fats_per_100g: 0.5, category: 'carb', tags: ['dulce'] },

  // Otros carbohidratos
  { id: 86, name: 'Maíz cocido', calories_per_100g: 96, protein_per_100g: 3.4, carbs_per_100g: 21, fats_per_100g: 1.2, category: 'carb', tags: ['budget'] },
  { id: 87, name: 'Arroz salvaje cocido', calories_per_100g: 101, protein_per_100g: 4, carbs_per_100g: 21, fats_per_100g: 0.3, category: 'carb', tags: ['vegetal'] },
  { id: 88, name: 'Trigo sarraceno cocido', calories_per_100g: 92, protein_per_100g: 3.4, carbs_per_100g: 20, fats_per_100g: 0.6, category: 'carb', tags: ['vegetal'] },
  { id: 89, name: 'Amaranto cocido', calories_per_100g: 102, protein_per_100g: 3.8, carbs_per_100g: 19, fats_per_100g: 1.6, category: 'carb', tags: ['vegetal'] },
  { id: 90, name: 'Teff cocido', calories_per_100g: 101, protein_per_100g: 3.9, carbs_per_100g: 20, fats_per_100g: 0.7, category: 'carb', tags: ['vegetal'] },

  // Legumbres como carbohidratos
  { id: 91, name: 'Lentejas rojas', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fats_per_100g: 0.4, category: 'carb', tags: ['budget', 'vegetal'] },
  { id: 92, name: 'Garbanzos', calories_per_100g: 164, protein_per_100g: 8.9, carbs_per_100g: 27, fats_per_100g: 2.6, category: 'carb', tags: ['budget', 'vegetal'] },
  { id: 93, name: 'Frijoles', calories_per_100g: 132, protein_per_100g: 8.9, carbs_per_100g: 24, fats_per_100g: 0.5, category: 'carb', tags: ['budget', 'vegetal'] },
  { id: 94, name: 'Alubias', calories_per_100g: 127, protein_per_100g: 8.2, carbs_per_100g: 23, fats_per_100g: 0.3, category: 'carb', tags: ['budget', 'vegetal'] },
  { id: 95, name: 'Soja cocida', calories_per_100g: 173, protein_per_100g: 17, carbs_per_100g: 10, fats_per_100g: 9, category: 'carb', tags: ['vegetal'] },

  // Cereales de desayuno
  { id: 96, name: 'Copos de avena', calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fats_per_100g: 7, category: 'carb', tags: ['rapido', 'gluten'] },
  { id: 97, name: 'Muesli', calories_per_100g: 362, protein_per_100g: 10, carbs_per_100g: 66, fats_per_100g: 5.9, category: 'carb', tags: ['rapido'] },
  { id: 98, name: 'Granola', calories_per_100g: 471, protein_per_100g: 10, carbs_per_100g: 64, fats_per_100g: 20, category: 'carb', tags: ['dulce'] },
  { id: 99, name: 'Cereales integrales', calories_per_100g: 339, protein_per_100g: 11, carbs_per_100g: 76, fats_per_100g: 2.1, category: 'carb', tags: ['rapido'] },
  { id: 100, name: 'Copos de maíz', calories_per_100g: 365, protein_per_100g: 8, carbs_per_100g: 84, fats_per_100g: 0.9, category: 'carb', tags: ['rapido'] },

  // ============================================================================
  // GRASAS (IDs 101-130)
  // ============================================================================
  
  // Aceites
  { id: 101, name: 'Aceite de oliva', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 100, category: 'fat', tags: ['cocina'] },
  { id: 102, name: 'Aceite de coco', calories_per_100g: 862, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 100, category: 'fat', tags: ['cocina'] },
  { id: 103, name: 'Aceite de aguacate', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 100, category: 'fat', tags: ['cocina'] },
  { id: 104, name: 'Aceite de girasol', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 100, category: 'fat', tags: ['cocina'] },
  { id: 105, name: 'Aceite de lino', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 100, category: 'fat', tags: ['cocina'] },

  // Frutos secos
  { id: 106, name: 'Almendras', calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 22, fats_per_100g: 50, category: 'fat', tags: ['snack'] },
  { id: 107, name: 'Nueces', calories_per_100g: 654, protein_per_100g: 15, carbs_per_100g: 14, fats_per_100g: 65, category: 'fat', tags: ['snack'] },
  { id: 108, name: 'Anacardos', calories_per_100g: 553, protein_per_100g: 18, carbs_per_100g: 30, fats_per_100g: 44, category: 'fat', tags: ['snack'] },
  { id: 109, name: 'Pistachos', calories_per_100g: 560, protein_per_100g: 20, carbs_per_100g: 28, fats_per_100g: 45, category: 'fat', tags: ['snack'] },
  { id: 110, name: 'Avellanas', calories_per_100g: 628, protein_per_100g: 15, carbs_per_100g: 17, fats_per_100g: 61, category: 'fat', tags: ['snack'] },

  // Mantequillas y cremas
  { id: 111, name: 'Mantequilla de maní', calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fats_per_100g: 50, category: 'fat', tags: ['budget', 'snack'] },
  { id: 112, name: 'Mantequilla de almendras', calories_per_100g: 614, protein_per_100g: 21, carbs_per_100g: 19, fats_per_100g: 55, category: 'fat', tags: ['snack'] },
  { id: 113, name: 'Mantequilla de anacardos', calories_per_100g: 553, protein_per_100g: 18, carbs_per_100g: 30, fats_per_100g: 44, category: 'fat', tags: ['snack'] },
  { id: 114, name: 'Tahini', calories_per_100g: 595, protein_per_100g: 18, carbs_per_100g: 18, fats_per_100g: 54, category: 'fat', tags: ['snack'] },
  { id: 115, name: 'Mantequilla', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fats_per_100g: 81, category: 'fat', tags: ['lacteo'] },

  // Aguacates y aceitunas
  { id: 116, name: 'Aguacate', calories_per_100g: 160, protein_per_100g: 2, carbs_per_100g: 9, fats_per_100g: 15, category: 'fat', tags: ['rapido', 'vegetal'] },
  { id: 117, name: 'Aceitunas verdes', calories_per_100g: 145, protein_per_100g: 1, carbs_per_100g: 4, fats_per_100g: 15, category: 'fat', tags: ['snack'] },
  { id: 118, name: 'Aceitunas negras', calories_per_100g: 116, protein_per_100g: 0.8, carbs_per_100g: 6, fats_per_100g: 11, category: 'fat', tags: ['snack'] },

  // Semillas
  { id: 119, name: 'Semillas de chía', calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fats_per_100g: 31, category: 'fat', tags: ['superfood'] },
  { id: 120, name: 'Semillas de lino', calories_per_100g: 534, protein_per_100g: 18, carbs_per_100g: 29, fats_per_100g: 42, category: 'fat', tags: ['superfood'] },
  { id: 121, name: 'Semillas de girasol', calories_per_100g: 584, protein_per_100g: 21, carbs_per_100g: 20, fats_per_100g: 51, category: 'fat', tags: ['snack'] },
  { id: 122, name: 'Semillas de calabaza', calories_per_100g: 559, protein_per_100g: 30, carbs_per_100g: 10, fats_per_100g: 49, category: 'fat', tags: ['snack'] },
  { id: 123, name: 'Semillas de sésamo', calories_per_100g: 573, protein_per_100g: 18, carbs_per_100g: 23, fats_per_100g: 50, category: 'fat', tags: ['snack'] },

  // Quesos grasos
  { id: 124, name: 'Queso parmesano', calories_per_100g: 431, protein_per_100g: 38, carbs_per_100g: 4.1, fats_per_100g: 29, category: 'fat', tags: ['lacteo'] },
  { id: 125, name: 'Queso cheddar', calories_per_100g: 403, protein_per_100g: 25, carbs_per_100g: 1.3, fats_per_100g: 33, category: 'fat', tags: ['lacteo'] },
  { id: 126, name: 'Queso mozzarella', calories_per_100g: 300, protein_per_100g: 22, carbs_per_100g: 2.2, fats_per_100g: 22, category: 'fat', tags: ['lacteo'] },
  { id: 127, name: 'Queso feta', calories_per_100g: 264, protein_per_100g: 14, carbs_per_100g: 4.1, fats_per_100g: 21, category: 'fat', tags: ['lacteo'] },
  { id: 128, name: 'Queso azul', calories_per_100g: 353, protein_per_100g: 21, carbs_per_100g: 2.3, fats_per_100g: 29, category: 'fat', tags: ['lacteo'] },

  // Otros
  { id: 129, name: 'Coco rallado', calories_per_100g: 660, protein_per_100g: 6.9, carbs_per_100g: 24, fats_per_100g: 65, category: 'fat', tags: ['dulce'] },
  { id: 130, name: 'Coco fresco', calories_per_100g: 354, protein_per_100g: 3.3, carbs_per_100g: 15, fats_per_100g: 33, category: 'fat', tags: ['tropical'] },

  // ============================================================================
  // VEGETALES (IDs 131-170)
  // ============================================================================
  
  // Verduras de hoja verde
  { id: 131, name: 'Espinaca', calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fats_per_100g: 0.4, category: 'vegetable', tags: ['rapido', 'verde'] },
  { id: 132, name: 'Lechuga', calories_per_100g: 15, protein_per_100g: 1.4, carbs_per_100g: 2.9, fats_per_100g: 0.2, category: 'vegetable', tags: ['rapido', 'verde'] },
  { id: 133, name: 'Rúcula', calories_per_100g: 25, protein_per_100g: 2.6, carbs_per_100g: 3.7, fats_per_100g: 0.7, category: 'vegetable', tags: ['verde'] },
  { id: 134, name: 'Col rizada', calories_per_100g: 49, protein_per_100g: 4.3, carbs_per_100g: 8.8, fats_per_100g: 0.9, category: 'vegetable', tags: ['verde', 'superfood'] },
  { id: 135, name: 'Acelgas', calories_per_100g: 19, protein_per_100g: 1.8, carbs_per_100g: 3.7, fats_per_100g: 0.2, category: 'vegetable', tags: ['verde'] },

  // Crucíferas
  { id: 136, name: 'Brócoli', calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fats_per_100g: 0.4, category: 'vegetable', tags: ['budget', 'rapido', 'verde'] },
  { id: 137, name: 'Coliflor', calories_per_100g: 25, protein_per_100g: 1.9, carbs_per_100g: 5, fats_per_100g: 0.3, category: 'vegetable', tags: ['verde'] },
  { id: 138, name: 'Coles de Bruselas', calories_per_100g: 43, protein_per_100g: 3.4, carbs_per_100g: 9, fats_per_100g: 0.3, category: 'vegetable', tags: ['verde'] },
  { id: 139, name: 'Repollo', calories_per_100g: 25, protein_per_100g: 1.3, carbs_per_100g: 6, fats_per_100g: 0.1, category: 'vegetable', tags: ['verde'] },
  { id: 140, name: 'Bok choy', calories_per_100g: 13, protein_per_100g: 1.5, carbs_per_100g: 2.2, fats_per_100g: 0.2, category: 'vegetable', tags: ['verde'] },

  // Raíces y tubérculos
  { id: 141, name: 'Zanahoria', calories_per_100g: 41, protein_per_100g: 0.9, carbs_per_100g: 10, fats_per_100g: 0.2, category: 'vegetable', tags: ['budget', 'rapido', 'naranja'] },
  { id: 142, name: 'Remolacha', calories_per_100g: 43, protein_per_100g: 1.6, carbs_per_100g: 10, fats_per_100g: 0.2, category: 'vegetable', tags: ['rojo'] },
  { id: 143, name: 'Nabo', calories_per_100g: 28, protein_per_100g: 0.9, carbs_per_100g: 6, fats_per_100g: 0.1, category: 'vegetable', tags: ['blanco'] },
  { id: 144, name: 'Rábano', calories_per_100g: 16, protein_per_100g: 0.7, carbs_per_100g: 3.4, fats_per_100g: 0.1, category: 'vegetable', tags: ['picante'] },
  { id: 145, name: 'Jengibre', calories_per_100g: 80, protein_per_100g: 1.8, carbs_per_100g: 18, fats_per_100g: 0.8, category: 'vegetable', tags: ['picante'] },

  // Frutos
  { id: 146, name: 'Tomate', calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fats_per_100g: 0.2, category: 'vegetable', tags: ['rapido', 'rojo'] },
  { id: 147, name: 'Pimiento rojo', calories_per_100g: 31, protein_per_100g: 1, carbs_per_100g: 6, fats_per_100g: 0.3, category: 'vegetable', tags: ['rapido', 'rojo'] },
  { id: 148, name: 'Pimiento verde', calories_per_100g: 20, protein_per_100g: 0.9, carbs_per_100g: 4.6, fats_per_100g: 0.2, category: 'vegetable', tags: ['rapido', 'verde'] },
  { id: 149, name: 'Pimiento amarillo', calories_per_100g: 27, protein_per_100g: 1, carbs_per_100g: 6, fats_per_100g: 0.2, category: 'vegetable', tags: ['rapido', 'amarillo'] },
  { id: 150, name: 'Berenjena', calories_per_100g: 25, protein_per_100g: 1, carbs_per_100g: 6, fats_per_100g: 0.2, category: 'vegetable', tags: ['morado'] },

  // Bulbos
  { id: 151, name: 'Cebolla', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9, fats_per_100g: 0.1, category: 'vegetable', tags: ['budget', 'picante'] },
  { id: 152, name: 'Ajo', calories_per_100g: 149, protein_per_100g: 6.4, carbs_per_100g: 33, fats_per_100g: 0.5, category: 'vegetable', tags: ['picante'] },
  { id: 153, name: 'Cebolleta', calories_per_100g: 32, protein_per_100g: 1.8, carbs_per_100g: 7, fats_per_100g: 0.2, category: 'vegetable', tags: ['verde'] },
  { id: 154, name: 'Puerro', calories_per_100g: 61, protein_per_100g: 1.5, carbs_per_100g: 14, fats_per_100g: 0.3, category: 'vegetable', tags: ['verde'] },
  { id: 155, name: 'Chalota', calories_per_100g: 72, protein_per_100g: 2.5, carbs_per_100g: 17, fats_per_100g: 0.1, category: 'vegetable', tags: ['picante'] },

  // Legumbres verdes
  { id: 156, name: 'Judías verdes', calories_per_100g: 31, protein_per_100g: 1.8, carbs_per_100g: 7, fats_per_100g: 0.2, category: 'vegetable', tags: ['verde'] },
  { id: 157, name: 'Guisantes', calories_per_100g: 81, protein_per_100g: 5.4, carbs_per_100g: 14, fats_per_100g: 0.4, category: 'vegetable', tags: ['verde'] },
  { id: 158, name: 'Habas', calories_per_100g: 88, protein_per_100g: 7.6, carbs_per_100g: 20, fats_per_100g: 0.4, category: 'vegetable', tags: ['verde'] },
  { id: 159, name: 'Edamame', calories_per_100g: 122, protein_per_100g: 11, carbs_per_100g: 10, fats_per_100g: 5, category: 'vegetable', tags: ['verde'] },
  { id: 160, name: 'Alubias verdes', calories_per_100g: 31, protein_per_100g: 1.8, carbs_per_100g: 7, fats_per_100g: 0.2, category: 'vegetable', tags: ['verde'] },

  // Setas y hongos
  { id: 161, name: 'Champiñones', calories_per_100g: 22, protein_per_100g: 3.1, carbs_per_100g: 3.3, fats_per_100g: 0.3, category: 'vegetable', tags: ['umami'] },
  { id: 162, name: 'Portobello', calories_per_100g: 22, protein_per_100g: 3.1, carbs_per_100g: 3.3, fats_per_100g: 0.3, category: 'vegetable', tags: ['umami'] },
  { id: 163, name: 'Shiitake', calories_per_100g: 34, protein_per_100g: 2.2, carbs_per_100g: 7, fats_per_100g: 0.5, category: 'vegetable', tags: ['umami'] },
  { id: 164, name: 'Ostra', calories_per_100g: 33, protein_per_100g: 3.3, carbs_per_100g: 6, fats_per_100g: 0.4, category: 'vegetable', tags: ['umami'] },
  { id: 165, name: 'Reishi', calories_per_100g: 31, protein_per_100g: 2.3, carbs_per_100g: 6, fats_per_100g: 0.3, category: 'vegetable', tags: ['umami', 'superfood'] },

  // Hierbas y especias
  { id: 166, name: 'Perejil', calories_per_100g: 36, protein_per_100g: 3, carbs_per_100g: 6, fats_per_100g: 0.8, category: 'vegetable', tags: ['hierba'] },
  { id: 167, name: 'Cilantro', calories_per_100g: 23, protein_per_100g: 2.1, carbs_per_100g: 3.7, fats_per_100g: 0.5, category: 'vegetable', tags: ['hierba'] },
  { id: 168, name: 'Albahaca', calories_per_100g: 22, protein_per_100g: 3.2, carbs_per_100g: 2.6, fats_per_100g: 0.6, category: 'vegetable', tags: ['hierba'] },
  { id: 169, name: 'Orégano', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 69, fats_per_100g: 4.3, category: 'vegetable', tags: ['hierba'] },
  { id: 170, name: 'Tomillo', calories_per_100g: 276, protein_per_100g: 9, carbs_per_100g: 63, fats_per_100g: 7.4, category: 'vegetable', tags: ['hierba'] },

  // ============================================================================
  // FRUTAS (IDs 171-200)
  // ============================================================================
  
  // Frutas tropicales
  { id: 171, name: 'Plátano', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget', 'tropical'] },
  { id: 172, name: 'Mango', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fats_per_100g: 0.4, category: 'fruit', tags: ['rapido', 'budget', 'tropical'] },
  { id: 173, name: 'Piña', calories_per_100g: 50, protein_per_100g: 0.5, carbs_per_100g: 13, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget', 'tropical'] },
  { id: 174, name: 'Papaya', calories_per_100g: 43, protein_per_100g: 0.5, carbs_per_100g: 11, fats_per_100g: 0.3, category: 'fruit', tags: ['tropical'] },
  { id: 175, name: 'Coco fresco', calories_per_100g: 354, protein_per_100g: 3.3, carbs_per_100g: 15, fats_per_100g: 33, category: 'fruit', tags: ['tropical'] },

  // Frutas cítricas
  { id: 176, name: 'Naranja', calories_per_100g: 47, protein_per_100g: 0.9, carbs_per_100g: 12, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget', 'citrico'] },
  { id: 177, name: 'Limón', calories_per_100g: 29, protein_per_100g: 1.1, carbs_per_100g: 9, fats_per_100g: 0.3, category: 'fruit', tags: ['citrico'] },
  { id: 178, name: 'Lima', calories_per_100g: 30, protein_per_100g: 0.7, carbs_per_100g: 11, fats_per_100g: 0.2, category: 'fruit', tags: ['citrico'] },
  { id: 179, name: 'Pomelo', calories_per_100g: 42, protein_per_100g: 0.8, carbs_per_100g: 11, fats_per_100g: 0.1, category: 'fruit', tags: ['citrico'] },
  { id: 180, name: 'Mandarina', calories_per_100g: 53, protein_per_100g: 0.8, carbs_per_100g: 13, fats_per_100g: 0.3, category: 'fruit', tags: ['citrico'] },

  // Frutas de temporada
  { id: 181, name: 'Manzana', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 182, name: 'Pera', calories_per_100g: 57, protein_per_100g: 0.4, carbs_per_100g: 15, fats_per_100g: 0.1, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 183, name: 'Melocotón', calories_per_100g: 39, protein_per_100g: 0.9, carbs_per_100g: 10, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 184, name: 'Ciruela', calories_per_100g: 46, protein_per_100g: 0.7, carbs_per_100g: 11, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 185, name: 'Cereza', calories_per_100g: 63, protein_per_100g: 1.1, carbs_per_100g: 16, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },

  // Frutas rojas
  { id: 186, name: 'Fresa', calories_per_100g: 32, protein_per_100g: 0.7, carbs_per_100g: 8, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget', 'rojo'] },
  { id: 187, name: 'Frambuesa', calories_per_100g: 52, protein_per_100g: 1.2, carbs_per_100g: 12, fats_per_100g: 0.7, category: 'fruit', tags: ['rojo'] },
  { id: 188, name: 'Arándano', calories_per_100g: 57, protein_per_100g: 0.7, carbs_per_100g: 14, fats_per_100g: 0.3, category: 'fruit', tags: ['rojo', 'superfood'] },
  { id: 189, name: 'Mora', calories_per_100g: 43, protein_per_100g: 1.4, carbs_per_100g: 10, fats_per_100g: 0.5, category: 'fruit', tags: ['rojo'] },
  { id: 190, name: 'Granada', calories_per_100g: 83, protein_per_100g: 1.7, carbs_per_100g: 19, fats_per_100g: 1.2, category: 'fruit', tags: ['rojo'] },

  // Frutas exóticas
  { id: 191, name: 'Kiwi', calories_per_100g: 61, protein_per_100g: 1.1, carbs_per_100g: 15, fats_per_100g: 0.5, category: 'fruit', tags: ['rapido', 'budget', 'exotico'] },
  { id: 192, name: 'Uva', calories_per_100g: 67, protein_per_100g: 0.6, carbs_per_100g: 17, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget'] },
  { id: 193, name: 'Higo', calories_per_100g: 74, protein_per_100g: 0.8, carbs_per_100g: 19, fats_per_100g: 0.3, category: 'fruit', tags: ['dulce'] },
  { id: 194, name: 'Dátil', calories_per_100g: 277, protein_per_100g: 1.8, carbs_per_100g: 75, fats_per_100g: 0.2, category: 'fruit', tags: ['dulce'] },
  { id: 195, name: 'Higos secos', calories_per_100g: 249, protein_per_100g: 3.3, carbs_per_100g: 64, fats_per_100g: 0.9, category: 'fruit', tags: ['dulce'] },

  // Frutas de verano
  { id: 196, name: 'Melón', calories_per_100g: 34, protein_per_100g: 0.8, carbs_per_100g: 8, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget', 'verano'] },
  { id: 197, name: 'Sandía', calories_per_100g: 30, protein_per_100g: 0.6, carbs_per_100g: 8, fats_per_100g: 0.2, category: 'fruit', tags: ['rapido', 'budget', 'verano'] },
  { id: 198, name: 'Melocotón', calories_per_100g: 39, protein_per_100g: 0.9, carbs_per_100g: 10, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget', 'verano'] },
  { id: 199, name: 'Nectarina', calories_per_100g: 44, protein_per_100g: 1.1, carbs_per_100g: 11, fats_per_100g: 0.3, category: 'fruit', tags: ['rapido', 'budget', 'verano'] },
  { id: 200, name: 'Albaricoque', calories_per_100g: 48, protein_per_100g: 1.4, carbs_per_100g: 11, fats_per_100g: 0.4, category: 'fruit', tags: ['rapido', 'budget', 'verano'] },
];

// ============================================================================
// CÁLCULOS DE NUTRICIÓN
// ============================================================================

/**
 * Calcula el BMR usando Mifflin-St Jeor
 */
export function calculateBMR(
  sex: 'male' | 'female',
  weight_kg: number,
  height_cm: number,
  age: number
): number {
  if (sex === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
}

/**
 * Calcula el TDEE (BMR * factor de actividad)
 */
export function calculateTDEE(bmr: number, activity: Activity): number {
  const activityMultipliers: Record<Activity, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
  };
  return Math.round(bmr * activityMultipliers[activity]);
}

/**
 * Calcula calorías objetivo según meta
 */
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  const adjustments: Record<Goal, number> = {
    cut: -500,
    recomp: -200,
    maintain: 0,
    bulk: 250, // Reducido de 400 a 250 para un bulk más moderado y sostenible
  };
  return Math.round(tdee + adjustments[goal]);
}

/**
 * Calcula macros objetivo
 */
export function calculateMacros(
  targetCalories: number,
  weight_kg: number,
  goal: Goal
): { protein_g: number; carbs_g: number; fats_g: number } {
  // Proteína: 1.8-2.2 g/kg según objetivo
  const proteinMultiplier = goal === 'bulk' ? 2.0 : goal === 'cut' ? 2.2 : 1.8;
  const protein_g = Math.round(weight_kg * proteinMultiplier);

  // Grasas: 25% de calorías
  const fatCalories = targetCalories * 0.25;
  const fats_g = Math.round(fatCalories / 9);

  // Carbos: el resto
  const remainingCalories = targetCalories - protein_g * 4 - fats_g * 9;
  const carbs_g = Math.round(remainingCalories / 4);

  return { protein_g, carbs_g, fats_g };
}

/**
 * Genera explicación educativa del ajuste nutricional
 */
function generateEducationalExplanation(
  goal: Goal,
  weightChange: number,
  bodyFatChange: number | null,
  muscleChange: number | null,
  currentCalories: number,
  newCalories: number,
  adherence: number
): { explanation: string; educationalMessage: string } {
  const caloriesChange = newCalories - currentCalories;
  const isAdjusting = caloriesChange !== 0;

  let explanation = '';
  let educationalMessage = '';

  // Análisis de la situación
  const goalNames: Record<Goal, string> = {
    cut: 'perder grasa',
    recomp: 'recomposición corporal',
    maintain: 'mantener peso',
    bulk: 'ganar músculo',
  };

  const goalName = goalNames[goal];

  // Análisis de composición corporal
  if (bodyFatChange !== null && muscleChange !== null) {
    if (bodyFatChange < 0 && muscleChange >= 0) {
      // Recomposición perfecta
      explanation = `✅ Excelente! Estás perdiendo grasa (${Math.abs(bodyFatChange).toFixed(1)}%) y manteniendo/aumentando músculo (${muscleChange >= 0 ? '+' : ''}${muscleChange.toFixed(1)}%).`;
      educationalMessage = `Tu dieta está funcionando perfectamente. Estás logrando una recomposición corporal: bajando grasa sin perder músculo. Esto significa que estás en un déficit calórico moderado que permite mantener masa muscular.`;
    } else if (bodyFatChange < 0 && muscleChange < 0) {
      // Perdiendo grasa pero también músculo
      explanation = `⚠️ Atención: Estás perdiendo grasa pero también músculo (${muscleChange.toFixed(1)}%).`;
      educationalMessage = `El déficit calórico es muy agresivo, provocando pérdida de músculo además de grasa. Necesitamos aumentar ligeramente las calorías y proteína para proteger tu masa muscular.`;
    } else if (bodyFatChange > 0 && muscleChange > 0) {
      // Ganando grasa y músculo
      if (goal === 'bulk') {
        explanation = `📈 Bulking: Estás ganando músculo (${muscleChange.toFixed(1)}%) pero también algo de grasa (${bodyFatChange.toFixed(1)}%).`;
        educationalMessage = `En proceso de ganancia de masa muscular, es normal ganar algo de grasa. Si quieres mantener un bulk más limpio, podemos ajustar las calorías ligeramente.`;
      } else {
        explanation = `⚠️ Estás ganando grasa (${bodyFatChange.toFixed(1)}%) y músculo (${muscleChange.toFixed(1)}%).`;
        educationalMessage = `Estás en un superávit calórico. Aunque ganas músculo, también estás ganando grasa. Para tu objetivo de ${goalName}, necesitamos reducir ligeramente las calorías.`;
      }
    } else {
      explanation = `📊 Peso estable, revisando composición corporal.`;
      educationalMessage = `Tu peso se mantiene estable. Estamos analizando tu composición corporal para determinar el siguiente paso.`;
    }
  } else {
    // Sin datos de composición, usar solo peso
    if (goal === 'cut') {
      if (weightChange < -0.7) {
        explanation = `⚠️ Perdiendo peso muy rápido (${Math.abs(weightChange).toFixed(1)} kg/sem).`;
        educationalMessage = `Estás perdiendo más de 0.7 kg por semana, lo cual es demasiado rápido y puede incluir pérdida de músculo. Vamos a aumentar ligeramente las calorías (${caloriesChange > 0 ? '+' : ''}${Math.abs(caloriesChange)} kcal) para frenar la pérdida de masa muscular.`;
      } else if (weightChange >= -0.3 && weightChange <= -0.7) {
        explanation = `✅ Perdiendo peso a buen ritmo (${Math.abs(weightChange).toFixed(1)} kg/sem).`;
        educationalMessage = `Tu velocidad de pérdida de peso está en el rango ideal (0.3-0.7 kg por semana). Esto minimiza la pérdida de músculo. Vamos a mantener las calorías actuales.`;
        if (isAdjusting && caloriesChange < 0) {
          educationalMessage = `Aunque estás perdiendo a buen ritmo, vamos a aumentar ligeramente las calorías (${Math.abs(caloriesChange)} kcal) para asegurar que no pierdas músculo.`;
        }
      } else if (weightChange > -0.3) {
        explanation = `🐌 Perdiendo peso muy lento (${Math.abs(weightChange).toFixed(1)} kg/sem).`;
        educationalMessage = `Estás perdiendo menos de 0.3 kg por semana, lo cual es muy lento. Vamos a reducir las calorías (${caloriesChange} kcal) para acelerar tu pérdida de grasa. Recuerda: esto debe combinarse con entrenamiento de fuerza para preservar músculo.`;
      } else {
        explanation = `📈 Ganando peso (${weightChange.toFixed(1)} kg/sem) en modo CUT.`;
        educationalMessage = `Estás ganando peso cuando tu objetivo es perder grasa. Vamos a reducir las calorías (${caloriesChange} kcal) para crear un déficit calórico efectivo.`;
      }
    } else if (goal === 'bulk') {
      if (weightChange > 0.5) {
        explanation = `⚠️ Ganando peso muy rápido (${weightChange.toFixed(1)} kg/sem).`;
        educationalMessage = `Estás ganando más de 0.5 kg por semana, lo cual probablemente incluye mucha grasa junto con músculo. Vamos a reducir ligeramente las calorías (${caloriesChange} kcal) para un bulk más limpio.`;
      } else if (weightChange >= 0.2 && weightChange <= 0.5) {
        explanation = `✅ Ganando peso a ritmo óptimo (${weightChange.toFixed(1)} kg/sem).`;
        educationalMessage = `Tu velocidad de ganancia está en el rango ideal (0.2-0.5 kg por semana). Esto maximiza la ganancia de músculo minimizando grasa. Mantendremos las calorías actuales.`;
        if (isAdjusting && caloriesChange > 0) {
          educationalMessage = `Aunque ganando bien, vamos a ajustar ligeramente (${caloriesChange} kcal) para optimizar.`;
        }
      } else if (weightChange < 0.2 && weightChange >= 0) {
        explanation = `🐌 Ganando muy lento (${weightChange.toFixed(1)} kg/sem).`;
        educationalMessage = `Estás ganando menos de 0.2 kg por semana, lo cual es muy lento para ganar músculo. Vamos a aumentar las calorías (${caloriesChange > 0 ? '+' : ''}${caloriesChange} kcal) y asegurar proteína suficiente para estimular la síntesis proteica.`;
      } else {
        explanation = `📉 Perdiendo peso en modo BULK.`;
        educationalMessage = `Estás perdiendo peso cuando tu objetivo es ganar músculo. Necesitamos aumentar las calorías (${caloriesChange > 0 ? '+' : ''}${caloriesChange} kcal) para crear un superávit calórico.`;
      }
    } else {
      // maintain o recomp
      if (Math.abs(weightChange) > 0.1) {
        explanation = `📊 Peso fuera del rango objetivo (${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg/sem).`;
        educationalMessage = `Tu peso está cambiando más de lo deseado para ${goalName}. Vamos a ajustar las calorías (${caloriesChange > 0 ? '+' : ''}${caloriesChange} kcal) para mantener el equilibrio.`;
      } else {
        explanation = `✅ Peso estable (${weightChange.toFixed(1)} kg/sem).`;
        educationalMessage = `Tu peso se mantiene estable, lo cual es perfecto para ${goalName}. Las calorías actuales están funcionando bien, las mantenemos.`;
      }
    }
  }

  // Información sobre adherencia
  if (adherence < 70) {
    explanation += ` Adherencia: ${Math.round(adherence)}%`;
    educationalMessage += ` Nota: Tu adherencia a la dieta es del ${Math.round(adherence)}%. Para obtener los mejores resultados, intenta registrar al menos el 70% de tus comidas.`;
  }

  return { explanation, educationalMessage };
}

/**
 * Ajuste semanal de calorías según progreso
 */
export function calculateWeeklyAdjustment(
  currentCalories: number,
  avgWeightChange: number, // kg (negativo = pérdida)
  adherence: number, // 0-100%
  goal: Goal
): number {
  // Solo ajustar si adherencia >= 70%
  if (adherence < 70) {
    return currentCalories;
  }

  const targetWeightChange: Record<Goal, { min: number; max: number }> = {
    cut: { min: -0.7, max: -0.3 }, // -0.3 a -0.7 kg/semana
    recomp: { min: -0.2, max: 0.1 },
    maintain: { min: -0.1, max: 0.1 },
    bulk: { min: 0.2, max: 0.5 }, // +0.2 a +0.5 kg/semana
  };

  const target = targetWeightChange[goal];

  // Si el cambio está dentro del rango, mantener
  if (avgWeightChange >= target.min && avgWeightChange <= target.max) {
    return currentCalories;
  }

  // Ajustar ±5%
  if (avgWeightChange < target.min) {
    // Perdiendo muy rápido (cut) o no ganando suficiente (bulk)
    return Math.round(currentCalories * (goal === 'cut' ? 1.05 : 1.05));
  } else {
    // Perdiendo muy lento (cut) o ganando muy rápido (bulk)
    return Math.round(currentCalories * 0.95);
  }
}

// ============================================================================
// GENERACIÓN DE PLANES DE COMIDAS
// ============================================================================

/**
 * Obtiene perfil del onboarding existente
 */
export async function getOnboardingProfileLite(
  userId: string
): Promise<UserProfileLite | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('gender, age, height, weight, body_fat_percentage, muscle_percentage, activity_types, goals')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching onboarding profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log('📋 Datos del perfil de usuario:', {
      weight: data.weight,
      height: data.height,
      age: data.age,
      body_fat_percentage: data.body_fat_percentage,
      muscle_percentage: data.muscle_percentage,
      activity_types: data.activity_types,
      goals: data.goals,
    });

    // Calcular edad si tenemos el año
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - (data.age || 25);
    const birthdate = `${birthYear}-01-01`;

    // Mapear activity_types a Activity
    // Usar el primer tipo de actividad para determinar el nivel
    const activityMap: Record<string, Activity> = {
      cardio: 'moderate',      // 1.55x - 3-5 días/semana cardio
      strength: 'moderate',    // 1.55x - Entrenamiento de fuerza regular
      sports: 'moderate',      // 1.55x - Deportes regulares
      yoga: 'light',           // 1.375x - Actividad ligera
      hiit: 'high',            // 1.725x - Alta intensidad
      mixed: 'moderate',       // 1.55x - Combinación de actividades
    };
    const activityLevel: Activity = activityMap[data.activity_types?.[0] || 'mixed'] || 'moderate';
    
    console.log('🏃 Activity level calculado:', activityLevel, 'desde activity_type:', data.activity_types?.[0]);
    
    const weight_kg = data.weight || 70;
    console.log('⚖️ Peso utilizado:', weight_kg, 'kg');

    // Mapear goals a Goal
    const goalMap: Record<string, Goal> = {
      weight_loss: 'cut',
      muscle_gain: 'bulk',
      endurance: 'maintain',
      flexibility: 'maintain',
      general_health: 'maintain',
    };
    const goal: Goal = goalMap[data.goals?.[0] || 'general_health'] || 'maintain';

    return {
      sex: data.gender === 'female' ? 'female' : 'male',
      birthdate,
      height_cm: data.height || 170,
      weight_kg,
      body_fat_percentage: data.body_fat_percentage,
      muscle_percentage: data.muscle_percentage,
      activity_level: activityLevel,
      goal,
    };
  } catch (err) {
    console.error('Error in getOnboardingProfileLite:', err);
    return null;
  }
}

/**
 * Calcula macros de una opción de comida
 */
function calculateMealMacros(items: { food_id: number; grams: number }[]): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
} {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fats_g = 0;

  items.forEach((item) => {
           // Validar que el item tenga food_id válido
           if (!item.food_id || typeof item.food_id !== 'number' || item.food_id < 1 || item.food_id > 200) {
             console.warn(`⚠️ Food ID inválido: ${item.food_id}, saltando item`);
             return;
           }

    // Validar que tenga grams válido
    if (!item.grams || typeof item.grams !== 'number' || item.grams <= 0) {
      console.warn(`⚠️ Grams inválido: ${item.grams}, saltando item`);
      return;
    }

    const food = FOOD_DATABASE.find((f) => f.id === item.food_id);
    if (food) {
      const factor = item.grams / 100;
      calories += food.calories_per_100g * factor;
      protein_g += food.protein_per_100g * factor;
      carbs_g += food.carbs_per_100g * factor;
      fats_g += food.fats_per_100g * factor;
    } else {
      console.warn(`⚠️ Alimento con ID ${item.food_id} no encontrado en la base de datos`);
    }
  });

  return {
    calories: Math.round(calories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fats_g: Math.round(fats_g),
  };
}

/**
 * Genera plantillas de comidas según preferencias
 */
function generateMealTemplates(
  customPrompts: string[],
  mealsPerDay: number
): { breakfast: MealOption[]; lunch: MealOption[]; dinner: MealOption[]; snacks: MealOption[] } {
  // Analizar prompts para preferencias
  const prefersRapido = customPrompts.some((p) => p.toLowerCase().includes('rápido') || p.toLowerCase().includes('rapido'));
  const prefersPescado = customPrompts.some((p) => p.toLowerCase().includes('pescado') && !p.toLowerCase().includes('sin') && !p.toLowerCase().includes('no'));
  const prefersBudget = customPrompts.some((p) => p.toLowerCase().includes('budget') || p.toLowerCase().includes('económico') || p.toLowerCase().includes('economico'));

  // Analizar prompts para exclusiones
  const excludePescado = customPrompts.some((p) => 
    (p.toLowerCase().includes('sin pescado') || 
     p.toLowerCase().includes('no pescado') || 
     p.toLowerCase().includes('sin mariscos') ||
     p.toLowerCase().includes('no mariscos') ||
     (p.toLowerCase().includes('evitar') && p.toLowerCase().includes('pescado')))
  );
  const excludeLacteos = customPrompts.some((p) => 
    (p.toLowerCase().includes('sin lácteos') || 
     p.toLowerCase().includes('sin lacteos') ||
     p.toLowerCase().includes('no lácteos') ||
     p.toLowerCase().includes('no lacteos') ||
     p.toLowerCase().includes('sin leche') ||
     (p.toLowerCase().includes('evitar') && (p.toLowerCase().includes('lácteo') || p.toLowerCase().includes('lacteo'))))
  );
  const excludeGluten = customPrompts.some((p) => 
    (p.toLowerCase().includes('sin gluten') ||
     p.toLowerCase().includes('no gluten') ||
     p.toLowerCase().includes('celíaco') ||
     p.toLowerCase().includes('celiaco') ||
     (p.toLowerCase().includes('evitar') && p.toLowerCase().includes('gluten')))
  );
  const excludeCarne = customPrompts.some((p) => 
    (p.toLowerCase().includes('vegetariano') ||
     p.toLowerCase().includes('sin carne') ||
     p.toLowerCase().includes('no carne') ||
     (p.toLowerCase().includes('evitar') && p.toLowerCase().includes('carne')))
  );

  // Filtrar alimentos según exclusiones
  let foods = [...FOOD_DATABASE];
  
  if (excludePescado) {
    foods = foods.filter((f) => !f.tags?.includes('pescado'));
  }
  if (excludeLacteos) {
    foods = foods.filter((f) => !f.tags?.includes('lacteo'));
  }
  if (excludeGluten) {
    foods = foods.filter((f) => !f.tags?.includes('gluten'));
  }
  if (excludeCarne) {
    foods = foods.filter((f) => !f.tags?.includes('carne'));
  }

  // Ordenar por preferencias (no exclusiones)
  if (prefersRapido) {
    foods = foods.sort((a, b) => {
      const aRapido = a.tags?.includes('rapido') ? 1 : 0;
      const bRapido = b.tags?.includes('rapido') ? 1 : 0;
      return bRapido - aRapido;
    });
  }
  if (prefersPescado && !excludePescado) {
    foods = foods.sort((a, b) => {
      const aPescado = a.tags?.includes('pescado') ? 1 : 0;
      const bPescado = b.tags?.includes('pescado') ? 1 : 0;
      return bPescado - aPescado;
    });
  }
  if (prefersBudget) {
    foods = foods.sort((a, b) => {
      const aBudget = a.tags?.includes('budget') ? 1 : 0;
      const bBudget = b.tags?.includes('budget') ? 1 : 0;
      return bBudget - aBudget;
    });
  }

  // Plantillas de desayuno
  const breakfasts: MealOption[] = [
    {
      name: 'Avena con proteína',
      items: [
        { food_id: 13, grams: 80 }, // Avena
        { food_id: 9, grams: 150 }, // Yogur griego
        { food_id: 19, grams: 100 }, // Plátano
        { food_id: 22, grams: 20 }, // Almendras
      ],
      tags: ['rapido', 'budget'],
      prep_time_min: 5,
      ...calculateMealMacros([
        { food_id: 13, grams: 80 },
        { food_id: 9, grams: 150 },
        { food_id: 19, grams: 100 },
        { food_id: 22, grams: 20 },
      ]),
    },
    {
      name: 'Huevos revueltos con tostadas',
      items: [
        { food_id: 2, grams: 150 }, // 3 huevos
        { food_id: 16, grams: 60 }, // Pan integral
        { food_id: 23, grams: 50 }, // Aguacate
      ],
      tags: ['rapido', 'budget'],
      prep_time_min: 10,
      ...calculateMealMacros([
        { food_id: 2, grams: 150 },
        { food_id: 16, grams: 60 },
        { food_id: 23, grams: 50 },
      ]),
    },
    {
      name: 'Batido proteico',
      items: [
        { food_id: 9, grams: 200 }, // Yogur griego
        { food_id: 19, grams: 120 }, // Plátano
        { food_id: 13, grams: 40 }, // Avena
        { food_id: 24, grams: 20 }, // Mantequilla de maní
      ],
      tags: ['rapido'],
      prep_time_min: 3,
      ...calculateMealMacros([
        { food_id: 9, grams: 200 },
        { food_id: 19, grams: 120 },
        { food_id: 13, grams: 40 },
        { food_id: 24, grams: 20 },
      ]),
    },
  ];

  // Plantillas de almuerzo/cena
  const mainMeals: MealOption[] = [
    {
      name: 'Pollo con arroz y brócoli',
      items: [
        { food_id: 1, grams: 150 }, // Pollo
        { food_id: 11, grams: 150 }, // Arroz blanco
        { food_id: 25, grams: 150 }, // Brócoli
        { food_id: 21, grams: 10 }, // Aceite de oliva
      ],
      tags: ['budget'],
      prep_time_min: 25,
      ...calculateMealMacros([
        { food_id: 1, grams: 150 },
        { food_id: 11, grams: 150 },
        { food_id: 25, grams: 150 },
        { food_id: 21, grams: 10 },
      ]),
    },
    {
      name: 'Salmón con batata y espinaca',
      items: [
        { food_id: 4, grams: 150 }, // Salmón
        { food_id: 15, grams: 200 }, // Batata
        { food_id: 26, grams: 100 }, // Espinaca
        { food_id: 21, grams: 10 }, // Aceite de oliva
      ],
      tags: ['pescado'],
      prep_time_min: 30,
      ...calculateMealMacros([
        { food_id: 4, grams: 150 },
        { food_id: 15, grams: 200 },
        { food_id: 26, grams: 100 },
        { food_id: 21, grams: 10 },
      ]),
    },
    {
      name: 'Atún con pasta y ensalada',
      items: [
        { food_id: 3, grams: 120 }, // Atún
        { food_id: 17, grams: 150 }, // Pasta integral
        { food_id: 29, grams: 80 }, // Lechuga
        { food_id: 28, grams: 100 }, // Tomate
        { food_id: 21, grams: 15 }, // Aceite de oliva
      ],
      tags: ['rapido', 'pescado'],
      prep_time_min: 15,
      ...calculateMealMacros([
        { food_id: 3, grams: 120 },
        { food_id: 17, grams: 150 },
        { food_id: 29, grams: 80 },
        { food_id: 28, grams: 100 },
        { food_id: 21, grams: 15 },
      ]),
    },
    {
      name: 'Carne con papa y vegetales',
      items: [
        { food_id: 5, grams: 150 }, // Carne molida
        { food_id: 14, grams: 200 }, // Papa
        { food_id: 27, grams: 100 }, // Zanahoria
        { food_id: 30, grams: 80 }, // Pimiento
        { food_id: 21, grams: 10 }, // Aceite de oliva
      ],
      tags: ['budget'],
      prep_time_min: 30,
      ...calculateMealMacros([
        { food_id: 5, grams: 150 },
        { food_id: 14, grams: 200 },
        { food_id: 27, grams: 100 },
        { food_id: 30, grams: 80 },
        { food_id: 21, grams: 10 },
      ]),
    },
    {
      name: 'Lentejas con arroz',
      items: [
        { food_id: 6, grams: 200 }, // Lentejas
        { food_id: 12, grams: 120 }, // Arroz integral
        { food_id: 28, grams: 100 }, // Tomate
        { food_id: 21, grams: 10 }, // Aceite de oliva
      ],
      tags: ['budget'],
      prep_time_min: 35,
      ...calculateMealMacros([
        { food_id: 6, grams: 200 },
        { food_id: 12, grams: 120 },
        { food_id: 28, grams: 100 },
        { food_id: 21, grams: 10 },
      ]),
    },
  ];

  // Snacks
  const snacks: MealOption[] = [
    {
      name: 'Yogur con frutos secos',
      items: [
        { food_id: 9, grams: 150 }, // Yogur griego
        { food_id: 22, grams: 30 }, // Almendras
      ],
      tags: ['rapido'],
      prep_time_min: 2,
      ...calculateMealMacros([
        { food_id: 9, grams: 150 },
        { food_id: 22, grams: 30 },
      ]),
    },
    {
      name: 'Manzana con mantequilla de maní',
      items: [
        { food_id: 20, grams: 150 }, // Manzana
        { food_id: 24, grams: 25 }, // Mantequilla de maní
      ],
      tags: ['rapido', 'budget'],
      prep_time_min: 2,
      ...calculateMealMacros([
        { food_id: 20, grams: 150 },
        { food_id: 24, grams: 25 },
      ]),
    },
    {
      name: 'Queso cottage con frutas',
      items: [
        { food_id: 10, grams: 150 }, // Queso cottage
        { food_id: 19, grams: 100 }, // Plátano
      ],
      tags: ['rapido'],
      prep_time_min: 2,
      ...calculateMealMacros([
        { food_id: 10, grams: 150 },
        { food_id: 19, grams: 100 },
      ]),
    },
  ];

  return {
    breakfast: breakfasts,
    lunch: mainMeals,
    dinner: mainMeals,
    snacks,
  };
}

/**
 * Escala las porciones de las comidas para alcanzar las calorías objetivo
 */
function scaleMealPortions(
  meals: MealOption[],
  targetCalories: number
): MealOption[] {
  return meals.map((meal) => {
    // Calcular el factor de escala basado en las calorías objetivo
    const currentCalories = meal.calories;
    const scaleFactor = targetCalories / currentCalories;

    // Escalar todos los ingredientes
    const scaledItems = meal.items.map((item) => ({
      ...item,
      grams: Math.round(item.grams * scaleFactor),
    }));

    // Recalcular macros con las nuevas cantidades
    const scaledMacros = calculateMealMacros(scaledItems);

    return {
      ...meal,
      items: scaledItems,
      ...scaledMacros,
    };
  });
}

/**
 * Genera plan de comidas usando IA (OpenAI)
 */
async function generateAIMealPlan(
  targets: NutritionTarget,
  mealsPerDay: number,
  customPrompts: string[],
  fastingWindow: string | null,
  userProfile: UserProfileLite | null
): Promise<WeekPlan> {
  try {
    // Construir el contexto del usuario con composición corporal
    const bodyComposition = userProfile 
      ? [
          userProfile.body_fat_percentage ? `grasa corporal: ${userProfile.body_fat_percentage}%` : null,
          userProfile.muscle_percentage ? `masa muscular: ${userProfile.muscle_percentage}%` : null
        ].filter(Boolean).join(', ')
      : '';
    
    const userContext = userProfile
      ? `Usuario: ${userProfile.sex === 'male' ? 'Hombre' : 'Mujer'}, ${calculateAge(userProfile.birthdate)} años, ${userProfile.height_cm}cm, ${userProfile.weight_kg}kg${bodyComposition ? `, ${bodyComposition}` : ''}, objetivo: ${userProfile.goal}, nivel de actividad: ${userProfile.activity_level}`
      : 'Usuario sin perfil completo';

    // Construir el prompt con la base de datos de alimentos (solo los primeros 50 para no sobrecargar el prompt)
    const foodListStr = FOOD_DATABASE.slice(0, 50).map(
      (f) => `ID ${f.id}: ${f.name} (${f.calories_per_100g} kcal, P:${f.protein_per_100g}g, C:${f.carbs_per_100g}g, G:${f.fats_per_100g}g por 100g) [${f.tags?.join(', ') || 'sin tags'}]`
    ).join('\n');

    // Calcular calorías por comida
    const caloriesPerMeal = Math.round(targets.calories / mealsPerDay);
    
    const systemPrompt = `Eres un nutricionista experto. Tu tarea es crear un plan de comidas semanal SOLO usando los alimentos de la base de datos proporcionada.

BASE DE DATOS DE ALIMENTOS DISPONIBLES (200 alimentos totales, mostrando los primeros 50):
${foodListStr}

NOTA: Tienes acceso a 200 alimentos diferentes (IDs 1-200). Si necesitas otros alimentos, puedes usar cualquier ID del 1 al 200, pero asegúrate de que sean alimentos reales y apropiados para la categoría.

REGLAS ESTRICTAS:
1. SOLO usa alimentos de la lista anterior (usa el ID del alimento)
       2. NUNCA uses food_id undefined, null, o fuera del rango 1-200
3. NUNCA uses grams undefined, null, o menor a 1
4. Respeta EXACTAMENTE las preferencias y exclusiones del usuario
5. Si el usuario dice "sin pescado" o "evitar pescado", NO incluyas ningún alimento con tag "pescado"
6. Si el usuario dice "sin lácteos", NO incluyas alimentos con tag "lacteo"
7. Si el usuario dice "sin gluten", NO incluyas alimentos con tag "gluten"
8. Si el usuario dice "vegetariano" o "sin carne", NO incluyas alimentos con tag "carne"
9. Crea ${mealsPerDay} comidas por día (${fastingWindow ? `ventana de alimentación: ${fastingWindow}` : 'sin ayuno'})
10. OBJETIVO DIARIO: ${targets.calories} kcal (${targets.protein_g}g proteína, ${targets.carbs_g}g carbos, ${targets.fats_g}g grasas)
11. IMPORTANTE: Cada comida debe tener aproximadamente ${caloriesPerMeal} kcal (${targets.calories} ÷ ${mealsPerDay})
12. Ajusta los gramos de cada ingrediente para alcanzar las calorías objetivo por comida
13. Usa cantidades realistas y generosas (por ejemplo: 200-250g de proteína, 150-200g de carbohidratos, vegetales abundantes)
14. Genera comidas para 7 días (lunes a domingo)
15. Proporciona 2 opciones diferentes para cada comida (para mantener el JSON compacto)
       16. CRÍTICO: Cada item DEBE tener food_id (número 1-200) y grams (número > 0)

${userContext}

Preferencias del usuario:
${customPrompts.length > 0 ? customPrompts.join('\n- ') : 'Sin preferencias especiales'}

EJEMPLO DE COMIDA CON ${caloriesPerMeal} KCAL:
{
  "name": "Pollo con arroz y vegetales",
  "items": [
    {"food_id": 1, "grams": 250},  // Pechuga de pollo: ~412 kcal
    {"food_id": 11, "grams": 200}, // Arroz blanco: ~260 kcal
    {"food_id": 25, "grams": 150}, // Brócoli: ~51 kcal
    {"food_id": 21, "grams": 10}   // Aceite: ~88 kcal
  ]
  // Total aproximado: ~811 kcal
}

FORMATO DE RESPUESTA (JSON):
{
  "monday": {
    "breakfast": [
      {
        "name": "Nombre descriptivo de la comida",
        "items": [{"food_id": 1, "grams": 250}, {"food_id": 13, "grams": 80}, {"food_id": 19, "grams": 100}]
      },
      {...otra opción con ${caloriesPerMeal} kcal...}
    ],
    "lunch": [...2 opciones de ~${caloriesPerMeal} kcal cada una...],
    "dinner": [...2 opciones de ~${caloriesPerMeal} kcal cada una...],
    "snacks": [...3 opciones si mealsPerDay > 3...]
  },
  "tuesday": {...},
  ...
  "sunday": {...}
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo más rápido y económico
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Crea un plan de ${mealsPerDay} comidas diarias para 7 días. CRÍTICO: Cada comida debe tener aproximadamente ${caloriesPerMeal} kcal para alcanzar mi objetivo diario de ${targets.calories} kcal. ${customPrompts.length > 0 ? `Preferencias: ${customPrompts.join(', ')}` : ''}

IMPORTANTE: Responde SOLO con JSON válido. Cada item debe tener food_id (número 1-200) y grams (número > 0). NO uses undefined, null o valores vacíos.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Reducido aún más para respuestas más consistentes
      max_tokens: 8000, // Aumentado para respuestas más completas
    });

    const planText = response.choices[0]?.message?.content;
    if (!planText) {
      console.error('❌ No se recibió respuesta de la IA');
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('📄 Respuesta de IA recibida, parseando...');
    let aiPlan;
    try {
      aiPlan = JSON.parse(planText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON de IA:', parseError);
      console.log('Contenido recibido:', planText.substring(0, 500));
      throw new Error('La respuesta de la IA no tiene formato JSON válido');
    }

    // Validar que tenga al menos un día
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validDays = days.filter(day => aiPlan[day]);
    
    if (validDays.length === 0) {
      console.error('❌ La respuesta de IA no contiene días válidos');
      throw new Error('La respuesta de la IA está incompleta');
    }

    console.log(`✅ ${validDays.length} días válidos encontrados`);

    // Función para limpiar y corregir items de comida
    const cleanMealItems = (items: any[]): any[] => {
      if (!Array.isArray(items)) return [];
      
      return items.map(item => {
        if (!item || typeof item !== 'object') {
          return { food_id: 1, grams: 100 }; // Fallback
        }
        
        // Corregir food_id
        let food_id = item.food_id;
        if (typeof food_id !== 'number' || food_id < 1 || food_id > 200) {
          console.warn(`⚠️ Food ID inválido: ${food_id}, usando fallback`);
          food_id = 1;
        }
        
        // Corregir grams
        let grams = item.grams;
        if (typeof grams !== 'number' || grams <= 0) {
          console.warn(`⚠️ Grams inválido: ${grams}, usando fallback`);
          grams = 100;
        }
        
        return { food_id, grams };
      });
    };

    // Calcular macros para cada comida
    const weekPlan: any = {};

    for (const day of days) {
      if (!aiPlan[day]) {
        console.warn(`⚠️ Día ${day} no encontrado en respuesta de IA`);
        continue;
      }

      const dayPlan: any = {};
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

      for (const mealType of mealTypes) {
        if (aiPlan[day][mealType] && Array.isArray(aiPlan[day][mealType])) {
          dayPlan[mealType] = aiPlan[day][mealType].map((meal: any) => {
            if (!meal || typeof meal !== 'object') {
              console.warn(`⚠️ Comida inválida en ${day}/${mealType}`);
              return null;
            }
            
            // Limpiar y corregir items
            const cleanedItems = cleanMealItems(meal.items || []);
            
            if (cleanedItems.length === 0) {
              console.warn(`⚠️ Comida sin items válidos en ${day}/${mealType}, creando fallback`);
              return {
                name: meal.name || 'Comida de emergencia',
                items: [{ food_id: 1, grams: 150 }], // Pechuga de pollo como fallback
                calories: 247,
                protein_g: 46,
                carbs_g: 0,
                fats_g: 5,
              };
            }
            
            const macros = calculateMealMacros(cleanedItems);
            return {
              name: meal.name || 'Comida sin nombre',
              items: cleanedItems,
              ...macros,
            };
          }).filter(Boolean); // Remover comidas nulas
        }
      }

      weekPlan[day] = dayPlan;
    }

    // Validar que el plan generado tenga datos válidos
    const hasValidData = Object.values(weekPlan).some((day: any) => {
      return Object.values(day).some((meals: any) => {
        return Array.isArray(meals) && meals.length > 0 && meals.some((meal: any) => {
          return meal && meal.items && meal.items.length > 0 && meal.items.some((item: any) => {
            return item && typeof item.food_id === 'number' && item.food_id >= 1 && item.food_id <= 200;
          });
        });
      });
    });

    if (!hasValidData) {
      console.warn('⚠️ Plan generado por IA no tiene datos válidos, usando fallback');
      return generateWeekPlanFallback(targets, mealsPerDay, customPrompts, fastingWindow);
    }

    // Asegurar SIEMPRE 7 días: si la IA omitió fines de semana, completamos copiando patrones
    const orderedDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const presentDays = orderedDays.filter(d => !!weekPlan[d]);
    if (presentDays.length < 7 && presentDays.length > 0) {
      console.warn(`⚠️ IA devolvió ${presentDays.length}/7 días. Completando los faltantes...`);
      orderedDays.forEach((d, idx) => {
        if (!weekPlan[d]) {
          const source = presentDays[idx % presentDays.length];
          // Clonar superficialmente para evitar referencias compartidas
          weekPlan[d] = JSON.parse(JSON.stringify(weekPlan[source]));
        }
      });
    }

    console.log('✅ Plan generado con IA exitosamente');
    return weekPlan as WeekPlan;
  } catch (error: any) {
    // Manejar errores específicos de quota/rate limit de manera más elegante
    const errorMessage = error?.message || error?.toString() || '';
    const isQuotaError = errorMessage.includes('429') || 
                         errorMessage.includes('quota') || 
                         errorMessage.includes('exceeded') ||
                         error?.status === 429;
    
    if (isQuotaError) {
      console.log('⚠️ Cuota de OpenAI agotada, usando generador de respaldo...');
    } else {
      console.error('❌ Error generando plan con IA:', errorMessage.substring(0, 200));
      console.log('🔄 Usando generador de respaldo...');
    }
    
    // Si falla, usar el generador por defecto
    return generateWeekPlanFallback(targets, mealsPerDay, customPrompts, fastingWindow);
  }
}

/**
 * Calcula la edad a partir de la fecha de nacimiento
 */
function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Genera plan semanal de comidas (fallback sin IA)
 */
function generateWeekPlanFallback(
  targets: NutritionTarget,
  mealsPerDay: number,
  customPrompts: string[],
  fastingWindow?: string | null
): WeekPlan {
  const templates = generateMealTemplates(customPrompts, mealsPerDay);

  // Calcular calorías por comida según el número de comidas
  const caloriesPerMeal = Math.round(targets.calories / mealsPerDay);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekPlan: any = {};

  // Determinar si hay ayuno y el horario de comidas
  let skipBreakfast = false;
  if (fastingWindow) {
    const [start, end] = fastingWindow.split('-').map(Number);
    // Si la ventana de alimentación empieza después de las 12:00, no hay desayuno
    if (start >= 12) {
      skipBreakfast = true;
    }
  }

  days.forEach((day, index) => {
    const dayPlan: DayPlan = {
      breakfast: undefined,
      lunch: undefined,
      dinner: undefined,
      snacks: undefined,
    };

    // Asignar comidas según mealsPerDay y ventana de ayuno
    // Cada comida tendrá 3 alternativas
    if (mealsPerDay === 1) {
      // Solo una comida principal
      if (skipBreakfast) {
        const dinnerOptions = [
          templates.dinner[index % templates.dinner.length],
          templates.dinner[(index + 1) % templates.dinner.length],
          templates.dinner[(index + 2) % templates.dinner.length],
        ];
        dayPlan.dinner = scaleMealPortions(dinnerOptions, caloriesPerMeal);
      } else {
        const lunchOptions = [
          templates.lunch[index % templates.lunch.length],
          templates.lunch[(index + 1) % templates.lunch.length],
          templates.lunch[(index + 2) % templates.lunch.length],
        ];
        dayPlan.lunch = scaleMealPortions(lunchOptions, caloriesPerMeal);
      }
    } else if (mealsPerDay === 2) {
      if (skipBreakfast) {
        // Almuerzo tardío y cena (dividir calorías 50/50)
        const lunchOptions = [
          templates.lunch[index % templates.lunch.length],
          templates.lunch[(index + 1) % templates.lunch.length],
          templates.lunch[(index + 2) % templates.lunch.length],
        ];
        const dinnerOptions = [
          templates.dinner[(index + 1) % templates.dinner.length],
          templates.dinner[(index + 2) % templates.dinner.length],
          templates.dinner[(index + 3) % templates.dinner.length],
        ];
        dayPlan.lunch = scaleMealPortions(lunchOptions, caloriesPerMeal);
        dayPlan.dinner = scaleMealPortions(dinnerOptions, caloriesPerMeal);
      } else {
        // Desayuno y almuerzo (dividir calorías 50/50)
        const breakfastOptions = [
          templates.breakfast[index % templates.breakfast.length],
          templates.breakfast[(index + 1) % templates.breakfast.length],
          templates.breakfast[(index + 2) % templates.breakfast.length],
        ];
        const lunchOptions = [
          templates.lunch[index % templates.lunch.length],
          templates.lunch[(index + 1) % templates.lunch.length],
          templates.lunch[(index + 2) % templates.lunch.length],
        ];
        dayPlan.breakfast = scaleMealPortions(breakfastOptions, caloriesPerMeal);
        dayPlan.lunch = scaleMealPortions(lunchOptions, caloriesPerMeal);
      }
    } else if (mealsPerDay === 3) {
      // Dividir: 30% desayuno/almuerzo, 20% snack, 50% cena/almuerzo
      const mainMealCals = Math.round(caloriesPerMeal * 1.2);
      const snackCals = Math.round(caloriesPerMeal * 0.6);
      
      if (skipBreakfast) {
        const lunchOptions = [
          templates.lunch[index % templates.lunch.length],
          templates.lunch[(index + 1) % templates.lunch.length],
          templates.lunch[(index + 2) % templates.lunch.length],
        ];
        const snackOptions = [
          templates.snacks[index % templates.snacks.length],
          templates.snacks[(index + 1) % templates.snacks.length],
          templates.snacks[(index + 2) % templates.snacks.length],
        ];
        const dinnerOptions = [
          templates.dinner[(index + 1) % templates.dinner.length],
          templates.dinner[(index + 2) % templates.dinner.length],
          templates.dinner[(index + 3) % templates.dinner.length],
        ];
        dayPlan.lunch = scaleMealPortions(lunchOptions, mainMealCals);
        dayPlan.snacks = scaleMealPortions(snackOptions, snackCals);
        dayPlan.dinner = scaleMealPortions(dinnerOptions, mainMealCals);
      } else {
        const breakfastOptions = [
          templates.breakfast[index % templates.breakfast.length],
          templates.breakfast[(index + 1) % templates.breakfast.length],
          templates.breakfast[(index + 2) % templates.breakfast.length],
        ];
        const lunchOptions = [
          templates.lunch[index % templates.lunch.length],
          templates.lunch[(index + 1) % templates.lunch.length],
          templates.lunch[(index + 2) % templates.lunch.length],
        ];
        const dinnerOptions = [
          templates.dinner[(index + 1) % templates.dinner.length],
          templates.dinner[(index + 2) % templates.dinner.length],
          templates.dinner[(index + 3) % templates.dinner.length],
        ];
        dayPlan.breakfast = scaleMealPortions(breakfastOptions, caloriesPerMeal);
        dayPlan.lunch = scaleMealPortions(lunchOptions, caloriesPerMeal);
        dayPlan.dinner = scaleMealPortions(dinnerOptions, caloriesPerMeal);
      }
    } else {
      // Para 4+ comidas, distribuir equitativamente
      const breakfastOptions = [
        templates.breakfast[index % templates.breakfast.length],
        templates.breakfast[(index + 1) % templates.breakfast.length],
        templates.breakfast[(index + 2) % templates.breakfast.length],
      ];
      const lunchOptions = [
        templates.lunch[index % templates.lunch.length],
        templates.lunch[(index + 1) % templates.lunch.length],
        templates.lunch[(index + 2) % templates.lunch.length],
      ];
      const dinnerOptions = [
        templates.dinner[(index + 1) % templates.dinner.length],
        templates.dinner[(index + 2) % templates.dinner.length],
        templates.dinner[(index + 3) % templates.dinner.length],
      ];
      const snackOptions = [
        templates.snacks[index % templates.snacks.length],
        templates.snacks[(index + 1) % templates.snacks.length],
        templates.snacks[(index + 2) % templates.snacks.length],
      ];
      
      if (!skipBreakfast) {
        dayPlan.breakfast = scaleMealPortions(breakfastOptions, caloriesPerMeal);
      }
      dayPlan.lunch = scaleMealPortions(lunchOptions, caloriesPerMeal);
      dayPlan.dinner = scaleMealPortions(dinnerOptions, caloriesPerMeal);
      
      if (mealsPerDay >= 4) {
        const snackCals = Math.round(caloriesPerMeal * 0.8);
        dayPlan.snacks = scaleMealPortions(snackOptions, snackCals);
      }
    }

    weekPlan[day] = dayPlan;
  });

  return weekPlan as WeekPlan;
}

/**
 * Construye lista de compras desde plan semanal
 */
export function buildGroceryList(weekPlan: WeekPlan): GroceryItem[] {
  const foodMap = new Map<string, number>(); // food_name -> total grams

  Object.values(weekPlan).forEach((day) => {
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((mealType) => {
      const meals = day[mealType as keyof DayPlan];
      if (meals) {
        meals.forEach((meal) => {
          meal.items.forEach((item) => {
            // Buscar el alimento en la base de datos
            const food = FOOD_DATABASE.find((f) => f.id === item.food_id);
            const foodName = food ? food.name : `Alimento ${item.food_id}`;
            
            const current = foodMap.get(foodName) || 0;
            foodMap.set(foodName, current + item.grams);
          });
        });
      }
    });
  });

  const groceryList: GroceryItem[] = [];
  let idCounter = 1;
  
  foodMap.forEach((grams, food_name) => {
    // Buscar food_id en la base de datos, si no existe usar un ID temporal
    const food = FOOD_DATABASE.find((f) => f.name === food_name);
    const food_id = food ? food.id : idCounter++;
    
    groceryList.push({
      food_id,
      food_name,
      grams: Math.round(grams),
      checked: false,
    });
  });

  return groceryList.sort((a, b) => a.food_name.localeCompare(b.food_name));
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

export async function upsertNutritionProfile(
  userId: string,
  profile: Partial<NutritionProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('nutrition_profiles').upsert(
      {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error upserting nutrition profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in upsertNutritionProfile:', err);
    return { success: false, error: err.message };
  }
}

export async function getNutritionProfile(userId: string): Promise<NutritionProfile | null> {
  try {
    const { data, error } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as NutritionProfile;
  } catch (err) {
    console.error('Error in getNutritionProfile:', err);
    return null;
  }
}

// Cache para evitar recálculos innecesarios
const profileCache = new Map<string, any>();
const targetCache = new Map<string, NutritionTarget>();

// Función para limpiar caché cuando sea necesario
export function clearNutritionCache(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
    // Limpiar targets del usuario específico
    for (const [key, value] of targetCache.entries()) {
      if (key.startsWith(`${userId}-`)) {
        targetCache.delete(key);
      }
    }
  } else {
    profileCache.clear();
    targetCache.clear();
  }
  console.log('🧹 Caché de nutrición limpiado');
}

export async function computeAndSaveTargets(
  userId: string,
  date: string
): Promise<{ success: boolean; target?: NutritionTarget; error?: string }> {
  try {
    // Verificar si ya existe un target para esta fecha
    const cacheKey = `${userId}-${date}`;
    if (targetCache.has(cacheKey)) {
      console.log('📋 Target encontrado en caché para:', date);
      return { success: true, target: targetCache.get(cacheKey) };
    }

    // Verificar si el perfil está en caché
    let profile = profileCache.get(userId);
    if (!profile) {
      console.log('📋 Obteniendo perfil de onboarding...');
      profile = await getOnboardingProfileLite(userId);
    if (!profile) {
      console.error('❌ No se encontró perfil de onboarding');
      return { success: false, error: 'No se encontró perfil de onboarding' };
      }
      profileCache.set(userId, profile);
    }

    // Calcular edad una sola vez
    const birthYear = parseInt(profile.birthdate.split('-')[0]);
    const age = new Date().getFullYear() - birthYear;

    // Calcular BMR y TDEE una sola vez
    const bmr = calculateBMR(profile.sex, profile.weight_kg, profile.height_cm, age);
    const tdee = calculateTDEE(bmr, profile.activity_level);

    // Calcular calorías objetivo
    const targetCalories = calculateTargetCalories(tdee, profile.goal);

    // Calcular macros
    const macros = calculateMacros(targetCalories, profile.weight_kg, profile.goal);

    const target: NutritionTarget = {
      date,
      calories: targetCalories,
      ...macros,
    };

    // Guardar en caché
    targetCache.set(cacheKey, target);

    // Guardar en Supabase
    const { error } = await supabase.from('nutrition_targets').upsert(
      {
        user_id: userId,
        ...target,
      },
      { onConflict: 'user_id,date' }
    );

    if (error) {
      console.error('Error saving nutrition targets:', error);
      return { success: false, error: error.message };
    }

    return { success: true, target };
  } catch (err: any) {
    console.error('Error in computeAndSaveTargets:', err);
    return { success: false, error: err.message };
  }
}

export async function createOrUpdateMealPlan(
  userId: string,
  weekStart: string
): Promise<{ success: boolean; weekPlan?: WeekPlan; error?: string }> {
  try {
    console.log('🤖 Generando plan de comidas con IA...');
    
    // Obtener perfil nutricional
    const nutritionProfile = await getNutritionProfile(userId);
    if (!nutritionProfile) {
      return { success: false, error: 'No se encontró perfil nutricional' };
    }

    // Obtener targets del primer día de la semana
    const { data: targetData, error: targetError } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .eq('date', weekStart)
      .single();

    if (targetError || !targetData) {
      return { success: false, error: 'No se encontraron targets para esta semana' };
    }

    const target = targetData as NutritionTarget;

    // Obtener perfil del usuario para el contexto de IA (usar caché si está disponible)
    let userProfile = profileCache.get(userId);
    if (!userProfile) {
      userProfile = await getOnboardingProfileLite(userId);
      if (userProfile) {
        profileCache.set(userId, userProfile);
      }
    }

    // Generar plan semanal usando IA
    console.log('📄 Respuesta de IA recibida, parseando...');
    const weekPlan = await generateAIMealPlan(
      target,
      nutritionProfile.meals_per_day,
      nutritionProfile.custom_prompts || [],
      nutritionProfile.fasting_window,
      userProfile
    );

    console.log('✅ 7 días válidos encontrados');
    console.log('✅ Plan generado con IA exitosamente');

    // Guardar en Supabase
    const { error } = await supabase.from('meal_plans').upsert(
      {
        user_id: userId,
        week_start: weekStart,
        plan_json: weekPlan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    );

    if (error) {
      console.error('Error saving meal plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true, weekPlan };
  } catch (err: any) {
    console.error('Error in createOrUpdateMealPlan:', err);
    return { success: false, error: err.message };
  }
}

export async function getMealPlan(userId: string, weekStart: string): Promise<WeekPlan | null> {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('plan_json')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single();

    if (error || !data) {
      return null;
    }

    return data.plan_json as WeekPlan;
  } catch (err) {
    console.error('Error in getMealPlan:', err);
    return null;
  }
}

// ============================================================================
// CALCULAR MACROS CON IA
// ============================================================================

export async function calculateFoodMacros(
  foodName: string,
  weightGrams: number
): Promise<{
  success: boolean;
  data?: { calories: number; protein_g: number; carbs_g: number; fats_g: number };
  error?: string;
}> {
  try {
    console.log(`🤖 Calculando macros para: ${foodName} (${weightGrams}g)`);

    const systemPrompt = `Eres un nutricionista experto con acceso a bases de datos nutricionales (USDA, BEDCA). Tu trabajo es calcular las calorías y macronutrientes de alimentos basándote en valores REALES por 100g.

VALORES DE REFERENCIA POR 100g COCIDO:
- Pechuga de pollo: 165 kcal, 31g proteína, 0g carbos, 3.6g grasa
- Arroz blanco: 130 kcal, 2.7g proteína, 28g carbos, 0.3g grasa
- Huevo: 155 kcal, 13g proteína, 1.1g carbos, 11g grasa
- Salmón: 206 kcal, 22g proteína, 0g carbos, 12g grasa
- Avena cruda: 389 kcal, 17g proteína, 66g carbos, 7g grasa

REGLAS ESTRICTAS:
1. Responde SOLO con un objeto JSON válido: {"calories": número, "protein_g": número, "carbs_g": número, "fats_g": número}
2. Todos los valores deben ser números enteros
3. Calcula proporcionalmente basándote en el peso dado
4. COCIDO a menos que se especifique "crudo"
5. NUNCA exageres los valores - sé conservador y realista
6. La proteína NUNCA debe exceder el 50% del peso total del alimento (físicamente imposible)`;

    const userPrompt = `Calcula para:
Alimento: ${foodName}
Peso: ${weightGrams}g

Pasos:
1. Identifica el alimento
2. Determina valores por 100g
3. Calcula: (valor_por_100g × ${weightGrams}) ÷ 100
4. Valida: proteína_g debe ser < ${weightGrams * 0.5}g (máximo 50% del peso)

Responde SOLO el JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const aiResponse = completion.choices[0].message.content?.trim() || '';
    console.log('🤖 Respuesta IA:', aiResponse);

    // Parsear JSON
    let macros;
    try {
      macros = JSON.parse(aiResponse);
    } catch (parseError) {
      // Intentar extraer JSON si hay texto extra
      const jsonMatch = aiResponse.match(/\{[^}]+\}/);
      if (jsonMatch) {
        macros = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo parsear la respuesta de la IA');
      }
    }

    // Validar estructura
    if (
      typeof macros.calories !== 'number' ||
      typeof macros.protein_g !== 'number' ||
      typeof macros.carbs_g !== 'number' ||
      typeof macros.fats_g !== 'number'
    ) {
      throw new Error('Respuesta inválida de la IA');
    }

    // Validación de valores realistas
    const maxProteinPercentage = 0.5; // Máximo 50% del peso puede ser proteína
    const maxCaloriesPerGram = 9; // Grasa pura tiene 9 kcal/g, máximo teórico
    
    if (macros.protein_g > weightGrams * maxProteinPercentage) {
      console.warn(`⚠️ Proteína muy alta (${macros.protein_g}g para ${weightGrams}g), ajustando...`);
      macros.protein_g = Math.round(weightGrams * 0.31); // Asumiendo pollo (31% proteína)
    }

    if (macros.calories > weightGrams * maxCaloriesPerGram) {
      console.warn(`⚠️ Calorías muy altas (${macros.calories} kcal para ${weightGrams}g), ajustando...`);
      macros.calories = Math.round(weightGrams * 1.65); // Asumiendo alimento proteico promedio
    }

    // Validar que las calorías calculadas desde macros sean coherentes
    const calculatedCalories = (macros.protein_g * 4) + (macros.carbs_g * 4) + (macros.fats_g * 9);
    const diff = Math.abs(macros.calories - calculatedCalories);
    
    if (diff > macros.calories * 0.15) { // Si la diferencia es mayor al 15%
      console.warn(`⚠️ Incoherencia en calorías (declaradas: ${macros.calories}, calculadas: ${calculatedCalories}), ajustando...`);
      macros.calories = Math.round(calculatedCalories);
    }

    console.log('✅ Macros calculados y validados:', macros);
    return { success: true, data: macros };
  } catch (err: any) {
    console.error('❌ Error calculando macros:', err);
    return { success: false, error: err.message || 'Error desconocido' };
  }
}

export async function logMeal(
  userId: string,
  mealType: string,
  itemJson: any,
  macros: { calories: number; protein_g: number; carbs_g: number; fats_g: number },
  photoUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('meal_logs').insert({
      user_id: userId,
      datetime: new Date().toISOString(),
      meal_type: mealType,
      item_json: itemJson,
      ...macros,
      photo_url: photoUrl,
    });

    if (error) {
      console.error('Error logging meal:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in logMeal:', err);
    return { success: false, error: err.message };
  }
}

export async function logWater(
  userId: string,
  date: string,
  waterMl: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('hydration_logs').upsert(
      {
        user_id: userId,
        date,
        water_ml: waterMl,
      },
      { onConflict: 'user_id,date' }
    );

    if (error) {
      console.error('Error logging water:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in logWater:', err);
    return { success: false, error: err.message };
  }
}

export async function applyWeeklyAdjustment(
  userId: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  adjustment?: {
    calories: number;
    caloriesChange: number;
    explanation: string;
    educationalMessage: string;
  }
}> {
  try {
    // Obtener peso de última semana vs semana anterior
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { data: recentWeights } = await supabase
      .from('body_metrics')
      .select('weight_kg, body_fat_percentage, muscle_percentage, date')
      .eq('user_id', userId)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!recentWeights || recentWeights.length < 2) {
      return { success: false, error: 'No hay suficientes datos de peso' };
    }

    // Calcular promedio de cada semana
    const lastWeekWeights = recentWeights.filter(
      (w) => new Date(w.date) >= lastWeek
    );
    const prevWeekWeights = recentWeights.filter(
      (w) => new Date(w.date) >= twoWeeksAgo && new Date(w.date) < lastWeek
    );

    const avgLastWeek =
      lastWeekWeights.reduce((sum, w) => sum + parseFloat(w.weight_kg.toString()), 0) /
      lastWeekWeights.length;
    const avgPrevWeek =
      prevWeekWeights.reduce((sum, w) => sum + parseFloat(w.weight_kg.toString()), 0) /
      prevWeekWeights.length;

    const avgWeightChange = avgLastWeek - avgPrevWeek;

    // Calcular cambios en composición corporal si hay datos
    const avgBodyFatLastWeek = lastWeekWeights.filter(w => w.body_fat_percentage).length > 0
      ? lastWeekWeights
          .filter(w => w.body_fat_percentage)
          .reduce((sum, w) => sum + parseFloat(w.body_fat_percentage!.toString()), 0) / 
          lastWeekWeights.filter(w => w.body_fat_percentage).length
      : null;
    
    const avgBodyFatPrevWeek = prevWeekWeights.filter(w => w.body_fat_percentage).length > 0
      ? prevWeekWeights
          .filter(w => w.body_fat_percentage)
          .reduce((sum, w) => sum + parseFloat(w.body_fat_percentage!.toString()), 0) / 
          prevWeekWeights.filter(w => w.body_fat_percentage).length
      : null;

    const avgMuscleLastWeek = lastWeekWeights.filter(w => w.muscle_percentage).length > 0
      ? lastWeekWeights
          .filter(w => w.muscle_percentage)
          .reduce((sum, w) => sum + parseFloat(w.muscle_percentage!.toString()), 0) / 
          lastWeekWeights.filter(w => w.muscle_percentage).length
      : null;

    const avgMusclePrevWeek = prevWeekWeights.filter(w => w.muscle_percentage).length > 0
      ? prevWeekWeights
          .filter(w => w.muscle_percentage)
          .reduce((sum, w) => sum + parseFloat(w.muscle_percentage!.toString()), 0) / 
          prevWeekWeights.filter(w => w.muscle_percentage).length
      : null;

    const bodyFatChange = avgBodyFatLastWeek && avgBodyFatPrevWeek 
      ? avgBodyFatLastWeek - avgBodyFatPrevWeek 
      : null;
    const muscleChange = avgMuscleLastWeek && avgMusclePrevWeek 
      ? avgMuscleLastWeek - avgMusclePrevWeek 
      : null;

    // Calcular adherencia (% de comidas logueadas vs esperadas)
    const { data: mealLogs } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('datetime', lastWeek.toISOString());

    const nutritionProfile = await getNutritionProfile(userId);
    const expectedMeals = (nutritionProfile?.meals_per_day || 3) * 7;
    const loggedMeals = mealLogs?.length || 0;
    const adherence = Math.min(100, (loggedMeals / expectedMeals) * 100);

    // Obtener perfil y objetivo
    const profile = await getOnboardingProfileLite(userId);
    if (!profile) {
      return { success: false, error: 'No se encontró perfil' };
    }

    // Obtener calorías actuales
    const { data: currentTarget } = await supabase
      .from('nutrition_targets')
      .select('calories')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const currentCalories = currentTarget?.calories || 2000;

    // Calcular nuevo target
    const newCalories = calculateWeeklyAdjustment(
      currentCalories,
      avgWeightChange,
      adherence,
      profile.goal
    );

    // Generar explicación educativa
    const { explanation, educationalMessage } = generateEducationalExplanation(
      profile.goal,
      avgWeightChange,
      bodyFatChange,
      muscleChange,
      currentCalories,
      newCalories,
      adherence
    );

    // Si hay cambio, actualizar targets de próxima semana
    if (newCalories !== currentCalories) {
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7));

      for (let i = 0; i < 7; i++) {
        const date = new Date(nextMonday);
        date.setDate(nextMonday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const macros = calculateMacros(newCalories, profile.weight_kg, profile.goal);

        await supabase.from('nutrition_targets').upsert(
          {
            user_id: userId,
            date: dateStr,
            calories: newCalories,
            ...macros,
          },
          { onConflict: 'user_id,date' }
        );
      }

      // Retornar información del ajuste
      return { 
        success: true,
        adjustment: {
          calories: newCalories,
          caloriesChange: newCalories - currentCalories,
          explanation,
          educationalMessage
        }
      };
    }

    // Si no hay cambio, también retornar información
    return { 
      success: true,
      adjustment: {
        calories: currentCalories,
        caloriesChange: 0,
        explanation,
        educationalMessage
      }
    };
  } catch (err: any) {
    console.error('Error in applyWeeklyAdjustment:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// HISTORIAL SEMANAL
// ============================================================================

export interface WeekSummary {
  weekStart: string; // Lunes de la semana
  weekEnd: string; // Domingo de la semana
  adherence: number; // Porcentaje de adherencia (0-100)
  avgCalories: number; // Promedio de calorías consumidas
  avgProtein: number; // Promedio de proteína consumida
  avgCarbs: number; // Promedio de carbohidratos consumidos
  avgFats: number; // Promedio de grasas consumidas
  targetCalories: number; // Calorías objetivo promedio
  loggedMeals: number; // Número de comidas registradas
  expectedMeals: number; // Número de comidas esperadas
  daysLogged: number; // Días con al menos una comida registrada
}

/**
 * Obtiene el lunes de la semana para una fecha dada
 */
export function getWeekStart(date: Date): Date {
  // Asegurar que trabajamos con la fecha local (no UTC)
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = localDate.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para lunes
  const monday = new Date(localDate);
  monday.setDate(localDate.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Obtiene el domingo de la semana para una fecha dada
 */
function getWeekEnd(date: Date): Date {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Obtiene el resumen de una semana específica
 */
export async function getWeekSummary(
  userId: string,
  weekStart: string
): Promise<WeekSummary | null> {
  try {
    // Parsear la fecha del lunes asegurando que se interprete como fecha local
    // Usar formato YYYY-MM-DD y agregar hora para evitar problemas de UTC
    const [year, month, day] = weekStart.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    
    // Calcular el domingo directamente sumando 6 días al lunes
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    // Obtener logs de comidas de la semana
    const { data: mealLogs } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('datetime', `${weekStart}T00:00:00`)
      .lte('datetime', `${endDateStr}T23:59:59`)
      .order('datetime', { ascending: true });

    // Obtener targets de la semana
    const { data: targets } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    // Calcular promedios de consumo
    const totalConsumed = mealLogs?.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein_g: acc.protein_g + log.protein_g,
        carbs_g: acc.carbs_g + log.carbs_g,
        fats_g: acc.fats_g + log.fats_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    ) || { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };

    // Calcular días con logs únicos
    const daysWithLogs = new Set<string>();
    mealLogs?.forEach(log => {
      const date = new Date(log.datetime).toISOString().split('T')[0];
      daysWithLogs.add(date);
    });

    // Calcular promedio de targets
    const avgTarget = targets?.reduce(
      (acc, target) => ({
        calories: acc.calories + target.calories,
      }),
      { calories: 0 }
    ) || { calories: 0 };
    const avgTargetCalories = targets?.length > 0 ? avgTarget.calories / targets.length : 0;

    // Obtener perfil nutricional para calcular comidas esperadas
    const nutritionProfile = await getNutritionProfile(userId);
    const mealsPerDay = nutritionProfile?.meals_per_day || 3;
    const expectedMeals = 7 * mealsPerDay;

    // Calcular adherencia
    const loggedMeals = mealLogs?.length || 0;
    const adherence = Math.min(100, Math.round((loggedMeals / expectedMeals) * 100));

    // Calcular promedios diarios
    const daysCount = daysWithLogs.size || 1; // Evitar división por cero
    const avgCalories = daysCount > 0 ? totalConsumed.calories / daysCount : 0;
    const avgProtein = daysCount > 0 ? totalConsumed.protein_g / daysCount : 0;
    const avgCarbs = daysCount > 0 ? totalConsumed.carbs_g / daysCount : 0;
    const avgFats = daysCount > 0 ? totalConsumed.fats_g / daysCount : 0;

    return {
      weekStart,
      weekEnd: endDateStr,
      adherence,
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(avgProtein),
      avgCarbs: Math.round(avgCarbs),
      avgFats: Math.round(avgFats),
      targetCalories: Math.round(avgTargetCalories),
      loggedMeals,
      expectedMeals,
      daysLogged: daysWithLogs.size,
    };
  } catch (error) {
    console.error('Error getting week summary:', error);
    return null;
  }
}

/**
 * Obtiene el historial de semanas (hasta N semanas atrás)
 */
export async function getWeeklyHistory(
  userId: string,
  weeks: number = 8
): Promise<WeekSummary[]> {
  try {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    const history: WeekSummary[] = [];

    // Obtener resumen de semanas pasadas
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() - (i * 7));
      // Formatear como YYYY-MM-DD usando fecha local para evitar problemas de UTC
      const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

      const summary = await getWeekSummary(userId, weekStartStr);
      if (summary) {
        history.push(summary);
      }
    }

    return history;
  } catch (error) {
    console.error('Error getting weekly history:', error);
    return [];
  }
}

/**
 * Obtiene la fecha de inicio de la semana siguiente
 */
export function getNextWeekStart(): Date {
  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(currentWeekStart.getDate() + 7);
  return nextWeekStart;
}

