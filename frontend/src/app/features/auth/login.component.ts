import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    if (!email || !password) {
      return;
    }

    this.loading = true;

    this.authService.login(email, password).subscribe({
      next: ({ user }) => {
        this.loading = false;
        if (user.role === 'MANAGER') {
          this.router.navigateByUrl('/manager');
          return;
        }

        this.router.navigateByUrl('/user');
      },
      error: (error: HttpErrorResponse | Error) => {
        this.loading = false;

        if (error instanceof HttpErrorResponse) {
          this.errorMessage = error.error?.message ?? 'No se pudo iniciar sesión';
          return;
        }

        this.errorMessage = error.message;
      }
    });
  }
}
