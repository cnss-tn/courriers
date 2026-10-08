import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { CourriersService } from '../core/courriers.service';
import { SourcesService } from '../core/sources.service';
import { RecipientsService } from '../core/recipients.service';
import { RelevantPartTypesService } from '../core/relevant-part-types.service';
import {
  ARCHIVE_DESTINATAIRE,
  Courrier,
  CourrierDraft,
  formatSeq,
  validateCourrierDraft,
} from '../models/courrier.model';

// CONTROLLER — seul endroit autorisé à orchestrer les données des courriers.
// Les vues se contentent de lire ces signals et d'appeler ces méthodes.

/** Mois (noms tunisiens) pour les filtres شهر تاريخ الوصول / شهر تاريخ الاستلام. */
const MONTHS: Array<{ n: string; label: string }> = [
  { n: '01', label: 'جانفي' },
  { n: '02', label: 'فيفري' },
  { n: '03', label: 'مارس' },
  { n: '04', label: 'أفريل' },
  { n: '05', label: 'ماي' },
  { n: '06', label: 'جوان' },
  { n: '07', label: 'جويلية' },
  { n: '08', label: 'أوت' },
  { n: '09', label: 'سبتمبر' },
  { n: '10', label: 'أكتوبر' },
  { n: '11', label: 'نوفمبر' },
  { n: '12', label: 'ديسمبر' },
];

/** Libellé du mois → '01'..'12' ('' si inconnu/vide). */
function monthNum(label: string): string {
  return MONTHS.find((m) => m.label === label)?.n ?? '';
}
@Injectable({ providedIn: 'root' })
export class CourriersController {
  private courriers = inject(CourriersService);
  private partTypes = inject(RelevantPartTypesService);
  private sourcesService = inject(SourcesService);
  private recipients = inject(RecipientsService);
  private auth = inject(AuthService);

  readonly pageSize = 6;

  // --- état ---
  readonly all = signal<Courrier[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  /** Échec non bloquant des listes déroulantes (n'empêche pas l'affichage du tableau). */
  readonly listsError = signal('');

  // --- filtres (UI state piloté par le contrôleur) ---
  readonly fSearch = signal('');
  readonly fSource = signal('');
  readonly fDestinataire = signal('');
  readonly fReponse = signal<'' | 'نعم' | 'لا'>('');
  readonly fYear = signal('');
  readonly fMonthArrivee = signal('');
  readonly fMonthReception = signal('');
  readonly page = signal(1);
  /** Libellés des mois pour les dropdowns des filtres. */
  readonly monthLabels = MONTHS.map((m) => m.label);

  // --- listes pour le formulaire ---
  readonly refSources = signal<string[]>([]);
  /** Code br/dir par nom de source (badge + recherche par code). */
  readonly refSourcesMeta = signal<Record<string, string>>({});
  readonly refPartieTypes = signal<string[]>([]);
  readonly refIhala = signal<string[]>([]);
  readonly destinataireOptions = signal<string[]>([]);

  // --- dérivés ---
  readonly filtered = computed(() => {
    const q = this.fSearch().trim().toLowerCase();
    return this.all().filter((c) => {
      if (
        q &&
        // بحث في : الرقم / هوية الطرف المعني / الموضوع / الرد النهائي / جهة الرد النهائي
        ![String(c.seq), c.identitePartie, c.objet, c.reponseFinale, c.jihaReponse].some((v) =>
          String(v || '').toLowerCase().includes(q),
        )
      )
        return false;
      if (this.fSource() && c.source !== this.fSource()) return false;
      if (this.fDestinataire() && c.destinataire !== this.fDestinataire()) return false;
      if (this.fReponse() && c.reponseRecue !== this.fReponse()) return false;
      if (this.fYear() && (c.dateArrivee || '').slice(0, 4) !== this.fYear()) return false;
      if (this.fMonthArrivee() && (c.dateArrivee || '').slice(5, 7) !== monthNum(this.fMonthArrivee())) return false;
      if (this.fMonthReception() && (c.dateReception || '').slice(5, 7) !== monthNum(this.fMonthReception())) return false;
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

  // --- chargement ---
  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.courriers.list());
      // Une suppression peut faire disparaître la page courante : la replier si besoin.
      if (this.page() > this.totalPages()) this.page.set(this.totalPages());
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
    this.listsError.set('');
    try {
      const [src, t, dests] = await Promise.all([
        this.sourcesService.listWithCodes(),
        this.partTypes.list(),
        this.recipients.list(),
      ]);
      this.refSources.set(src.map((x) => x.name));
      this.refSourcesMeta.set(Object.fromEntries(src.map((x) => [x.name, x.code] as const)));
      this.refPartieTypes.set(t);
      // إحالة إلى suit les valeurs de la table sources (comme المصدر)
      this.refIhala.set(src.map((x) => x.name));
      // Destinataires = table `recipients` « matricule + nom arabe » (ex. 126359 أحمد الزكراوي) + « الأرشيف » en dernier
      this.destinataireOptions.set([
        ...dests.map((u) => `${String(u.matricule).trim()} ${(u.arName || u.frName).trim()}`.trim()),
        ARCHIVE_DESTINATAIRE,
      ]);
    } catch {
      this.listsError.set('تعذر تحميل القوائم');
    }
  }

  // --- filtres ---
  setFilter(patch: {
    search?: string;
    source?: string;
    destinataire?: string;
    reponse?: '' | 'نعم' | 'لا';
    year?: string;
    monthArrivee?: string;
    monthReception?: string;
  }): void {
    if (patch.search !== undefined) this.fSearch.set(patch.search);
    if (patch.source !== undefined) this.fSource.set(patch.source);
    if (patch.destinataire !== undefined) this.fDestinataire.set(patch.destinataire);
    if (patch.reponse !== undefined) this.fReponse.set(patch.reponse);
    if (patch.year !== undefined) this.fYear.set(patch.year);
    if (patch.monthArrivee !== undefined) this.fMonthArrivee.set(patch.monthArrivee);
    if (patch.monthReception !== undefined) this.fMonthReception.set(patch.monthReception);
    this.page.set(1);
  }

  resetFilters(): void {
    this.fSearch.set('');
    this.fSource.set('');
    this.fDestinataire.set('');
    this.fReponse.set('');
    this.fYear.set('');
    this.fMonthArrivee.set('');
    this.fMonthReception.set('');
    this.page.set(1);
  }

  goTo(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  /** Valeur saisie via « + جديد » : utilisée telle quelle, jamais persistée en base. */
  async addRef(kind: 'source' | 'partie_type' | 'ihala', value: string): Promise<string> {
    return String(value || '').trim();
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
      // Après suppression : réinitialise les filtres pour afficher les courriers restants.
      this.resetFilters();
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
      formatSeq(c.seq), c.dateArrivee, c.source, c.typePartie, c.identitePartie, c.objet,
      c.destinataire, c.dateReception, c.ihalaIla, c.reponseRecue, c.dateReponseRecue,
      c.reponseFinale, c.dateReponseFinale, c.jihaReponse,
    ]);
  }
}
