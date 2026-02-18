import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Exercise, ManagerClient, Workout } from '../models';

@Injectable({ providedIn: 'root' })
export class ManagerService {
  constructor(private readonly http: HttpClient) {}

  getClients(): Observable<ManagerClient[]> {
    return this.http.get<{ data: ManagerClient[] }>('/users/manager/clients').pipe(
      map((response) => response.data ?? [])
    );
  }

  createClient(payload: { email: string; password: string; name: string }) {
    return this.http.post('/users', payload);
  }

  updateClient(userId: number, payload: { name?: string; email?: string; password?: string }) {
    return this.http.put(`/users/${userId}`, payload);
  }

  deleteClient(userId: number) {
    return this.http.delete(`/users/${userId}`);
  }

  getUserWorkouts(userId: number): Observable<Workout[]> {
    return this.http.get<{ data: Workout[] }>(`/workouts/user/${userId}`).pipe(
      map((response) => response.data ?? [])
    );
  }

  createWorkout(payload: { name: string; userId: number }) {
    return this.http.post('/workouts', payload);
  }

  updateWorkout(workoutId: number, payload: { name: string }) {
    return this.http.put(`/workouts/${workoutId}`, payload);
  }

  deleteWorkout(workoutId: number) {
    return this.http.delete(`/workouts/${workoutId}`);
  }

  getExercises(workoutId: number): Observable<Exercise[]> {
    return this.http.get<{ data: Exercise[] }>(`/exercises/${workoutId}`).pipe(
      map((response) => response.data ?? [])
    );
  }

  createExercise(payload: {
    name: string;
    sets: number;
    reps: number;
    rir?: number | null;
    rm_percent?: number | null;
    order_index: number;
    workoutId: number;
  }) {
    return this.http.post('/exercises', payload);
  }

  updateExercise(
    exerciseId: number,
    payload: Partial<Pick<Exercise, 'name' | 'sets' | 'reps' | 'rir' | 'rm_percent' | 'order_index'>>
  ) {
    return this.http.put(`/exercises/${exerciseId}`, payload);
  }

  deleteExercise(exerciseId: number) {
    return this.http.delete(`/exercises/${exerciseId}`);
  }
}
