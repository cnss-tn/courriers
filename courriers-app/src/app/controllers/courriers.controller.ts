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
  CourrierValidationScope,
  formatSeq,
  validateCourrierDraft,
} from '../models/courrier.model';
import { UserType } from '../models/user.model';

// CONTROLLER — seul endroit autorisé à orchestrer les données des courriers.
// Les vues se contentent de lire ces signals et d'appeler ces méthodes.

/** Clés de tri du registre (une par colonne de données, comme l'app campagnes). */
type CourrierSortKey =
  | 'seq' | 'dateArrivee' | 'source' | 'typePartie' | 'identitePartie'
  | 'objet' | 'destinataire' | 'dateReception' | 'ihalaIla' | 'reponseRecue'
  | 'dateReponseRecue' | 'reponseFinale' | 'dateReponseFinale' | 'jihaReponse' | 'status';

const SORT_GETTERS: Record<CourrierSortKey, (c: Courrier) => string | number> = {
  seq: (c) => c.seq,
  dateArrivee: (c) => c.dateArrivee || '',
  source: (c) => c.source || '',
  typePartie: (c) => c.typePartie || '',
  identitePartie: (c) => c.identitePartie || '',
  objet: (c) => c.objet || '',
  destinataire: (c) => c.destinataire || '',
  dateReception: (c) => c.dateReception || '',
  ihalaIla: (c) => c.ihalaIla || '',
  reponseRecue: (c) => c.reponseRecue || '',
  dateReponseRecue: (c) => c.dateReponseRecue || '',
  reponseFinale: (c) => c.reponseFinale || '',
  dateReponseFinale: (c) => c.dateReponseFinale || '',
  jihaReponse: (c) => c.jihaReponse || '',
  status: (c) => c.status || '',
};

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

  readonly pageSize = 5;

  // --- rôle (secrétariat = saisie, interne = traitement des réponses) ---
  readonly role = computed<UserType>(() => this.auth.currentUser()?.type ?? 'internal');
  readonly isSecretariat = computed(() => this.role() === 'secretariat');
  readonly isInternal = computed(() => this.role() === 'internal');
  /** Champs validés / modifiables selon le rôle. */
  readonly fieldScope = computed<CourrierValidationScope>(() =>
    this.isInternal() ? 'response' : 'base',
  );

  // --- état ---
  readonly all = signal<Courrier[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  /** Id du dernier courrier créé/modifié (pour naviguer vers sa page). */
  readonly lastSavedId = signal<string | null>(null);
  /** Échec non bloquant des listes déroulantes (n'empêche pas l'affichage du tableau). */
  readonly listsError = signal('');

  // --- filtres (UI state piloté par le contrôleur) ---
  readonly fStatus = signal<string>('');
  readonly fSearch = signal('');
  readonly fSource = signal('');
  readonly fDestinataire = signal('');
  readonly fReponse = signal<'' | 'نعم' | 'لا'>('');
  readonly fYear = signal('');
  readonly fMonthArrivee = signal('');
  readonly fMonthReception = signal('');
  readonly page = signal(1);
  /** Tri du registre (comme campagnes : clic = croissant, re-clic = inverse, retour page 1). */
  readonly sortKey = signal<CourrierSortKey>('seq');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  /** Colonnes triables : source unique des en-têtes du tableau (إجراءات exclu). */
  readonly sortColumns: Array<{ key: CourrierSortKey; label: string }> = [
    { key: 'seq', label: 'الرقم' },
    { key: 'dateArrivee', label: 'تاريخ الوصول' },
    { key: 'source', label: 'المصدر' },
    { key: 'typePartie', label: 'نوع الطرف المعني' },
    { key: 'identitePartie', label: 'هوية الطرف المعني' },
    { key: 'objet', label: 'الموضوع' },
    { key: 'destinataire', label: 'الموجَّه إليه' },
    { key: 'dateReception', label: 'تاريخ الاستلام' },
    { key: 'ihalaIla', label: 'إحالة إلى' },
    { key: 'reponseRecue', label: 'الإجابة الواردة' },
    { key: 'dateReponseRecue', label: 'تاريخ الإجابة الواردة' },
    { key: 'reponseFinale', label: 'الرد النهائي' },
    { key: 'dateReponseFinale', label: 'تاريخ الرد النهائي' },
    { key: 'jihaReponse', label: 'جهة الرد النهائي' },
    { key: 'status', label: 'وضعية المراسلة' },
  ];
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
  /** Vrai si le courrier est adressé à l'utilisateur connecté (matricule en tête). */
  private isAddressedToMe(c: Courrier): boolean {
    const u = this.auth.currentUser();
    const mat = String(u?.matricule ?? '').trim();
    if (!mat) return false;
    const dest = String(c.destinataire || '').trim();
    const first = dest.split(/\s+/)[0];
    if (first === mat) return true;
    // Repli : doc sans matricule, nom arabe seul.
    const ar = String(u?.arName || '').trim();
    return !!ar && dest === ar;
  }

  /** Périmètre visible : un interne ne voit que les courriers qui lui sont adressés. */
  readonly scoped = computed(() =>
    this.isInternal() ? this.all().filter((c) => this.isAddressedToMe(c)) : this.all(),
  );

  readonly filtered = computed(() => {
    const q = this.fSearch().trim().toLowerCase();
    return this.scoped().filter((c) => {
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
      if (this.fStatus() && c.status !== this.fStatus()) return false;
      if (this.fMonthReception() && (c.dateReception || '').slice(5, 7) !== monthNum(this.fMonthReception())) return false;
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  readonly slice = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.sorted().slice(start, start + this.pageSize);
  });

  /** Lignes filtrées puis triées (le tri ne change pas le nombre de résultats). */
  readonly sorted = computed(() => {
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const get = SORT_GETTERS[this.sortKey()];
    return [...this.filtered()].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'ar') * dir;
    });
  });

  /** Clic sur un en-tête : même colonne = inverse, autre colonne = croissant. */
  toggleSort(key: CourrierSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  /** Indicateur ▼/▲ comme l'app campagnes (▼ = croissant, ▲ = décroissant). */
  sortIcon(key: CourrierSortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▼' : '▲';
  }

  readonly years = computed(() =>
    [...new Set(this.scoped().map((c) => (c.dateArrivee || '').slice(0, 4)).filter(Boolean))]
      .sort()
      .reverse(),
  );

  // --- chargement ---
  /**
   * Recharge la liste. `silent` : pas d'écran de chargement (rafraîchissement
   * après une sauvegarde) — le tableau reste affiché et se met à jour ensuite.
   */
  async reload(silent = false): Promise<void> {
    if (!silent) this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.courriers.list());
      // Une suppression peut faire disparaître la page courante : la replier si besoin.
      if (this.page() > this.totalPages()) this.page.set(this.totalPages());
    } catch {
      if (!silent) {
        this.error.set(
          typeof navigator !== 'undefined' && navigator.onLine === false
            ? 'لا يوجد اتصال بالإنترنت'
            : 'تعذر تحميل المراسلات',
        );
      }
    } finally {
      if (!silent) this.loading.set(false);
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
    status?: string;
  }): void {
    if (patch.search !== undefined) this.fSearch.set(patch.search);
    if (patch.source !== undefined) this.fSource.set(patch.source);
    if (patch.destinataire !== undefined) this.fDestinataire.set(patch.destinataire);
    if (patch.reponse !== undefined) this.fReponse.set(patch.reponse);
    if (patch.year !== undefined) this.fYear.set(patch.year);
    if (patch.monthArrivee !== undefined) this.fMonthArrivee.set(patch.monthArrivee);
    if (patch.monthReception !== undefined) this.fMonthReception.set(patch.monthReception);
    if (patch.status !== undefined) this.fStatus.set(patch.status);
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
    this.fStatus.set('');
    // page stays on current page (user request)
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
    if (!editingId && !this.isSecretariat()) return 'غير مصرح بإضافة المراسلات';
    if (this.isInternal() && editingId) {
      const target = this.all().find((c) => c.id === editingId);
      if (target && !this.isAddressedToMe(target)) return 'غير مصرح بتعديل هذه المراسلة';
    }
    const errors = validateCourrierDraft(draft, this.fieldScope());
    if (errors.length) return errors[0];
    const base = {
      dateArrivee: draft.dateArrivee,
      source: draft.source.trim(),
      typePartie: draft.typePartie.trim(),
      identitePartie: draft.identitePartie.trim(),
      objet: draft.objet.trim(),
      destinataire: draft.destinataire.trim(),
      dateReception: draft.dateReception,
      ihalaIla: (draft.ihalaIla || '').trim(),
    };
    const response = {
      reponseRecue: draft.reponseRecue,
      dateReponseRecue: draft.dateReponseRecue || '',
      reponseFinale: (draft.reponseFinale || '').trim(),
      dateReponseFinale: draft.dateReponseFinale || '',
      jihaReponse: (draft.jihaReponse || '').trim(),
      status: draft.status || 'في طور الانجاز',
    };
    const status = draft.status || 'في طور الانجاز';
    const baseWithStatus = { ...base, status };
    try {
      if (editingId) {
        const patch = this.isInternal() ? { ...response, status } : baseWithStatus;
        await this.courriers.update(editingId, patch);
        this.lastSavedId.set(editingId);
      } else {
        const created = await this.courriers.create({
          ...baseWithStatus,
          ...response,
          createdBy: this.auth.currentUser()?.matricule || '',
        });
        this.lastSavedId.set(created.id ?? null);
      }
      // Attendu par la vue : la liste est à jour quand save() résout, ce qui
      // permet de naviguer vers la page contenant le courrier enregistré.
      await this.reload(true);
      return null;
    } catch {
      return 'خطأ أثناء التسجيل — حاول مجدداً';
    }
  }

  async remove(c: Courrier): Promise<string | null> {
    if (!this.isSecretariat()) return 'غير مصرح بحذف المراسلات';
    if (!c.id) return 'معرف غير صالح';
    try {
      await this.courriers.remove(c.id);
      await this.reload(true);
      // Après suppression : réinitialise les filtres pour afficher les courriers restants.
      this.resetFilters();
      return null;
    } catch {
      return 'تعذر حذف المراسلة';
    }
  }

  // --- exports (données brutes, le composant export-buttons s'occupe du format) ---
  exportHeaders(): string[] {
    return this.sortColumns.map((c) => c.label);
  }

  exportRows(): string[][] {
    return this.sorted().map((c) => [
      formatSeq(c.seq), c.dateArrivee, c.source, c.typePartie, c.identitePartie, c.objet,
      c.destinataire, c.dateReception, c.ihalaIla, c.reponseRecue, c.dateReponseRecue,
      c.reponseFinale, c.dateReponseFinale, c.jihaReponse, c.status || '',
    ]);
  }
}
