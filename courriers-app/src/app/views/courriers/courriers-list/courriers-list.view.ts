import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourriersController } from '../../../controllers/courriers.controller';
import { Courrier, CourrierDraft, formatSeq } from '../../../models/courrier.model';
import { ExportButtonsComponent } from '../../../shared/components/export-buttons/export-buttons';
import { DropdownComponent } from '../../../shared/components/dropdown/dropdown';
import { LoaderComponent } from '../../../shared/components/loader/loader';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PopupModalComponent } from '../../../shared/components/popup-modal/popup-modal';
import { CourrierFormView } from '../courrier-form/courrier-form.view';
import { AuthService } from '../../../core/auth.service';

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
  ],
  templateUrl: './courriers-list.view.html',
  styleUrl: './courriers-list.view.css',
})
export class CourriersListView implements OnInit {
  protected ctrl = inject(CourriersController);
  protected auth = inject(AuthService);

  showForm = signal(false);
  editing = signal<Courrier | null>(null);
  saveError = signal('');
  /** Valeurs saisies à restaurer si l'enregistrement échoue après fermeture. */
  restoreDraft = signal<CourrierDraft | null>(null);
  /** Évite qu'une sauvegarde lente rouvre/ferme un popup ouvert entre-temps. */
  private saveToken = 0;

  /** Options du champ رد نهائي. */
  readonly reponseOptions = ['نعم', 'لا'];
  protected readonly fmtSeq = formatSeq;

  /** Sonde invisible (même police que les toggles des filtres) pour mesurer les options. */
  @ViewChild('fitProbe') private fitProbe?: ElementRef<HTMLElement>;

  /** Conteneur défilant du tableau (détection de fin de défilement horizontal). */
  @ViewChild('tableScroll') private tableScroll?: ElementRef<HTMLElement>;

  /** Vrai quand le défilement horizontal est au bout : l'ombre de la colonne figée n'est plus utile. */
  tableAtEnd = signal(false);

  onTableScroll(e: Event): void {
    const el = e.target as HTMLElement;
    const max = el.scrollWidth - el.clientWidth;
    this.tableAtEnd.set(max <= 0 || Math.abs(el.scrollLeft) >= max - 1);
  }

  private syncTableEdge(): void {
    const el = this.tableScroll?.nativeElement;
    if (!el || !el.querySelector('table')) return;
    const max = el.scrollWidth - el.clientWidth;
    this.tableAtEnd.set(max <= 0 || Math.abs(el.scrollLeft) >= max - 1);
  }

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
    setTimeout(() => this.syncTableEdge());
  }

  openCreate(): void {
    this.saveToken++;
    this.restoreDraft.set(null);
    this.editing.set(null);
    this.saveError.set('');
    this.showForm.set(true);
  }

  openEdit(c: Courrier): void {
    this.saveToken++;
    this.restoreDraft.set(null);
    this.editing.set(c);
    this.saveError.set('');
    this.showForm.set(true);
  }

  async onSubmitted(draft: CourrierDraft): Promise<void> {
    const token = ++this.saveToken;
    const id = this.editing()?.id ?? null;
    const edited = this.editing();
    this.saveError.set('');

    // L'écriture démarre tout de suite (l'utilisateur voit le spinner du bouton),
    // mais le popup reste ~0,25 s de plus pour rendre l'action perceptible.
    const saving = this.ctrl.save(draft, id);
    let settled = false;
    let settledErr: string | null = null;
    void saving.then((e) => { settled = true; settledErr = e; }, () => { settled = true; settledErr = 'خطأ أثناء التسجيل'; });

    await new Promise<void>((r) => setTimeout(r, 260));
    if (token !== this.saveToken) return; // un autre formulaire a été ouvert entre-temps

    // Échec déjà connu : on garde le popup ouvert avec le message.
    if (settled && settledErr) {
      this.saveError.set(settledErr);
      return;
    }

    // Fermeture : l'écriture Firestore continue derrière (si encore en cours).
    this.showForm.set(false);
    this.editing.set(null);
    if (!settled) {
      const err = await saving;
      if (token !== this.saveToken) return;
      if (err) {
        // Échec : on rouvre avec les valeurs saisies et le message d'erreur.
        this.restoreDraft.set({ ...draft });
        this.editing.set(edited);
        this.saveError.set(err);
        this.showForm.set(true);
        return;
      }
    }
    this.restoreDraft.set(null);
    // Se placer sur la page où se trouve le courrier qui vient d'être enregistré.
    this.focusSavedCourrier(this.ctrl.lastSavedId());
  }

  /** Affiche la page contenant le courrier `id`, fait défiler jusqu'à sa ligne et la met en évidence. */
  private focusSavedCourrier(id: string | null): void {
    if (!id) return;
    let index = this.ctrl.sorted().findIndex((c) => c.id === id);
    if (index < 0) {
      // Masqué par un filtre actif : on les efface pour pouvoir le montrer.
      this.ctrl.resetFilters();
      index = this.ctrl.sorted().findIndex((c) => c.id === id);
    }
    if (index < 0) return; // hors périmètre du rôle
    this.ctrl.goTo(Math.floor(index / this.ctrl.pageSize) + 1);
    // Laisse le temps à la page de se rendre avant de cibler la ligne.
    setTimeout(() => this.revealRow(id), 80);
  }

  private revealRow(id: string): void {
    const row = document.querySelector<HTMLElement>(
      `app-courriers-list tr.courrier-row[data-id="${id}"]`,
    );
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('row-flash');
    setTimeout(() => row.classList.remove('row-flash'), 1600);
  }

  async remove(c: Courrier): Promise<boolean> {
    if (!confirm('هل أنت متأكد من حذف هذه المراسلة ؟')) return false;
    const err = await this.ctrl.remove(c);
    if (err) { alert(err); return false; }
    return true;
  }
}
