import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

import { AuthService } from '../../core/services/auth.service';
import { ManagerService } from '../../core/services/manager.service';
import { Exercise, ManagerClient, MovementSuggestion, Workout } from '../../core/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    // Entrada/salida suave para los bloques de detalle al cambiar selección.
    trigger('detailFadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(6px)' }))
      ])
    ])
  ]
})
export class ManagerDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly managerService = inject(ManagerService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  clients: ManagerClient[] = [];
  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  selectedClientId: number | null = null;
  selectedWorkoutId: number | null = null;
  editingExerciseId: number | null = null;

  openClientMenuId: number | null = null;
  openWorkoutMenuId: number | null = null;
  openExerciseMenuId: number | null = null;

  loadingClients = false;
  loadingWorkouts = false;
  loadingExercises = false;
  errorMessage = '';
  showCreateClient = false;
  showCreateWorkout = false;
  showCreateExercise = false;
  createExerciseMovementId: number | null = null;
  editExerciseMovementId: number | null = null;
  createExerciseSuggestions: MovementSuggestion[] = [];
  editExerciseSuggestions: MovementSuggestion[] = [];
  showCreateSuggestions = false;
  showEditSuggestions = false;

  editModalOpen = false;
  editModalTitle = '';
  editModalType: 'client' | 'workout' | null = null;
  editTargetId: number | null = null;
  confirmModalOpen = false;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalType: 'client' | 'workout' | null = null;
  confirmTargetId: number | null = null;

  readonly createClientForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly createWorkoutForm = this.fb.nonNullable.group({
    name: ['', Validators.required]
  });

  readonly createExerciseForm = this.fb.group({
    name: ['', Validators.required],
    sets: [null as number | null, [Validators.required, Validators.min(1)]],
    reps: [null as number | null, [Validators.required, Validators.min(1)]],
    rir: [null as number | null, [Validators.min(0), Validators.max(10)]],
    rm_percent: [null as number | null, [Validators.min(1), Validators.max(100)]],
    order_index: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  readonly editExerciseForm = this.fb.group({
    name: ['', Validators.required],
    sets: [null as number | null, [Validators.required, Validators.min(1)]],
    reps: [null as number | null, [Validators.required, Validators.min(1)]],
    rir: [null as number | null, [Validators.min(0), Validators.max(10)]],
    rm_percent: [null as number | null, [Validators.min(1), Validators.max(100)]],
    order_index: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  readonly editEntityForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.email],
    password: ['']
  });

  ngOnInit(): void {
    this.fetchClients();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closeMenus();
    this.closeEditModal();
    this.closeConfirmModal();
    this.closeSuggestionLists();
    this.cdr.markForCheck();
  }

  fetchClients(): void {
    this.loadingClients = true;
    this.errorMessage = '';

    this.managerService.getClients().subscribe({
      next: (clients) => {
        this.loadingClients = false;
        this.clients = clients;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loadingClients = false;
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los clientes';
        this.cdr.markForCheck();
      }
    });
  }

  createClient(): void {
    if (this.createClientForm.invalid) {
      this.createClientForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';

    this.managerService.createClient(this.createClientForm.getRawValue()).subscribe({
      next: () => {
        this.createClientForm.reset({ name: '', email: '', password: '' });
        this.showCreateClient = false;
        this.fetchClients();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo crear el cliente';
        this.cdr.markForCheck();
      }
    });
  }

  selectClient(clientId: number): void {
    this.selectedClientId = clientId;
    this.selectedWorkoutId = null;
    // Evita mostrar workouts del cliente anterior mientras llega la nueva carga.
    this.workouts = [];
    this.exercises = [];
    this.createExerciseSuggestions = [];
    this.editExerciseSuggestions = [];
    this.createExerciseMovementId = null;
    this.editExerciseMovementId = null;
    this.closeSuggestionLists();
    this.closeMenus();
    this.fetchWorkouts(clientId);
  }

  openClientMenu(clientId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openWorkoutMenuId = null;
    this.openExerciseMenuId = null;
    this.openClientMenuId = this.openClientMenuId === clientId ? null : clientId;
    this.cdr.markForCheck();
  }

  openWorkoutMenu(workoutId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openClientMenuId = null;
    this.openExerciseMenuId = null;
    this.openWorkoutMenuId = this.openWorkoutMenuId === workoutId ? null : workoutId;
    this.cdr.markForCheck();
  }

  openExerciseMenu(exerciseId: number, event: MouseEvent): void {
    event.stopPropagation();
    // Solo un menú contextual abierto a la vez.
    this.openClientMenuId = null;
    this.openWorkoutMenuId = null;
    this.openExerciseMenuId = this.openExerciseMenuId === exerciseId ? null : exerciseId;
    this.cdr.markForCheck();
  }

  closeMenus(): void {
    this.openClientMenuId = null;
    this.openWorkoutMenuId = null;
    this.openExerciseMenuId = null;
  }

  openEditClientModal(client: ManagerClient): void {
    this.editModalOpen = true;
    this.editModalType = 'client';
    this.editTargetId = client.id;
    this.editModalTitle = 'Editar cliente';
    this.editEntityForm.reset({
      name: client.name,
      email: client.email,
      password: ''
    });
    this.closeMenus();
    this.cdr.markForCheck();
  }

  openEditWorkoutModal(workout: Workout): void {
    this.editModalOpen = true;
    this.editModalType = 'workout';
    this.editTargetId = workout.id;
    this.editModalTitle = 'Editar entrenamiento';
    this.editEntityForm.reset({
      name: workout.name,
      email: '',
      password: ''
    });
    this.closeMenus();
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.editModalType = null;
    this.editTargetId = null;
    this.editEntityForm.reset({ name: '', email: '', password: '' });
    this.cdr.markForCheck();
  }

  openDeleteClientConfirm(clientId: number): void {
    this.confirmModalOpen = true;
    this.confirmModalType = 'client';
    this.confirmTargetId = clientId;
    this.confirmModalTitle = 'Eliminar cliente';
    this.confirmModalMessage = 'Esto eliminará también sus entrenamientos y logs. Esta acción no se puede deshacer.';
    this.closeMenus();
    this.cdr.markForCheck();
  }

  openDeleteWorkoutConfirm(workoutId: number): void {
    this.confirmModalOpen = true;
    this.confirmModalType = 'workout';
    this.confirmTargetId = workoutId;
    this.confirmModalTitle = 'Eliminar entrenamiento';
    this.confirmModalMessage = 'Se eliminarán también sus ejercicios asociados. Esta acción no se puede deshacer.';
    this.closeMenus();
    this.cdr.markForCheck();
  }

  closeConfirmModal(): void {
    this.confirmModalOpen = false;
    this.confirmModalType = null;
    this.confirmTargetId = null;
    this.confirmModalTitle = '';
    this.confirmModalMessage = '';
  }

  confirmDelete(): void {
    if (!this.confirmModalType || !this.confirmTargetId) {
      return;
    }

    if (this.confirmModalType === 'client') {
      this.deleteClient(this.confirmTargetId);
      return;
    }

    this.deleteWorkout(this.confirmTargetId);
  }

  submitEditModal(): void {
    if (!this.editModalType || !this.editTargetId) {
      return;
    }

    if (this.editEntityForm.invalid) {
      this.editEntityForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const targetId = this.editTargetId;
    const name = this.editEntityForm.getRawValue().name.trim();

    if (!name) {
      this.errorMessage = 'El nombre es obligatorio';
      this.cdr.markForCheck();
      return;
    }

    if (this.editModalType === 'client') {
      const payload: { name?: string; email?: string; password?: string } = {
        name,
        email: this.editEntityForm.getRawValue().email.trim()
      };

      const password = this.editEntityForm.getRawValue().password.trim();
      if (password) {
        payload.password = password;
      }

      this.managerService.updateClient(targetId, payload).subscribe({
        next: () => {
          this.fetchClients();

          if (this.selectedClientId === targetId) {
            this.fetchWorkouts(targetId);
          }

          this.closeEditModal();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message ?? 'No se pudo editar el cliente';
          this.cdr.markForCheck();
        }
      });
      return;
    }

    this.managerService.updateWorkout(targetId, { name }).subscribe({
      next: () => {
        if (this.selectedClientId) {
          this.fetchWorkouts(this.selectedClientId);
        }

        this.closeEditModal();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo editar el entrenamiento';
        this.cdr.markForCheck();
      }
    });
  }

  deleteClient(clientId: number): void {
    this.managerService.deleteClient(clientId).subscribe({
      next: () => {
        if (this.selectedClientId === clientId) {
          this.selectedClientId = null;
          this.selectedWorkoutId = null;
          this.workouts = [];
          this.exercises = [];
        }

        this.fetchClients();
        this.closeConfirmModal();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo eliminar el cliente';
        this.cdr.markForCheck();
      }
    });
  }

  fetchWorkouts(userId: number): void {
    this.loadingWorkouts = true;
    this.errorMessage = '';

    this.managerService.getUserWorkouts(userId).subscribe({
      next: (workouts) => {
        this.loadingWorkouts = false;
        this.workouts = workouts;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loadingWorkouts = false;
        this.workouts = [];
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los entrenamientos';
        this.cdr.markForCheck();
      }
    });
  }

  createWorkout(): void {
    if (this.createWorkoutForm.invalid || !this.selectedClientId) {
      this.createWorkoutForm.markAllAsTouched();
      return;
    }

    this.managerService
      .createWorkout({ name: this.createWorkoutForm.getRawValue().name, userId: this.selectedClientId })
      .subscribe({
        next: () => {
          this.createWorkoutForm.reset({ name: '' });
          this.showCreateWorkout = false;
          this.fetchWorkouts(this.selectedClientId as number);
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message ?? 'No se pudo crear el entrenamiento';
          this.cdr.markForCheck();
        }
      });
  }

  deleteWorkout(workoutId: number): void {
    if (!this.selectedClientId) {
      return;
    }

    this.managerService.deleteWorkout(workoutId).subscribe({
      next: () => {
        if (this.selectedWorkoutId === workoutId) {
          this.selectedWorkoutId = null;
          this.exercises = [];
        }

        this.fetchWorkouts(this.selectedClientId as number);
        this.closeConfirmModal();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo eliminar el entrenamiento';
        this.cdr.markForCheck();
      }
    });
  }

  selectWorkout(workoutId: number): void {
    this.selectedWorkoutId = workoutId;
    this.editingExerciseId = null;
    this.closeMenus();
    this.fetchExercises(workoutId);
  }

  fetchExercises(workoutId: number): void {
    this.loadingExercises = true;
    this.errorMessage = '';

    this.managerService.getExercises(workoutId).subscribe({
      next: (exercises) => {
        this.loadingExercises = false;
        this.exercises = exercises;
        this.syncSelectedWorkoutExerciseCount(exercises.length);
        this.setNextExerciseOrder();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loadingExercises = false;
        this.exercises = [];
        this.syncSelectedWorkoutExerciseCount(0);
        this.setNextExerciseOrder();
        this.errorMessage = error.error?.message ?? 'No se pudieron cargar los ejercicios';
        this.cdr.markForCheck();
      }
    });
  }

  createExercise(): void {
    if (this.createExerciseForm.invalid || !this.selectedWorkoutId) {
      this.createExerciseForm.markAllAsTouched();
      return;
    }

    this.managerService
      .createExercise({
        name: this.createExerciseForm.getRawValue().name ?? '',
        sets: Number(this.createExerciseForm.getRawValue().sets),
        reps: Number(this.createExerciseForm.getRawValue().reps),
        rir: this.createExerciseForm.getRawValue().rir ?? null,
        rm_percent: this.createExerciseForm.getRawValue().rm_percent ?? null,
        order_index: Number(this.createExerciseForm.getRawValue().order_index),
        workoutId: this.selectedWorkoutId,
        ...(this.createExerciseMovementId ? { movementId: this.createExerciseMovementId } : {})
      })
      .subscribe({
        next: () => {
          this.createExerciseForm.reset({
            name: '',
            sets: null,
            reps: null,
            rir: null,
            rm_percent: null,
            order_index: null
          });
          this.createExerciseMovementId = null;
          this.createExerciseSuggestions = [];
          this.showCreateExercise = false;
          this.fetchExercises(this.selectedWorkoutId as number);
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message ?? 'No se pudo crear el ejercicio';
          this.cdr.markForCheck();
        }
      });
  }

  startEdit(exercise: Exercise): void {
    this.closeMenus();
    this.showCreateSuggestions = false;
    this.editingExerciseId = exercise.id;
    this.editExerciseForm.reset({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      rir: exercise.rir,
      rm_percent: exercise.rm_percent,
      order_index: exercise.order_index
    });
    this.editExerciseMovementId = null;
    this.fetchMovementSuggestions(exercise.name, 'edit');
  }

  cancelEdit(): void {
    this.editingExerciseId = null;
    this.showEditSuggestions = false;
    this.closeMenus();
  }

  saveEdit(exerciseId: number): void {
    if (this.editExerciseForm.invalid || !this.selectedWorkoutId) {
      this.editExerciseForm.markAllAsTouched();
      return;
    }

    this.managerService
      .updateExercise(exerciseId, {
        name: this.editExerciseForm.getRawValue().name ?? '',
        sets: Number(this.editExerciseForm.getRawValue().sets),
        reps: Number(this.editExerciseForm.getRawValue().reps),
        rir: this.editExerciseForm.getRawValue().rir ?? null,
        rm_percent: this.editExerciseForm.getRawValue().rm_percent ?? null,
        order_index: Number(this.editExerciseForm.getRawValue().order_index),
        ...(this.editExerciseMovementId ? { movementId: this.editExerciseMovementId } : {})
      })
      .subscribe({
        next: () => {
          this.editingExerciseId = null;
          this.editExerciseMovementId = null;
          this.editExerciseSuggestions = [];
          this.showEditSuggestions = false;
          this.fetchExercises(this.selectedWorkoutId as number);
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message ?? 'No se pudo editar el ejercicio';
          this.cdr.markForCheck();
        }
      });
  }

  deleteExercise(exerciseId: number): void {
    if (!this.selectedWorkoutId) {
      return;
    }

    this.managerService.deleteExercise(exerciseId).subscribe({
      next: () => {
        this.closeMenus();
        this.fetchExercises(this.selectedWorkoutId as number);
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message ?? 'No se pudo eliminar el ejercicio';
        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  get totalWorkouts(): number {
    return this.clients.reduce((total, client) => total + client.workouts_count, 0);
  }

  toggleCreateSection(section: 'client' | 'workout' | 'exercise'): void {
    if (section === 'client') {
      this.showCreateClient = !this.showCreateClient;
      return;
    }

    if (section === 'workout') {
      this.showCreateWorkout = !this.showCreateWorkout;
      return;
    }

    this.showCreateExercise = !this.showCreateExercise;
    if (this.showCreateExercise) {
      this.setNextExerciseOrder();
      this.createExerciseSuggestions = [];
      this.createExerciseMovementId = null;
      this.showCreateSuggestions = false;
    }
  }

  onCreateExerciseNameInput(): void {
    const name = (this.createExerciseForm.getRawValue().name ?? '').trim();
    this.fetchMovementSuggestions(name, 'create');
  }

  onEditExerciseNameInput(): void {
    const name = (this.editExerciseForm.getRawValue().name ?? '').trim();
    this.fetchMovementSuggestions(name, 'edit');
  }

  selectSuggestion(item: MovementSuggestion, target: 'create' | 'edit'): void {
    if (target === 'create') {
      this.createExerciseForm.patchValue({ name: item.name });
      this.createExerciseMovementId = item.id;
      this.showCreateSuggestions = false;
      return;
    }

    this.editExerciseForm.patchValue({ name: item.name });
    this.editExerciseMovementId = item.id;
    this.showEditSuggestions = false;
  }

  closeSuggestionLists(): void {
    this.showCreateSuggestions = false;
    this.showEditSuggestions = false;
  }

  private fetchMovementSuggestions(name: string, target: 'create' | 'edit'): void {
    if (!this.selectedClientId) {
      return;
    }

    const query = name.trim();
    if (query.length === 0) {
      if (target === 'create') {
        this.createExerciseSuggestions = [];
        this.createExerciseMovementId = null;
        this.showCreateSuggestions = false;
      } else {
        this.editExerciseSuggestions = [];
        this.editExerciseMovementId = null;
        this.showEditSuggestions = false;
      }
      this.cdr.markForCheck();
      return;
    }

    this.managerService.getMovementSuggestions(this.selectedClientId, query).subscribe({
      next: (suggestions) => {
        const normalizedInput = this.normalizeName(query);
        const exact = suggestions.find((item) => this.normalizeName(item.name) === normalizedInput) ?? null;

        if (target === 'create') {
          this.createExerciseSuggestions = suggestions;
          this.createExerciseMovementId = exact?.id ?? null;
          this.showCreateSuggestions = suggestions.length > 0;
        } else {
          this.editExerciseSuggestions = suggestions;
          this.editExerciseMovementId = exact?.id ?? null;
          this.showEditSuggestions = suggestions.length > 0;
        }

        this.cdr.markForCheck();
      },
      error: () => {
        if (target === 'create') {
          this.createExerciseSuggestions = [];
          this.createExerciseMovementId = null;
          this.showCreateSuggestions = false;
        } else {
          this.editExerciseSuggestions = [];
          this.editExerciseMovementId = null;
          this.showEditSuggestions = false;
        }
        this.cdr.markForCheck();
      }
    });
  }

  private normalizeName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private setNextExerciseOrder(): void {
    const maxOrder = this.exercises.reduce((max, item) => Math.max(max, item.order_index || 0), 0);
    this.createExerciseForm.patchValue({ order_index: maxOrder + 1 });
  }

  private syncSelectedWorkoutExerciseCount(count: number): void {
    if (!this.selectedWorkoutId) {
      return;
    }

    this.workouts = this.workouts.map((workout) =>
      workout.id === this.selectedWorkoutId
        ? { ...workout, exercises_count: count }
        : workout
    );
  }
}
