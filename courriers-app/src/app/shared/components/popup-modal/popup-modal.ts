import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Fenêtre popup générique réutilisable (remplace les modals Bootstrap dupliqués). */
@Component({
  selector: 'app-popup',
  standalone: true,
  templateUrl: './popup-modal.html',
  styleUrl: './popup-modal.css',
})
export class PopupModalComponent {
  @Input() title = '';
  @Input() wide = false;
  /** Taille intermédiaire (680px) : idéale pour les formulaires en 2 colonnes. */
  @Input() medium = false;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
