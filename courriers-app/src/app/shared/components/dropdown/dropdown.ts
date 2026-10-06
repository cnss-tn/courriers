import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Liste déroulante stylisée (remplace le <select> natif dont la popup
 * n'est pas stylable) : bouton + panneau custom avec recherche intégrée,
 * survol vert et option sélectionnée mise en avant — style campagnes.
 */
@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.css',
})
export class DropdownComponent {
  @Input() options: string[] = [];
  @Input() value = '';
  @Input() placeholder = 'اختر...';
  @Input() disabled = false;
  @Input() required = false;
  /** Valeur affichée en gras distinct (ex. 'Archive' toujours en dernier). */
  @Input() specialLast = '';
  /** Affiche le champ de recherche en haut de la liste (caché pour les filtres courts). */
  @Input() searchable = true;
  @Output() valueChange = new EventEmitter<string>();

  private host = inject(ElementRef);
  open = signal(false);
  search = signal('');

  filtered(): string[] {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter((o) => o.toLowerCase().includes(q));
  }

  toggle(): void {
    if (this.disabled) return;
    this.open.update((v) => !v);
    this.search.set('');
  }

  choose(v: string): void {
    this.value = v;
    this.valueChange.emit(v);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
