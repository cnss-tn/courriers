import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourriersController } from '../../../controllers/courriers.controller';
import { Courrier } from '../../../models/courrier.model';
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

  async ngOnInit(): Promise<void> {
    await this.ctrl.reload();
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

  async remove(c: Courrier): Promise<void> {
    if (!confirm(`هل أنت متأكد من حذف المراسلة رقم ${c.seq} ؟`)) return;
    const err = await this.ctrl.remove(c);
    if (err) alert(err);
  }
}
