import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CourriersController } from '../../../controllers/courriers.controller';
import {
  Courrier,
  CourrierDraft,
  blankCourrierDraft,
  courrierToDraft,
  validateCourrierDraft,
} from '../../../models/courrier.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select';
import { DateInputComponent } from '../../../shared/components/date-input/date-input';
import { DropdownComponent } from '../../../shared/components/dropdown/dropdown';
import { AutogrowDirective } from '../../../shared/directives/autogrow.directive';

// VIEW — formulaire مراسلة : affiche, valide (règles du MODEL), émet.
// Ne persiste jamais rien : c'est le contrôleur qui sauvegarde.
@Component({
  selector: 'app-courrier-form',
  standalone: true,
  imports: [ReactiveFormsModule, CustomSelectComponent, DropdownComponent, DateInputComponent, AutogrowDirective],
  templateUrl: './courrier-form.view.html',
  styleUrl: './courrier-form.view.css',
})
export class CourrierFormView implements OnInit, OnChanges {
  @Input() courrier: Courrier | null = null;
  /** Brouillon à restaurer après un échec d'enregistrement (ne rien perdre). */
  @Input() restoreDraft: CourrierDraft | null = null;
  @Input() serverError = '';
  @Output() submitted = new EventEmitter<CourrierDraft>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  protected ctrl = inject(CourriersController);

  form!: FormGroup;
  clientError = signal('');
  saving = signal(false);
  @ViewChild('alertBox') private alertBox?: ElementRef<HTMLElement>;

  readonly reponseOptions = ['لا', 'نعم'];

  get isEdit(): boolean {
    return !!this.courrier?.id;
  }

  /** Champs d'identification/réception figés pour un utilisateur interne. */
  get baseDisabled(): boolean {
    return this.ctrl.isInternal();
  }

  /** Champs de réponse figés pour le secrétariat. */
  get responseDisabled(): boolean {
    return this.ctrl.isSecretariat();
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const d = this.restoreDraft
      ? { ...this.restoreDraft }
      : this.courrier
        ? courrierToDraft(this.courrier)
        : blankCourrierDraft(today);
    this.form = this.fb.group({
      dateArrivee: [d.dateArrivee],
      source: [d.source],
      typePartie: [d.typePartie],
      identitePartie: [d.identitePartie],
      objet: [d.objet],
      destinataire: [d.destinataire],
      dateReception: [d.dateReception],
      ihalaIla: [d.ihalaIla],
      reponseRecue: [d.reponseRecue],
      dateReponseRecue: [d.dateReponseRecue],
      reponseFinale: [d.reponseFinale],
      dateReponseFinale: [d.dateReponseFinale],
      jihaReponse: [d.jihaReponse],
      status: [d.status || 'في طور الانجاز'],
    });
    // Verrouille les champs hors périmètre du rôle (valeurs conservées via getRawValue).
    const locked = this.baseDisabled
      ? ['dateArrivee', 'source', 'typePartie', 'identitePartie', 'objet', 'destinataire', 'dateReception', 'ihalaIla']
      : ['reponseRecue', 'dateReponseRecue', 'reponseFinale', 'dateReponseFinale', 'jihaReponse'];
    for (const key of locked) this.form.get(key)?.disable({ emitEvent: false });
    void this.ctrl.loadFormLists();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverError']?.currentValue) {
      this.saving.set(false); // réactive le bouton (le popup reste ouvert sur erreur)
      this.scrollToAlert();
    }
  }

  /** Fait défiler le popup jusqu'au message d'alerte dès son apparition. */
  private scrollToAlert(): void {
    setTimeout(
      () => this.alertBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      0,
    );
  }

  async onNewRef(kind: 'source' | 'partie_type' | 'ihala', value: string): Promise<void> {
    const saved = await this.ctrl.addRef(kind, value);
    if (kind === 'source') this.form.patchValue({ source: saved });
    else if (kind === 'partie_type') this.form.patchValue({ typePartie: saved });
    else this.form.patchValue({ ihalaIla: saved });
  }

  /**
   * الإجابة الواردة : si «لا», aucune date de réponse ne peut exister.
   * La date est vidée (placeholder اختر...) et le reste même si l'on repasse
   * à «نعم» : l'utilisateur doit saisir la vraie date.
   */
  onReponseRecueChange(value: unknown): void {
    const v = String(value ?? '');
    this.form.patchValue({ reponseRecue: v });
    if (v !== 'نعم') this.form.patchValue({ dateReponseRecue: '' });
  }

  submit(): void {
    const draft = this.form.getRawValue() as CourrierDraft;
    const errors = validateCourrierDraft(draft, this.ctrl.fieldScope()); // validation = MODEL
    if (errors.length) {
      this.clientError.set(errors[0]);
      this.scrollToAlert();
      return;
    }
    this.clientError.set('');
    this.saving.set(true);
    this.submitted.emit(draft);
    // Le parent ferme le popup après sauvegarde ; on réactive le bouton
    // au prochain submit (le composant est recréé à chaque ouverture).
  }
}
