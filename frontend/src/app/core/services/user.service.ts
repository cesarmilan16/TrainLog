import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DashboardWorkout, ExerciseLog } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<DashboardWorkout[]> {
    return this.http.get<{ data: DashboardWorkout[] }>('/workouts/dashboard').pipe(
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
