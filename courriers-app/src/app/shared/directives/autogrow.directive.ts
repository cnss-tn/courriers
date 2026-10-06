import { AfterViewInit, Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Textarea qui grandit automatiquement jusqu'à la fin du texte. */
@Directive({
  selector: '[appAutogrow]',
  standalone: true,
})
export class AutogrowDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLTextAreaElement>);

  ngAfterViewInit(): void {
    // Après le rendu (valeurs initiales en mode édition incluses)
    requestAnimationFrame(() => this.resize());
  }

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    const t = this.el.nativeElement;
    t.style.height = 'auto';
    t.style.overflow = 'hidden';
    t.style.resize = 'none';
    t.style.height = `${t.scrollHeight}px`;
  }
}
