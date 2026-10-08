import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Noms de jours complets en tunisien (au lieu des initiales). */
const JOURS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

@Injectable()
export class TunisianDateAdapter extends NativeDateAdapter {
  override getDayOfWeekNames(_style: 'long' | 'short' | 'narrow'): string[] {
    return [...JOURS];
  }

  /**
   * L'adaptateur natif ignore les motifs (yyyy-MM-dd) et formate via Intl
   * (slaches). On force ici le tiret pour l'affichage du champ ;
   * l'en-tête du calendrier garde les mois arabes via super.format().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override format(date: Date, displayFormat: any): string {
    if (
      typeof displayFormat === 'string' &&
      displayFormat.includes('yyyy') &&
      displayFormat.includes('MM') &&
      displayFormat.includes('dd')
    ) {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
    }
    return super.format(date, displayFormat);
  }
}
