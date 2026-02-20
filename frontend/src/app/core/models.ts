export type UserRole = 'MANAGER' | 'USER';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  message: string;
  id: number;
  email: string;
  name: string;
  token: string;
}

export interface ApiMessage {
  message: string;
}

export interface ManagerClient {
  id: number;
  email: string;
  name: string;
  workouts_count: number;
  last_activity: string | null;
}

export interface Workout {
  id: number;
  name: string;
  name_user?: string;
  exercises_count?: number;
}

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  rir: number | null;
  rm_percent: number | null;
  order_index: number;
  workout_id: number;
}

export interface MovementSuggestion {
  id: number;
  name: string;
}

export interface ExerciseLog {
  id: number;
  weight: number;
  reps: number;
  date: string;
}

export interface DashboardExercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  rir: number | null;
  rm_percent: number | null;
  order_index: number;
  last_log: ExerciseLog | null;
}

export interface DashboardWorkout {
  id: number;
  name: string;
  exercises: DashboardExercise[];
}
