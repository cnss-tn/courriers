import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourriersController } from '../../../controllers/courriers.controller';
import { Courrier, formatSeq } from '../../../models/courrier.model';
import { ExportButtonsComponent } from '../../../shared/components/export-buttons/export-buttons';
import { DropdownComponent } from '../../../shared/components/dropdown/dropdown';
import { LoaderComponent } from '../../../shared/components/loader/loader';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PopupModalComponent } from '../../../shared/components/popup-modal/popup-modal';
import { CourrierDetailsView } from '../courrier-details/courrier-details.view';
import { CourrierFormView } from '../courrier-form/courrier-form.view';

// VIEW — registre des مراسلات : aucun accès direct aux services,
// tout passe par CourriersController. L'état local (popups) reste ici
// car c'est de l'état d'interface, pas métier.
@Component({
  selector: 'app-courriers-list',
  standalone: true,
  imports: [
    FormsModule,
    LoaderComponent,
    PaginationComponent,
    ExportButtonsComponent,
    DropdownComponent,
    PopupModalComponent,
    CourrierFormView,
    CourrierDetailsView,
  ],
  templateUrl: './courriers-list.view.html',
  styleUrl: './courriers-list.view.css',
})
export class CourriersListView implements OnInit {
  protected ctrl = inject(CourriersController);

  showForm = signal(false);
  editing = signal<Courrier | null>(null);
  details = signal<Courrier | null>(null);
  saveError = signal('');

  readonly reponseOptions = ['نعم', 'لا'];
  protected readonly fmtSeq = formatSeq;

  /** Sonde invisible (même police que les toggles des filtres) pour mesurer les options. */
  @ViewChild('fitProbe') private fitProbe?: ElementRef<HTMLElement>;

  /**
   * Largeur du filtre = plus longue option mesurée + chrome
   * (paddings toggle, chevron, ✕, espacements, marge).
   * `withCode` : les options affichent un badge code (مصدر).
   * `max` : plafond optionnel (le toggle tronque avec …, le panneau garde le texte entier).
   */
  filterWidth(opts: string[], withCode = false, max = 0): string {
    const all = [...opts, 'الكل'];
    const el = this.fitProbe?.nativeElement;
    let text = 0;
    if (el) {
      for (const o of all) {
        el.textContent = o || 'الكل';
        text = Math.max(text, el.scrollWidth);
      }
    } else {
      const longest = all.reduce((m, o) => Math.max(m, (o || '').length), 0);
      text = longest * 7;
    }
    return `${Math.min(Math.ceil(text) + 76 + (withCode ? 56 : 0), max || Infinity)}px`;
  }

  async ngOnInit(): Promise<void> {
    await this.ctrl.reload();
    await this.ctrl.loadFormLists();
  }

  openCreate(): void {
    this.editing.set(null);
    this.saveError.set('');
    this.showForm.set(true);
  }

  openEdit(c: Courrier): void {
    this.editing.set(c);
    this.saveError.set('');
    this.showForm.set(true);
  }

  async onSubmitted(draft: Parameters<CourriersController['save']>[0]): Promise<void> {
    const err = await this.ctrl.save(draft, this.editing()?.id ?? null);
    if (err) {
      this.saveError.set(err);
      return;
    }
    this.saveError.set('');
    this.showForm.set(false);
    this.editing.set(null);
  }

  async remove(c: Courrier): Promise<boolean> {
    if (!confirm('هل أنت متأكد من حذف هذه المراسلة ؟')) return false;
    const err = await this.ctrl.remove(c);
    if (err) { alert(err); return false; }
    return true;
  }

  async removeDetails(): Promise<void> {
    const c = this.details();
    if (!c) return;
    if (await this.remove(c)) this.details.set(null);
  }
}
