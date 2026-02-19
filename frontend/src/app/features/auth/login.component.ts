import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading = true;

    this.authService.login(email, password).subscribe({
      next: ({ user }) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.router.navigateByUrl(user.role === 'MANAGER' ? '/manager' : '/user');
      },
      error: (error: HttpErrorResponse | Error) => {
        this.loading = false;

        if (error instanceof HttpErrorResponse) {
          const backendMessage =
            (typeof error.error === 'object' && (error.error?.message ?? error.error?.error)) ||
            (typeof error.error === 'string' ? error.error : '');

          this.errorMessage = backendMessage || (error.status === 401
            ? 'Credenciales incorrectas'
            : 'No se pudo iniciar sesión');
          this.cdr.markForCheck();
          return;
        }

        this.errorMessage = error.message;
        this.cdr.markForCheck();
      }
    });
  }
}
