// MODEL — pur : aucune dépendance Angular/Firebase.

export type ReferentielType = 'source' | 'partie_type' | 'ihala';

export interface ReferentielItem {
  id?: string;
  type: ReferentielType;
  value: string;
  createdAt?: number;
}
