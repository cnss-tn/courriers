import { Component, Input } from '@angular/core';
import { Courrier, formatSeq } from '../../../models/courrier.model';

// VIEW — fiche détail en lecture seule (aucune logique).
@Component({
  selector: 'app-courrier-details',
  standalone: true,
  templateUrl: './courrier-details.view.html',
  styleUrl: './courrier-details.view.css',
})
export class CourrierDetailsView {
  @Input({ required: true }) courrier!: Courrier;

  rows(): Array<[string, string]> {
    const c = this.courrier;
    return [
      ['الرقم', formatSeq(c.seq)],
      ['تاريخ الوصول', c.dateArrivee],
      ['المصدر', c.source],
      ['نوع الطرف المعني', c.typePartie],
      ['هوية الطرف المعني', c.identitePartie],
      ['الموضوع', c.objet],
      ['الموجَّه إليه', c.destinataire],
      ['تاريخ الاستلام', c.dateReception],
      ['إحالة إلى', c.ihalaIla || '—'],
      ['الإجابة الواردة', c.reponseRecue],
      ['تاريخ الإجابة الواردة', c.dateReponseRecue || '—'],
      ['الرد النهائي على المراسلة', c.reponseFinale || '—'],
      ['تاريخ الرد النهائي', c.dateReponseFinale || '—'],
      ['جهة الرد النهائي', c.jihaReponse || '—'],
    ];
  }
}
