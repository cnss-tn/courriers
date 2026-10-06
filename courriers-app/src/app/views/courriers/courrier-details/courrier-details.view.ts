import { Component, Input } from '@angular/core';
import { Courrier } from '../../../models/courrier.model';

// VIEW — fiche détail en lecture seule (aucune logique).
@Component({
  selector: 'app-courrier-details',
  standalone: true,
  templateUrl: './courrier-details.view.html',
})
export class CourrierDetailsView {
  @Input({ required: true }) courrier!: Courrier;

  rows(): Array<[string, string]> {
    const c = this.courrier;
    return [
      ['التسلسل الرقمي', `#${c.seq}`],
      ['تاريخ الوصول', c.dateArrivee],
      ['المصدر', c.source],
      ['نوع الطرف المعني', c.typePartie],
      ['هوية الطرف المعني', c.identitePartie],
      ['الموضوع', c.objet],
      ['الموجَّه إليه', c.destinataire],
      ['تاريخ الاستلام', c.dateReception],
      ['إحالة إلى', c.ihalaIla || '—'],
      ['تم تلقي رد؟', c.reponseRecue],
      ['تاريخ الرد المستلم', c.dateReponseRecue || '—'],
      ['الرد النهائي على المراسلة', c.reponseFinale || '—'],
      ['تاريخ الرد النهائي', c.dateReponseFinale || '—'],
      ['الجهة الموجه لها الرد النهائي', c.jihaReponse || '—'],
    ];
  }
}
