import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { DashboardWorkout } from '../../core/models';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
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
}
