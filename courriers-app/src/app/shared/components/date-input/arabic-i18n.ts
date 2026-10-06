import { Injectable } from '@angular/core';
import { NgbDatepickerI18n, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

// Mois/jours en arabe (comme la locale ar de flatpickr de l'app campagnes).
const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
// weekday 1 = lundi ... 7 = dimanche
const WEEKDAYS = [
  'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد',
];
const WEEKDAYS_SHORT = ['اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];

@Injectable()
export class ArabicDatepickerI18n extends NgbDatepickerI18n {
  getWeekdayLabel(weekday: number): string {
    return WEEKDAYS_SHORT[weekday - 1] || '';
  }

  getWeekdayShortName(weekday: number): string {
    return WEEKDAYS_SHORT[weekday - 1] || '';
  }

  getMonthShortName(month: number): string {
    return MONTHS[month - 1] || '';
  }

  getMonthFullName(month: number): string {
    return MONTHS[month - 1] || '';
  }

  getDayAriaLabel(date: NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }
}
