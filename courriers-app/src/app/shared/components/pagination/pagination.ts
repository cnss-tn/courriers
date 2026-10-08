import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Pagination réutilisable (clone campagnes). */
@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() filtered = 0;
  @Input() pageSize = 5;
  @Input() unit = 'مراسلة';
  @Input() unitPlural = 'مراسلات';
  @Output() pageChange = new EventEmitter<number>();

  pages(): number[] {
    return Array.from({ length: Math.max(1, this.totalPages) }, (_, i) => i + 1);
  }

  label(): string {
    if (this.total === this.filtered) return `${this.total} ${this.total > 1 ? this.unitPlural : this.unit}`;
    return `${this.filtered} / ${this.total} ${this.unitPlural}`;
  }
}
