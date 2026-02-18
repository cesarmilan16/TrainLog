import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { DashboardWorkout } from '../../core/models';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css'
})
export class UserDashboardComponent implements OnInit {
  dashboard: DashboardWorkout[] = [];
  loading = false;
  errorMessage = '';
  openedExerciseId: number | null = null;

  readonly logForm = this.fb.group({
    weight: [0, [Validators.required, Validators.min(1)]],
    reps: [0, [Validators.required, Validators.min(1)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.fetchDashboard();
  }

  fetchDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getDashboard().subscribe({
      next: (dashboard) => {
        this.loading = false;
        this.dashboard = dashboard;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = error.error?.message ?? 'No se pudo cargar el dashboard';
      }
    });
  }

  openLog(exerciseId: number): void {
    this.openedExerciseId = exerciseId;
    this.logForm.reset({ weight: 0, reps: 0 });
  }

  saveLog(exerciseId: number): void {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    const formValue = this.logForm.getRawValue();

    this.userService.addLog({
      exerciseId,
      weight: Number(formValue.weight),
      reps: Number(formValue.reps)
    }).subscribe({
      next: () => {
        this.openedExerciseId = null;
        this.fetchDashboard();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo guardar el log';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
