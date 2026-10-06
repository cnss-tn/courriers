import { Component } from '@angular/core';

/** Fond décoratif partagé (clone campagnes). */
@Component({
  selector: 'app-background',
  standalone: true,
  template: `
    <div class="composed-backdrop" aria-hidden="true"></div>
    <div class="composed-grid-pattern" aria-hidden="true"></div>
  `,
  styles: [],
})
export class BackgroundComponent {}
