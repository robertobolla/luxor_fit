// ============================================================================
// NUTRITION MODULE TYPES
// ============================================================================

export type Activity = 'sedentary' | 'light' | 'moderate' | 'high';
export type Goal = 'cut' | 'recomp' | 'maintain' | 'bulk';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionTarget {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface MealItem {
  food_id: number;
  grams: number;
}

export interface MealOption {
  name: string;
  items: MealItem[];
  alts?: string[]; // IDs de opciones alternativas
  tags?: string[]; // ej: 'rapido', 'budget', 'pescado'
  prep_time_min?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface DayPlan {
  breakfast: MealOption[];
  lunch: MealOption[];
  dinner: MealOption[];
  snacks?: MealOption[];
}

export interface WeekPlan {
  monday: DayPlan;
  tuesday: DayPlan;
  wednesday: DayPlan;
  thursday: DayPlan;
  friday: DayPlan;
  saturday: DayPlan;
  sunday: DayPlan;
}

export interface UserProfileLite {
  sex: 'male' | 'female';
  birthdate: string;
  height_cm: number;
  weight_kg: number;
  body_fat_percentage?: number | null;
  muscle_percentage?: number | null;
  activity_level: Activity;
  goal: Goal;
}

export interface NutritionProfile {
  user_id: string;
  meals_per_day: number;
  fasting_window: string | null;
  custom_prompts: string[];
  updated_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  datetime: string;
  meal_type: MealType;
  item_json: any;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  photo_url?: string;
}

export interface HydrationLog {
  id: string;
  user_id: string;
  date: string;
  water_ml: number;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  waist_cm?: number;
  hips_cm?: number;
  notes?: string;
}

export interface Lesson {
  id: number;
  slug: string;
  title: string;
  content_md: string;
  quiz_json?: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

export interface LessonProgress {
  user_id: string;
  lesson_id: number;
  completed_at?: string;
  score?: number;
}

export interface GroceryItem {
  food_id: number;
  food_name: string;
  grams: number;
  checked: boolean;
}

// Base de datos de alimentos (embebida)
export interface FoodItem {
  id: number;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy';
  tags?: string[]; // 'rapido', 'budget', 'pescado', etc.
}

