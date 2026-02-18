import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';

import { AuthUser, LoginResponse, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'trainlog_token';
  private readonly userKey = 'trainlog_user';

  readonly currentUser = signal<AuthUser | null>(this.loadUser());
  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResponse>('/users/login', { email, password }).pipe(
      map((response) => {
        const role = this.decodeRole(response.token);
        if (!role) {
          throw new Error('No se pudo leer el rol del token');
        }

        const user: AuthUser = {
          id: response.id,
          email: response.email,
          role
        };

        return { response, user };
      }),
      tap(({ response, user }) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.token.set(response.token);
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.currentUser.set(null);
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private decodeRole(token: string): UserRole | null {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

      // JWT usa base64url; convertimos y parseamos para leer el claim role.
      const decoded = JSON.parse(atob(padded));
      return decoded.role as UserRole;
    } catch {
      return null;
    }
  }
}
