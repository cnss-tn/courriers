import { AfterViewInit, Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';

/** Pile des popups ouverts : Échap ne ferme que celui du dessus. */
const openStack: PopupModalComponent[] = [];

/** Fenêtre popup générique réutilisable (remplace les modals Bootstrap dupliqués). */
@Component({
  selector: 'app-popup',
  standalone: true,
  templateUrl: './popup-modal.html',
  styleUrl: './popup-modal.css',
})
export class PopupModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() title = '';
  @Input() wide = false;
  /** Taille intermédiaire (680px) : idéale pour les formulaires en 2 colonnes. */
  @Input() medium = false;
  @Output() closed = new EventEmitter<void>();

  ngOnInit(): void {
    openStack.push(this);
  }

  ngOnDestroy(): void {
    const i = openStack.indexOf(this);
    if (i >= 0) openStack.splice(i, 1);
  }

  /** À l'ouverture : retire le focus gardé par le bouton déclencheur. */
  ngAfterViewInit(): void {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
  /** Échap ferme le popup du dessus uniquement. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (openStack[openStack.length - 1] === this) this.close();
  }

  close(): void {
    this.closed.emit();
    // Le bouton déclencheur garde le focus de son clic d'ouverture :
    // le retirer pour éviter le rectangle bleu après fermeture.
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  /** Ferme uniquement au clic direct sur le fond (laisse les clics internes
      se propager au document : les dropdowns se ferment au clic extérieur). */
  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }
}
