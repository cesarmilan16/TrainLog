import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { DashboardWorkout, ExerciseLog } from '../../core/models';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  dashboard: DashboardWorkout[] = [];
  expandedWorkouts = new Set<number>();
  isMobileView = false;
  loading = false;
  errorMessage = '';
  openedExerciseId: number | null = null;
  progressExerciseId: number | null = null;
  progressExerciseName = '';
  progressLogs: ExerciseLog[] = [];
  progressLoading = false;
  progressError = '';
  progressRange: 7 | 30 | 90 | 0 = 30;
  progressMetric: 'weight' | 'erm' | 'volume' = 'erm';
  readonly chartWidth = 360;
  readonly chartHeight = 150;
  readonly chartPadding = 16;

  readonly logForm = this.fb.group({
    weight: [null as number | null, [Validators.required, Validators.min(1)]],
    reps: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.updateViewportState();
    this.fetchDashboard();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closeProgress();
  }

  fetchDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getDashboard().subscribe({
      next: (dashboard) => {
        this.loading = false;
        this.dashboard = dashboard;
        this.expandedWorkouts = this.isMobileView ? new Set(dashboard.length > 0 ? [dashboard[0].id] : []) : new Set();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = error.error?.message ?? 'No se pudo cargar el dashboard';
        this.cdr.markForCheck();
      }
    });
  }

  openLog(exerciseId: number): void {
    this.openedExerciseId = exerciseId;
    this.logForm.reset({ weight: null, reps: null });
  }

  openProgress(exerciseId: number, exerciseName: string): void {
    this.progressExerciseId = exerciseId;
    this.progressExerciseName = exerciseName;
    this.progressLogs = [];
    this.progressError = '';
    this.progressLoading = true;
    this.cdr.markForCheck();

    this.userService.getLogs(exerciseId).subscribe({
      next: (logs) => {
        this.progressLoading = false;
        this.progressLogs = logs;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.progressLoading = false;
        this.progressError = error.error?.message ?? 'No se pudo cargar el progreso';
        this.cdr.markForCheck();
      }
    });
  }

  closeProgress(): void {
    this.progressExerciseId = null;
    this.progressExerciseName = '';
    this.progressLogs = [];
    this.progressLoading = false;
    this.progressError = '';
    this.progressRange = 30;
    this.progressMetric = 'erm';
  }

  setProgressRange(range: 7 | 30 | 90 | 0): void {
    this.progressRange = range;
  }

  setProgressMetric(metric: 'weight' | 'erm' | 'volume'): void {
    this.progressMetric = metric;
  }

  isWorkoutExpanded(workoutId: number): boolean {
    return this.expandedWorkouts.has(workoutId);
  }

  toggleWorkout(workoutId: number): void {
    if (!this.isMobileView) {
      return;
    }

    const next = new Set(this.expandedWorkouts);

    if (next.has(workoutId)) {
      next.delete(workoutId);
    } else {
      next.add(workoutId);
    }

    this.expandedWorkouts = next;
    this.cdr.markForCheck();
  }

  private updateViewportState(): void {
    const nextIsMobile = window.innerWidth <= 680;

    if (this.isMobileView === nextIsMobile) {
      return;
    }

    this.isMobileView = nextIsMobile;

    if (!this.isMobileView) {
      this.expandedWorkouts = new Set();
    } else if (this.dashboard.length > 0 && this.expandedWorkouts.size === 0) {
      this.expandedWorkouts = new Set([this.dashboard[0].id]);
    }

    this.cdr.markForCheck();
  }

  saveLog(exerciseId: number): void {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    const { weight, reps } = this.logForm.getRawValue();

    // Tras guardar, recargamos dashboard para mostrar el último log actualizado.
    this.userService.addLog({ exerciseId, weight: Number(weight), reps: Number(reps) }).subscribe({
      next: () => {
        this.openedExerciseId = null;
        this.fetchDashboard();
        if (this.progressExerciseId === exerciseId) {
          this.openProgress(exerciseId, this.progressExerciseName);
        }
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo guardar el log';
        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  get totalExercises(): number {
    return this.dashboard.reduce((total, workout) => total + workout.exercises.length, 0);
  }

  get exercisesWithLogs(): number {
    return this.dashboard.reduce(
      (total, workout) => total + workout.exercises.filter((exercise) => !!exercise.last_log).length,
      0
    );
  }

  get filteredProgressLogs(): ExerciseLog[] {
    if (this.progressRange === 0) {
      return this.progressLogs;
    }

    const now = Date.now();
    const msRange = this.progressRange * 24 * 60 * 60 * 1000;
    return this.progressLogs.filter((log) => now - new Date(log.date).getTime() <= msRange);
  }

  get chartLogs(): ExerciseLog[] {
    return [...this.filteredProgressLogs].reverse();
  }

  get latestLog(): ExerciseLog | null {
    return this.filteredProgressLogs[0] ?? null;
  }

  get bestWeight(): number | null {
    if (this.filteredProgressLogs.length === 0) {
      return null;
    }

    return Math.max(...this.filteredProgressLogs.map((log) => log.weight));
  }

  get bestMetricValue(): number | null {
    if (this.filteredProgressLogs.length === 0) {
      return null;
    }

    return Math.max(...this.filteredProgressLogs.map((log) => this.getMetricValue(log)));
  }

  get volumeTotal(): number {
    return this.filteredProgressLogs.reduce((sum, log) => sum + log.weight * log.reps, 0);
  }

  get trendPercent(): number | null {
    if (this.chartLogs.length < 2) {
      return null;
    }

    const recent = this.getMetricValue(this.chartLogs[this.chartLogs.length - 1]);
    const previous = this.getMetricValue(this.chartLogs[this.chartLogs.length - 2]);

    if (previous === 0) {
      return null;
    }

    return ((recent - previous) / previous) * 100;
  }

  get chartPoints(): Array<{ x: number; y: number; log: ExerciseLog }> {
    const logs = this.chartLogs;
    if (logs.length === 0) {
      return [];
    }

    const width = this.chartWidth;
    const height = this.chartHeight;
    const padding = this.chartPadding;
    const values = logs.map((log) => this.getMetricValue(log));
    const minRaw = Math.min(...values);
    const maxRaw = Math.max(...values);
    const rawSpread = Math.max(maxRaw - minRaw, 1);
    const verticalPadding = Math.max(rawSpread * 0.18, 1);
    const min = minRaw - verticalPadding;
    const max = maxRaw + verticalPadding;
    const spread = Math.max(max - min, 1);

    return logs.map((log, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(logs.length - 1, 1);
      const value = this.getMetricValue(log);
      const y = height - padding - ((value - min) / spread) * (height - padding * 2);
      return { x, y, log };
    });
  }

  get chartPath(): string {
    return this.buildSmoothPath(this.chartPoints.map((point) => ({ x: point.x, y: point.y })));
  }

  get chartAreaPath(): string {
    const points = this.chartPoints;
    if (points.length === 0) {
      return '';
    }

    const baseY = this.chartHeight - this.chartPadding;
    const smooth = this.buildSmoothPath(points.map((point) => ({ x: point.x, y: point.y })));
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;

    return `${smooth} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }

  get movingAveragePath(): string {
    const points = this.chartPoints;
    if (points.length < 2) {
      return '';
    }

    const values = this.chartLogs.map((log) => this.getMetricValue(log));
    const width = this.chartWidth;
    const height = this.chartHeight;
    const padding = this.chartPadding;
    const minRaw = Math.min(...values);
    const maxRaw = Math.max(...values);
    const rawSpread = Math.max(maxRaw - minRaw, 1);
    const verticalPadding = Math.max(rawSpread * 0.18, 1);
    const min = minRaw - verticalPadding;
    const max = maxRaw + verticalPadding;
    const spread = Math.max(max - min, 1);

    const avgPoints = values.map((_, index): { x: number; y: number } => {
      const from = Math.max(0, index - 2);
      const windowValues = values.slice(from, index + 1);
      const avg = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((avg - min) / spread) * (height - padding * 2);
      return { x, y };
    });

    return this.buildSmoothPath(avgPoints);
  }

  get chartGridLines(): Array<{ y: number; label: number }> {
    const values = this.chartLogs.map((log) => this.getMetricValue(log));
    if (values.length === 0) {
      return [];
    }

    const minRaw = Math.min(...values);
    const maxRaw = Math.max(...values);
    const rawSpread = Math.max(maxRaw - minRaw, 1);
    const verticalPadding = Math.max(rawSpread * 0.18, 1);
    const min = minRaw - verticalPadding;
    const max = maxRaw + verticalPadding;
    const steps = 4;
    const lines = [];

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const y = this.chartPadding + t * (this.chartHeight - this.chartPadding * 2);
      const label = max - t * (max - min);
      lines.push({ y, label: Number(label.toFixed(1)) });
    }

    return lines;
  }

  get chartViewBox(): string {
    return `0 0 ${this.chartWidth} ${this.chartHeight}`;
  }

  estimateOneRm(log: ExerciseLog): number {
    return Number((log.weight * (1 + log.reps / 30)).toFixed(1));
  }

  getMetricValue(log: ExerciseLog): number {
    if (this.progressMetric === 'weight') {
      return log.weight;
    }

    if (this.progressMetric === 'volume') {
      return log.weight * log.reps;
    }

    return this.estimateOneRm(log);
  }

  getMetricLabel(): string {
    if (this.progressMetric === 'weight') {
      return 'Peso';
    }

    if (this.progressMetric === 'volume') {
      return 'Volumen';
    }

    return '1RM';
  }

  private buildSmoothPath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) {
      return '';
    }

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
    }

    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  }
}
