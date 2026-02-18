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

  addLog(payload: { exerciseId: number; weight: number; reps: number }) {
    return this.http.post('/logs', payload);
  }

  getLogs(exerciseId: number): Observable<ExerciseLog[]> {
    return this.http.get<{ result: { data: ExerciseLog[] } }>(`/logs/${exerciseId}`).pipe(
      map((response) => response.result?.data ?? [])
    );
  }
}
