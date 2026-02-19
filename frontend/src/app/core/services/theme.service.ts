import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'trainlog-theme';
  private readonly darkClass = 'dark';

  initTheme(): AppTheme {
    const savedTheme = this.readStoredTheme();
    const theme = savedTheme ?? (this.prefersDark() ? 'dark' : 'light');
    this.applyTheme(theme);
    return theme;
  }

  toggleTheme(): AppTheme {
    const nextTheme: AppTheme = this.isDarkMode() ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    return nextTheme;
  }

  isDarkMode(): boolean {
    return this.document.documentElement.classList.contains(this.darkClass);
  }

  private applyTheme(theme: AppTheme): void {
    const isDark = theme === 'dark';

    this.document.documentElement.classList.toggle(this.darkClass, isDark);
    this.document.body.classList.toggle(this.darkClass, isDark);

    try {
      localStorage.setItem(this.storageKey, theme);
    } catch {
      // Ignora errores de almacenamiento (modo privado/restricciones).
    }
  }

  private readStoredTheme(): AppTheme | null {
    try {
      const value = localStorage.getItem(this.storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private prefersDark(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
