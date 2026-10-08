import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject, signal } from '@angular/core';
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
  /** Valeur affichée en gras distinct (ex. 'الأرشيف' toujours en dernier). */
  @Input() specialLast = '';
  /** Texte secondaire par option (ex. code bureau) : affiché + inclus dans la recherche. */
  @Input() meta: Record<string, string> = {};
  /** Panneau élargi (texte des options sur une ligne) + liste plus haute (~6 <li>). */
  @Input() widePanel = false;
  /** Affiche le champ de recherche en haut de la liste (caché pour les filtres courts). */
  @Input() searchable = true;
  @Output() valueChange = new EventEmitter<string>();

  private host = inject(ElementRef);
  open = signal(false);
  search = signal('');

  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  filtered(): string[] {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(
      (o) => o.toLowerCase().includes(q) || (this.meta[o] || '').toLowerCase().includes(q),
    );
  }

  toggle(): void {
    if (this.disabled) return;
    if (this.open()) {
      this.open.set(false);
      this.search.set('');
      return;
    }
    this.search.set('');
    this.open.set(true);
    if (this.searchable) {
      setTimeout(() => this.searchBox?.nativeElement.focus(), 0);
    }
  }

  choose(v: string): void {
    this.value = v;
    this.valueChange.emit(v);
    this.open.set(false);
    this.search.set('');
  }

  /** Entrée : choisit le premier résultat filtré (comme Choices.js). */
  chooseFirst(): void {
    const list = this.filtered();
    if (list.length) this.choose(list[0]);
  }

  /** Escape dans le champ recherche : ferme la liste. */
  closeFromSearch(): void {
    this.open.set(false);
    this.search.set('');
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
    this.search.set('');
  }
}
