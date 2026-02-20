import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DashboardWorkout, ExerciseLog, Mesocycle } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  getDashboard(mesocycleId?: number | 'none'): Observable<DashboardWorkout[]> {
    const query = mesocycleId === undefined ? '' : `?mesocycleId=${encodeURIComponent(String(mesocycleId))}`;
    return this.http.get<{ data: DashboardWorkout[] }>(`/workouts/dashboard${query}`).pipe(
      map((response) => response.data ?? [])
    );
  }

  getMyMesocycles(): Observable<Mesocycle[]> {
    return this.http.get<{ data: Mesocycle[] }>('/mesocycles/my').pipe(
      map((response) => response.data ?? [])
    );
  }

  addLog(payload: { exerciseId: number; weight: number; reps: number; date?: string }) {
    return this.http.post('/logs', payload);
  }

  updateLog(logId: number, payload: { weight: number; reps: number; date: string }) {
    return this.http.put(`/logs/item/${logId}`, payload);
  }

  deleteLog(logId: number) {
    return this.http.delete(`/logs/item/${logId}`);
  }

  getLogs(exerciseId: number): Observable<ExerciseLog[]> {
    return this.http.get<{ result: { data: ExerciseLog[] } }>(`/logs/${exerciseId}`).pipe(
      map((response) => response.result?.data ?? [])
    );
  }
}
