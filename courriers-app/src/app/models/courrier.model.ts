// MODEL — pur : aucune dépendance Angular/Firebase.
// Toute règle métier sur les courriers vit ici (et pas dans les vues).

export type ReponseRecue = 'نعم' | 'لا';

export interface Courrier {
  id?: string;
  /** Séquence numérique 1..n (attribuée automatiquement à la création) */
  seq: number;
  dateArrivee: string; // YYYY-MM-DD
  source: string;
  typePartie: string;
  /** Matricule + raison sociale dans le même champ */
  identitePartie: string;
  objet: string;
  /** Contrôleur de la direction ou « Archive » */
  destinataire: string;
  dateReception: string; // YYYY-MM-DD
  ihalaIla: string;
  reponseRecue: ReponseRecue;
  dateReponseRecue: string;
  reponseFinale: string;
  dateReponseFinale: string;
  jihaReponse: string;
  createdAt?: number;
  createdBy?: string;
  updatedAt?: number;
}

/** Données saisies dans le formulaire (sans id/seq : gérés par le contrôleur). */
export interface CourrierDraft {
  dateArrivee: string;
  source: string;
  typePartie: string;
  identitePartie: string;
  objet: string;
  destinataire: string;
  dateReception: string;
  ihalaIla: string;
  reponseRecue: ReponseRecue;
  dateReponseRecue: string;
  reponseFinale: string;
  dateReponseFinale: string;
  jihaReponse: string;
}

export const ARCHIVE_DESTINATAIRE = 'Archive';

export function blankCourrierDraft(today: string): CourrierDraft {
  return {
    dateArrivee: today,
    source: '',
    typePartie: '',
    identitePartie: '',
    objet: '',
    destinataire: '',
    dateReception: today,
    ihalaIla: '',
    reponseRecue: 'لا',
    dateReponseRecue: '',
    reponseFinale: '',
    dateReponseFinale: '',
    jihaReponse: '',
  };
}

export function courrierToDraft(c: Courrier): CourrierDraft {
  return {
    dateArrivee: c.dateArrivee,
    source: c.source,
    typePartie: c.typePartie,
    identitePartie: c.identitePartie,
    objet: c.objet,
    destinataire: c.destinataire,
    dateReception: c.dateReception,
    ihalaIla: c.ihalaIla,
    reponseRecue: c.reponseRecue,
    dateReponseRecue: c.dateReponseRecue,
    reponseFinale: c.reponseFinale,
    dateReponseFinale: c.dateReponseFinale,
    jihaReponse: c.jihaReponse,
  };
}

/** Validation métier : retourne la liste des erreurs (arabe), vide si OK. */
export function validateCourrierDraft(d: CourrierDraft): string[] {
  const errors: string[] = [];
  const required: Array<[string, string]> = [
    [d.dateArrivee, 'تاريخ الوصول إجباري'],
    [d.source, 'المصدر إجباري'],
    [d.typePartie, 'نوع الطرف المعني إجباري'],
    [d.identitePartie, 'هوية الطرف المعني إجبارية'],
    [d.objet, 'الموضوع إجباري'],
    [d.destinataire, 'الموجَّه إليه إجباري'],
    [d.dateReception, 'تاريخ الاستلام إجباري'],
  ];
  for (const [v, msg] of required) {
    if (!String(v || '').trim()) errors.push(msg);
  }
  if (d.reponseRecue !== 'نعم' && d.reponseRecue !== 'لا') {
    errors.push('قيمة الرد المستلم غير صالحة');
  }
  if (d.reponseRecue === 'نعم' && !String(d.dateReponseRecue || '').trim()) {
    errors.push('يرجى إدخال تاريخ الإجابة الواردة (الإجابة نعم)');
  }
  return errors;
}
