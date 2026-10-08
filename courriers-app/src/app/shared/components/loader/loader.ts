import { Component } from '@angular/core';

/** Indicateur de chargement (spinner) réutilisable. */
@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="text-center py-4">
      <div class="spinner-border spinner-accent" role="status" aria-label="تحميل"></div>
    </div>
  `,
  styles: ['.spinner-accent { color: var(--cp-accent); }'],
})
export class LoaderComponent {}
