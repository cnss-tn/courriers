import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../dropdown/dropdown';

/**
 * Liste déroulante stylisée + ajout d'une nouvelle valeur
 * (pattern « النشاط » de campagnes) : dropdown custom filtrable,
 * bouton « + جديد » qui bascule vers un champ libre, bouton ✕ pour
 * revenir à la liste ou effacer le choix.
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
  @Output() valueChange = new EventEmitter<string>();
  @Output() newValue = new EventEmitter<string>();

  customMode = false;
  customText = '';

  onSelect(v: string): void {
    this.value = v;
    this.valueChange.emit(v);
  }

  openCustom(): void {
    this.customMode = true;
    this.customText = '';
  }

  closeCustom(): void {
    this.customMode = false;
    this.customText = '';
  }

  confirmCustom(): void {
    const v = this.customText.trim();
    if (!v) return;
    this.newValue.emit(v); // le parent persiste puis met à jour value/options
    this.customMode = false;
    this.customText = '';
  }

  clear(): void {
    this.onSelect('');
  }
}
