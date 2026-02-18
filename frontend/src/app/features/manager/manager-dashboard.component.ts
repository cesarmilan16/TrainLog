import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ManagerService } from '../../core/services/manager.service';
import { Exercise, ManagerClient, Workout } from '../../core/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css'
})
export class ManagerDashboardComponent implements OnInit {
  clients: ManagerClient[] = [];
  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  selectedClientId: number | null = null;
  selectedWorkoutId: number | null = null;
  editingExerciseId: number | null = null;

  loadingClients = false;
  loadingWorkouts = false;
  loadingExercises = false;
  errorMessage = '';

  readonly createClientForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly createWorkoutForm = this.fb.group({
    name: ['', Validators.required]
  });

  readonly createExerciseForm = this.fb.group({
    name: ['', Validators.required],
    sets: [3, [Validators.required, Validators.min(1)]],
    reps: [10, [Validators.required, Validators.min(1)]],
    order_index: [1, [Validators.required, Validators.min(1)]]
  });

  readonly editExerciseForm = this.fb.group({
    name: ['', Validators.required],
    sets: [1, [Validators.required, Validators.min(1)]],
    reps: [1, [Validators.required, Validators.min(1)]],
    order_index: [1, [Validators.required, Validators.min(1)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly managerService: ManagerService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.fetchClients();
  }

  fetchClients(): void {
    this.loadingClients = true;
    this.errorMessage = '';

    this.managerService.getClients().subscribe({
      next: (clients) => {
        this.loadingClients = false;
        this.clients = clients;
      },
      error: (error: HttpErrorResponse) => {
        this.loadingClients = false;
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los clientes';
      }
    });
  }

  createClient(): void {
    if (this.createClientForm.invalid) {
      this.createClientForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';

    this.managerService.createClient(this.createClientForm.getRawValue() as { email: string; password: string; name: string }).subscribe({
      next: () => {
        this.createClientForm.reset({ name: '', email: '', password: '' });
        this.fetchClients();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo crear el cliente';
      }
    });
  }

  selectClient(clientId: number): void {
    this.selectedClientId = clientId;
    this.selectedWorkoutId = null;
    this.workouts = [];
    this.exercises = [];
    this.fetchWorkouts(clientId);
  }

  fetchWorkouts(userId: number): void {
    this.loadingWorkouts = true;
    this.errorMessage = '';

    this.managerService.getUserWorkouts(userId).subscribe({
      next: (workouts) => {
        this.loadingWorkouts = false;
        this.workouts = workouts;
      },
      error: (error: HttpErrorResponse) => {
        this.loadingWorkouts = false;
        this.workouts = [];
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los entrenamientos';
      }
    });
  }

  createWorkout(): void {
    if (this.createWorkoutForm.invalid || !this.selectedClientId) {
      this.createWorkoutForm.markAllAsTouched();
      return;
    }

    const payload = {
      name: this.createWorkoutForm.getRawValue().name ?? '',
      userId: this.selectedClientId
    };

    this.managerService.createWorkout(payload).subscribe({
      next: () => {
        this.createWorkoutForm.reset({ name: '' });
        this.fetchWorkouts(this.selectedClientId as number);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo crear el entrenamiento';
      }
    });
  }

  selectWorkout(workoutId: number): void {
    this.selectedWorkoutId = workoutId;
    this.editingExerciseId = null;
    this.fetchExercises(workoutId);
  }

  fetchExercises(workoutId: number): void {
    this.loadingExercises = true;
    this.errorMessage = '';

    this.managerService.getExercises(workoutId).subscribe({
      next: (exercises) => {
        this.loadingExercises = false;
        this.exercises = exercises;
      },
      error: (error: HttpErrorResponse) => {
        this.loadingExercises = false;
        this.exercises = [];
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los ejercicios';
      }
    });
  }

  createExercise(): void {
    if (this.createExerciseForm.invalid || !this.selectedWorkoutId) {
      this.createExerciseForm.markAllAsTouched();
      return;
    }

    const formValue = this.createExerciseForm.getRawValue();

    this.managerService.createExercise({
      name: formValue.name ?? '',
      sets: Number(formValue.sets),
      reps: Number(formValue.reps),
      order_index: Number(formValue.order_index),
      workoutId: this.selectedWorkoutId
    }).subscribe({
      next: () => {
        this.createExerciseForm.reset({ name: '', sets: 3, reps: 10, order_index: 1 });
        this.fetchExercises(this.selectedWorkoutId as number);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo crear el ejercicio';
      }
    });
  }

  startEdit(exercise: Exercise): void {
    this.editingExerciseId = exercise.id;
    this.editExerciseForm.reset({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      order_index: exercise.order_index
    });
  }

  cancelEdit(): void {
    this.editingExerciseId = null;
  }

  saveEdit(exerciseId: number): void {
    if (this.editExerciseForm.invalid || !this.selectedWorkoutId) {
      this.editExerciseForm.markAllAsTouched();
      return;
    }

    const formValue = this.editExerciseForm.getRawValue();

    this.managerService.updateExercise(exerciseId, {
      name: formValue.name ?? '',
      sets: Number(formValue.sets),
      reps: Number(formValue.reps),
      order_index: Number(formValue.order_index)
    }).subscribe({
      next: () => {
        this.editingExerciseId = null;
        this.fetchExercises(this.selectedWorkoutId as number);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo editar el ejercicio';
      }
    });
  }

  deleteExercise(exerciseId: number): void {
    if (!this.selectedWorkoutId) {
      return;
    }

    this.managerService.deleteExercise(exerciseId).subscribe({
      next: () => {
        this.fetchExercises(this.selectedWorkoutId as number);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo eliminar el ejercicio';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
