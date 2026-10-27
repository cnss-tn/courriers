import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';

/** Affichage/saisie AAAA-MM-JJ (modèle Firestore + campagnes). */
const APP_DATE_FORMATS = {
  parse: { dateInput: 'yyyy-MM-dd' },
  display: {
    dateInput: 'yyyy-MM-dd',
    monthYearLabel: 'MMM yyyy',
    dateAriaLabel: 'yyyy-MM-dd',
    monthYearAriaLabel: 'MMMM yyyy',
  },
};

/**
 * Champ date 100% Angular (Material) : calendrier arabe (mois/jours/années),
 * même API que le reste du formulaire ([value] string AAAA-MM-JJ).
 */
@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [FormsModule, MatDatepickerModule],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
  ],
  templateUrl: './date-input.html',
  styleUrl: './date-input.css',
})
export class DateInputComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() value = '';
  @Input() placeholder = 'اختر...';
  @Input() disabled = false;
  /** Affiche un ✕ pour effacer (champs optionnels). */
  @Input() clearable = true;
  @Output() valueChange = new EventEmitter<string>();

  /** Plage des listes mois/année : 2026 → 2050. */
  readonly minDate = new Date(2026, 0, 1);
  readonly maxDate = new Date(2050, 11, 31);

  @ViewChild(MatDatepicker) picker!: MatDatepicker<Date>;
  private host = inject(ElementRef);

  inner: Date | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.inner = this.toDate(this.value);
  }

  ngAfterViewInit(): void {
    try {
      this.picker?.openedStream.subscribe(() => this.attachCloseBtn());
      this.picker?.closedStream.subscribe(() => this.removeCloseBtn());
    } catch { /* noop */ }
  }

  ngOnDestroy(): void {
    this.removeCloseBtn();
  }

  /** Contenu du calendrier de CE picker (évite de viser le popup d'un autre champ). */
  private pickerContent(): HTMLElement | null {
    const cal = this.picker?.id ? document.getElementById(this.picker.id) : null;
    return (cal?.closest('.mat-datepicker-content') as HTMLElement | null) ?? null;
  }

  /** Retire le ✕ injecté (à la fermeture ou à la destruction du champ). */
  private removeCloseBtn(): void {
    try {
      this.pickerContent()?.querySelectorAll('.mat-date-x').forEach((el) => el.remove());
    } catch { /* noop */ }
  }

  /**
   * Bouton ✕ blanc sur cercle rouge en haut à gauche du calendrier.
   * Il est ajouté DANS le contenu animé (pas dans l'overlay) : il disparaît
   * donc en même temps que le calendrier, sans ✕ flottant pendant l'animation.
   */
  private attachCloseBtn(attempt = 0): void {
    try {
      const content = this.pickerContent();
      if (!content) {
        // L'overlay peut être rendu juste après l'événement `opened`.
        if (attempt < 10) setTimeout(() => this.attachCloseBtn(attempt + 1), 16);
        return;
      }
      if (content.querySelector('.mat-date-x')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mat-date-x';
      btn.textContent = '✕';
      btn.setAttribute('aria-label', 'إغلاق');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { this.picker.close(); } catch { /* noop */ }
      });
      content.appendChild(btn);
    } catch { /* noop */ }
  }

  onPick(d: Date | null): void {
    this.inner = d;
    this.valueChange.emit(this.toStr(d));
  }

  clear(): void {
    this.inner = null;
    this.valueChange.emit('');
  }

  /** Ferme le calendrier au clic extérieur (hors champ et hors popup). */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement | null;
    if (
      this.picker?.opened &&
      t &&
      !this.host.nativeElement.contains(t) &&
      !t.closest('.mat-datepicker-popup, .mat-datepicker-content')
    ) {
      this.picker.close();
    }
  }

  private toDate(v: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  private toStr(d: Date | null): string {
    if (!d) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
