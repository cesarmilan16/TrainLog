import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly darkClass = 'dark';

  initTheme(): void {
    this.document.documentElement.classList.add(this.darkClass);
    this.document.body.classList.add(this.darkClass);
  }

  isDarkMode(): boolean {
    return this.document.documentElement.classList.contains(this.darkClass);
  }
}
