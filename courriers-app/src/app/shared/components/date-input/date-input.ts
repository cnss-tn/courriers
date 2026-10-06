import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbDateParserFormatter,
  NgbDateStruct,
  NgbDatepickerI18n,
  NgbDatepickerModule,
  NgbInputDatepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { ArabicDatepickerI18n } from './arabic-i18n';
import { IsoDateParserFormatter } from './iso-parser';

/**
 * Champ date 100% Angular (ng-bootstrap) : calendrier arabe au format
 * AAAA-MM-JJ, même API que le reste du formulaire ([value] string).
 */
@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [FormsModule, NgbDatepickerModule],
  providers: [
    { provide: NgbDatepickerI18n, useClass: ArabicDatepickerI18n },
    { provide: NgbDateParserFormatter, useClass: IsoDateParserFormatter },
  ],
  templateUrl: './date-input.html',
  styleUrl: './date-input.css',
})
export class DateInputComponent implements OnChanges {
  @Input() value = '';
  @Input() placeholder = 'اختر...';
  @Input() disabled = false;
  /** Affiche un ✕ pour effacer (champs optionnels). */
  @Input() clearable = true;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild(NgbInputDatepicker) picker!: NgbInputDatepicker;
  private host = inject(ElementRef);

  struct: NgbDateStruct | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.struct = this.toStruct(this.value);
  }

  onPick(s: NgbDateStruct | null): void {
    this.struct = s;
    this.valueChange.emit(this.toStr(s));
  }

  clear(): void {
    this.struct = null;
    this.valueChange.emit('');
  }

  /** Ferme le calendrier au clic extérieur (hors champ et hors popup). */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement | null;
    if (
      this.picker?.isOpen() &&
      t &&
      !this.host.nativeElement.contains(t) &&
      !t.closest('ngb-datepicker')
    ) {
      this.picker.close();
    }
  }

  private toStruct(v: string): NgbDateStruct | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  private toStr(s: NgbDateStruct | null): string {
    if (!s) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${s.year}-${p(s.month)}-${p(s.day)}`;
  }
}
