import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';
  isDarkMode = false;
  readonly demoUsers = [
    { label: 'Manager Demo', email: 'demo@trainlog.com' },
    { label: 'Cliente Demo', email: 'cliente@trainlog.com' },
    { label: 'Cesar', email: 'cesar@trainlog.com' },
    { label: 'Alegria', email: 'alegria@trainlog.com' },
    { label: 'Alba', email: 'alba@trainlog.com' },
    { label: 'Jose', email: 'jose@trainlog.com' }
  ] as const;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.isDarkMode = this.themeService.isDarkMode();
  }

  toggleTheme(): void {
    this.isDarkMode = this.themeService.toggleTheme() === 'dark';
    this.cdr.markForCheck();
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revisa email y contraseña para continuar';
      this.cdr.markForCheck();
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

  useDemoAccount(email: string): void {
    this.form.patchValue({
      email,
      password: '1234'
    });
    this.errorMessage = '';
    this.cdr.markForCheck();
  }
}
