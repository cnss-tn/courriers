import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { CourriersService } from '../core/courriers.service';
import { ReferentielsService } from '../core/referentiels.service';
import { UsersService } from '../core/users.service';
import {
  ARCHIVE_DESTINATAIRE,
  Courrier,
  CourrierDraft,
  validateCourrierDraft,
} from '../models/courrier.model';
import { ReferentielType } from '../models/referentiel.model';

// CONTROLLER — seul endroit autorisé à orchestrer les données des courriers.
// Les vues se contentent de lire ces signals et d'appeler ces méthodes.
@Injectable({ providedIn: 'root' })
export class CourriersController {
  private courriers = inject(CourriersService);
  private refs = inject(ReferentielsService);
  private users = inject(UsersService);
  private auth = inject(AuthService);

  readonly pageSize = 8;

  // --- état ---
  readonly all = signal<Courrier[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  // --- filtres (UI state piloté par le contrôleur) ---
  readonly fSearch = signal('');
  readonly fSource = signal('');
  readonly fDestinataire = signal('');
  readonly fReponse = signal<'' | 'نعم' | 'لا'>('');
  readonly fYear = signal('');
  readonly page = signal(1);

  // --- listes pour le formulaire ---
  readonly refSources = signal<string[]>([]);
  readonly refPartieTypes = signal<string[]>([]);
  readonly refIhala = signal<string[]>([]);
  readonly destinataireOptions = signal<string[]>([]);

  // --- dérivés ---
  readonly filtered = computed(() => {
    const q = this.fSearch().trim().toLowerCase();
    return this.all().filter((c) => {
      if (
        q &&
        ![c.objet, c.identitePartie, c.typePartie, c.source, String(c.seq)].some((v) =>
          String(v || '').toLowerCase().includes(q),
        )
      )
        return false;
      if (this.fSource() && c.source !== this.fSource()) return false;
      if (this.fDestinataire() && c.destinataire !== this.fDestinataire()) return false;
      if (this.fReponse() && c.reponseRecue !== this.fReponse()) return false;
      if (this.fYear() && (c.dateArrivee || '').slice(0, 4) !== this.fYear()) return false;
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  readonly slice = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  readonly years = computed(() =>
    [...new Set(this.all().map((c) => (c.dateArrivee || '').slice(0, 4)).filter(Boolean))]
      .sort()
      .reverse(),
  );

  readonly sources = computed(() =>
    [...new Set(this.all().map((c) => c.source).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ar'),
    ),
  );

  readonly destinataires = computed(() =>
    [...new Set(this.all().map((c) => c.destinataire).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ar'),
    ),
  );

  // --- chargement ---
  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.courriers.list());
    } catch {
      this.error.set(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'لا يوجد اتصال بالإنترنت'
          : 'تعذر تحميل المراسلات',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loadFormLists(): Promise<void> {
    try {
      const [s, t, h, ctrls] = await Promise.all([
        this.refs.list('source'),
        this.refs.list('partie_type'),
        this.refs.list('ihala'),
        this.users.controleurs(),
      ]);
      this.refSources.set(s);
      this.refPartieTypes.set(t);
      this.refIhala.set(h);
      // Destinataires = contrôleurs + « Archive » toujours en dernier
      this.destinataireOptions.set([
        ...ctrls.map((u) => `${(u.arName || u.frName).trim()} (${u.matricule})`),
        ARCHIVE_DESTINATAIRE,
      ]);
    } catch {
      this.error.set('تعذر تحميل القوائم');
    }
  }

  // --- filtres ---
  setFilter(patch: {
    search?: string;
    source?: string;
    destinataire?: string;
    reponse?: '' | 'نعم' | 'لا';
    year?: string;
  }): void {
    if (patch.search !== undefined) this.fSearch.set(patch.search);
    if (patch.source !== undefined) this.fSource.set(patch.source);
    if (patch.destinataire !== undefined) this.fDestinataire.set(patch.destinataire);
    if (patch.reponse !== undefined) this.fReponse.set(patch.reponse);
    if (patch.year !== undefined) this.fYear.set(patch.year);
    this.page.set(1);
  }

  resetFilters(): void {
    this.fSearch.set('');
    this.fSource.set('');
    this.fDestinataire.set('');
    this.fReponse.set('');
    this.fYear.set('');
    this.page.set(1);
  }

  goTo(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  /** Persiste une valeur de référentiel saisie via « + جديد », retourne la valeur. */
  async addRef(kind: ReferentielType, value: string): Promise<string> {
    const saved = await this.refs.addIfNew(kind, value);
    if (kind === 'source') this.refSources.set(await this.refs.list('source'));
    else if (kind === 'partie_type') this.refPartieTypes.set(await this.refs.list('partie_type'));
    else this.refIhala.set(await this.refs.list('ihala'));
    return saved;
  }

  /**
   * Crée ou met à jour une مراسلة.
   * @returns message d'erreur (arabe) ou null si succès.
   */
  async save(draft: CourrierDraft, editingId: string | null): Promise<string | null> {
    const errors = validateCourrierDraft(draft);
    if (errors.length) return errors[0];
    try {
      const payload = {
        dateArrivee: draft.dateArrivee,
        source: draft.source.trim(),
        typePartie: draft.typePartie.trim(),
        identitePartie: draft.identitePartie.trim(),
        objet: draft.objet.trim(),
        destinataire: draft.destinataire.trim(),
        dateReception: draft.dateReception,
        ihalaIla: (draft.ihalaIla || '').trim(),
        reponseRecue: draft.reponseRecue,
        dateReponseRecue: draft.dateReponseRecue || '',
        reponseFinale: (draft.reponseFinale || '').trim(),
        dateReponseFinale: draft.dateReponseFinale || '',
        jihaReponse: (draft.jihaReponse || '').trim(),
      };
      await Promise.all([
        this.refs.addIfNew('source', payload.source),
        this.refs.addIfNew('partie_type', payload.typePartie),
        payload.ihalaIla ? this.refs.addIfNew('ihala', payload.ihalaIla) : Promise.resolve(''),
      ]);
      if (editingId) {
        await this.courriers.update(editingId, payload);
      } else {
        await this.courriers.create({
          ...payload,
          createdBy: this.auth.currentUser()?.matricule || '',
        });
      }
      await this.reload();
      return null;
    } catch {
      return 'خطأ أثناء التسجيل — حاول مجدداً';
    }
  }

  async remove(c: Courrier): Promise<string | null> {
    if (!c.id) return 'معرف غير صالح';
    try {
      await this.courriers.remove(c.id);
      await this.reload();
      return null;
    } catch {
      return 'تعذر حذف المراسلة';
    }
  }

  // --- exports (données brutes, le composant export-buttons s'occupe du format) ---
  exportHeaders(): string[] {
    return [
      'الرقم', 'تاريخ الوصول', 'المصدر', 'نوع الطرف المعني', 'هوية الطرف المعني',
      'الموضوع', 'الموجَّه إليه', 'تاريخ الاستلام', 'إحالة إلى', 'الإجابة الواردة',
      'تاريخ الإجابة الواردة', 'الرد النهائي', 'تاريخ الرد النهائي', 'جهة الرد النهائي',
    ];
  }

  exportRows(): string[][] {
    return this.filtered().map((c) => [
      String(c.seq), c.dateArrivee, c.source, c.typePartie, c.identitePartie, c.objet,
      c.destinataire, c.dateReception, c.ihalaIla, c.reponseRecue, c.dateReponseRecue,
      c.reponseFinale, c.dateReponseFinale, c.jihaReponse,
    ]);
  }
}
