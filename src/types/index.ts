// Tipos de usuario
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email?: string | null; // email del usuario (respaldo de Clerk)
  username?: string | null; // nombre de usuario único para red social
  name: string;
  age: number;
  gender: Gender; // género del usuario
  height: number; // en cm
  weight: number; // en kg
  body_fat_percentage?: number | null; // porcentaje de grasa corporal (opcional)
  muscle_percentage?: number | null; // porcentaje de masa muscular (opcional)
  fitness_level: FitnessLevel;
  goals: FitnessGoal[];
  available_days: number; // días por semana
  session_duration: number; // minutos por sesión
  activity_types: ActivityType[]; // tipos de actividad preferida
  equipment: Equipment[];
  created_at: string;
  updated_at: string;
}

// Enums
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum FitnessLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum FitnessGoal {
  WEIGHT_LOSS = 'weight_loss',
  MUSCLE_GAIN = 'muscle_gain',
  STRENGTH = 'strength',
  ENDURANCE = 'endurance',
  FLEXIBILITY = 'flexibility',
  GENERAL_FITNESS = 'general_fitness'
}

export enum ActivityType {
  CARDIO = 'cardio',
  STRENGTH = 'strength',
  SPORTS = 'sports',
  YOGA = 'yoga',
  HIIT = 'hiit',
  MIXED = 'mixed'
}

export enum Equipment {
  NONE = 'none',
  DUMBBELLS = 'dumbbells',
  BARBELL = 'barbell',
  RESISTANCE_BANDS = 'resistance_bands',
  PULL_UP_BAR = 'pull_up_bar',
  BENCH = 'bench',
  BENCH_DUMBBELLS = 'bench_dumbbells',
  BENCH_BARBELL = 'bench_barbell',
  GYM_ACCESS = 'gym_access',
  KETTLEBELL = 'kettlebell',
  CABLE_MACHINE = 'cable_machine',
  SMITH_MACHINE = 'smith_machine',
  LEG_PRESS = 'leg_press',
  MEDICINE_BALL = 'medicine_ball',
  YOGA_MAT = 'yoga_mat'
}

// Tipos de ejercicio
export interface Exercise {
  id: string;
  name: string;
  description: string;
  muscle_groups: MuscleGroup[];
  equipment_required: Equipment[];
  instructions: string[];
  video_url?: string;
  image_url?: string;
}

export enum MuscleGroup {
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  ABS = 'abs',
  OBLIQUES = 'obliques',
  QUADS = 'quads',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves'
}

// Tipos de entrenamiento
export interface Workout {
  is_active?: boolean | null;

  id: string;
  user_id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  workout_exercises?: WorkoutExercise[]; // Alias usado en consultas de Supabase
  duration_minutes: number;
  difficulty: number; // 1-10
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise: Exercise;
  sets: number;
  reps: number | string; // puede ser "30s" para tiempo
  weight?: number; // en kg
  rest_seconds: number;
  order: number;
}

// Tipos de sesión de entrenamiento
export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string;
  workout: Workout;
  started_at: string;
  completed_at?: string;
  exercises_completed: ExerciseSession[];
  total_duration_minutes?: number;
  notes?: string;
  rpe?: number; // Rate of Perceived Exertion 1-10
}

export interface ExerciseSession {
  id: string;
  exercise_id: string;
  exercise: Exercise;
  sets_completed: SetSession[];
  notes?: string;
}

export interface SetSession {
  id: string;
  reps_completed: number;
  weight_used?: number;
  duration_seconds?: number;
  rpe?: number;
  rest_taken_seconds?: number;
}

// Tipos de progreso
export interface ProgressData {
  user_id: string;
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  measurements?: BodyMeasurements;
  notes?: string;
}

export interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}

// Tipos de IA/Adaptación
export interface AIRecommendation {
  id: string;
  user_id: string;
  type: RecommendationType;
  exercise_id?: string;
  workout_id?: string;
  current_value: number;
  recommended_value: number;
  reason: string;
  confidence: number; // 0-1
  created_at: string;
}

export enum RecommendationType {
  INCREASE_WEIGHT = 'increase_weight',
  DECREASE_WEIGHT = 'decrease_weight',
  INCREASE_REPS = 'increase_reps',
  DECREASE_REPS = 'decrease_reps',
  INCREASE_SETS = 'increase_sets',
  DECREASE_SETS = 'decrease_sets',
  ADD_EXERCISE = 'add_exercise',
  REMOVE_EXERCISE = 'remove_exercise'
}

// Tipos de notificaciones
export interface NotificationData {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduled_for: string;
  sent_at?: string;
  read_at?: string;
}

export enum NotificationType {
  WORKOUT_REMINDER = 'workout_reminder',
  PROGRESS_UPDATE = 'progress_update',
  ACHIEVEMENT = 'achievement',
  MOTIVATION = 'motivation'
}

// Tipos de completamiento de entrenamiento
export interface WorkoutCompletion {
  id: string;
  user_id: string;
  workout_plan_id: string;
  day_name: string;
  completed_at: string;
  notes?: string;
  exercises_completed?: ExerciseCompletion[];
  duration_minutes?: number;
  difficulty_rating?: number; // 1-5
  created_at: string;
}

export interface ExerciseCompletion {
  name: string;
  sets: number;
  reps: string | number;
  rest?: string;
  completed: boolean;
  notes?: string;
}
