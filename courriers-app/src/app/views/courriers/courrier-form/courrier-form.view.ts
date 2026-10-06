import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
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
export class CourrierFormView implements OnInit {
  @Input() courrier: Courrier | null = null;
  @Input() serverError = '';
  @Output() submitted = new EventEmitter<CourrierDraft>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  protected ctrl = inject(CourriersController);

  form!: FormGroup;
  clientError = signal('');
  saving = signal(false);

  readonly reponseOptions = ['لا', 'نعم'];

  get isEdit(): boolean {
    return !!this.courrier?.id;
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const d = this.courrier ? courrierToDraft(this.courrier) : blankCourrierDraft(today);
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
    });
    void this.ctrl.loadFormLists();
  }

  async onNewRef(kind: 'source' | 'partie_type' | 'ihala', value: string): Promise<void> {
    const saved = await this.ctrl.addRef(kind, value);
    if (kind === 'source') this.form.patchValue({ source: saved });
    else if (kind === 'partie_type') this.form.patchValue({ typePartie: saved });
    else this.form.patchValue({ ihalaIla: saved });
  }

  submit(): void {
    const draft = this.form.value as CourrierDraft;
    const errors = validateCourrierDraft(draft); // validation = MODEL
    if (errors.length) {
      this.clientError.set(errors[0]);
      return;
    }
    this.clientError.set('');
    this.saving.set(true);
    this.submitted.emit(draft);
    // Le parent ferme le popup après sauvegarde ; on réactive le bouton
    // au prochain submit (le composant est recréé à chaque ouverture).
  }
}
