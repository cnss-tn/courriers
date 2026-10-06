import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

/** Affichage/saisie au format AAAA-MM-JJ (modèle Firestore + campagnes). */
@Injectable()
export class IsoDateParserFormatter extends NgbDateParserFormatter {
  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  parse(value: string): NgbDateStruct | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  format(date: NgbDateStruct | null): string {
    return date ? `${date.year}-${this.pad(date.month)}-${this.pad(date.day)}` : '';
  }
}
