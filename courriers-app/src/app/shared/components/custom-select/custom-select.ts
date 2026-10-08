import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../dropdown/dropdown';

/**
 * Liste déroulante stylisée + ajout d'une nouvelle valeur
 * (pattern « النشاط » de campagnes) : dropdown custom filtrable,
 * bouton « + جديد » qui bascule vers un champ libre, et UN SEUL
 * bouton ✕ à gauche : désélectionne, ou efface le texte + referme
 * le champ « جديد ».
 */
@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [FormsModule, DropdownComponent],
  templateUrl: './custom-select.html',
  styleUrl: './custom-select.css',
})
export class CustomSelectComponent {
  @Input() label = '';
  @Input() options: string[] = [];
  @Input() placeholder = 'اختر...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() value = '';
  /** Texte secondaire par option (ex. code) : affiché + cherchable. */
  @Input() meta: Record<string, string> = {};
  /** Panneau élargi + liste plus haute (options longues sur une ligne). */
  @Input() widePanel = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() newValue = new EventEmitter<string>();

  customMode = false;
  customText = '';
  private host = inject(ElementRef);

  @ViewChild('customInput') customInput?: ElementRef<HTMLInputElement>;

  onSelect(v: string): void {
    this.value = v;
    this.valueChange.emit(v);
  }

  openCustom(): void {
    this.customMode = true;
    this.customText = '';
    setTimeout(() => this.customInput?.nativeElement.focus(), 0);
  }

  /** Saisie en direct : la valeur part au formulaire à chaque frappe (envoyée au submit). */
  onCustomInput(v: string): void {
    this.customText = v;
    const t = String(v || '').trim();
    if (t) this.newValue.emit(t);
  }

  confirmCustom(): void {
    this.closeCustom();
  }

  /** ✕ unique à gauche : en mode « جديد » efface le texte + referme
      le champ, sinon désélectionne l'option. */
  onSingleClear(): void {
    if (this.customMode) {
      this.customText = '';
      this.newValue.emit('');
      this.customMode = false;
      return;
    }
    this.clear();
  }

  closeCustom(): void {
    this.customMode = false;
    this.customText = '';
  }

  clear(): void {
    this.onSelect('');
  }

  /** Clic hors du champ « جديد » (input + boutons) : retour à la liste. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.customMode && !this.host.nativeElement.contains(e.target)) {
      this.closeCustom();
    }
  }
}
