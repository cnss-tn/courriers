import { Component } from '@angular/core';

/** Pied de page : crédit uniquement (comme l'app campagnes). */
@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <div class="dev-credit">تصميم وتطوير: إدارة المراقبة - أحمد الزكراوي</div>
  `,
  styles: [],
})
export class FooterComponent {}
