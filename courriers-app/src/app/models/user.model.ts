// MODEL — pur : aucune dépendance Angular/Firebase.
// Compte utilisateur : Matricule, FR_Name, AR_Name, Pw (crypté), Type.

/** Rôle métier : secrétariat (saisie) ou interne (traitement des réponses). */
export type UserType = 'secretariat' | 'internal';

export interface AppUser {
  id?: string;
  matricule: string;
  frName: string;
  arName: string;
  /** Rôle lu dans le doc `users` (champ `Type`). Défaut : internal (moindre privilège). */
  type?: UserType;
  // Session (localStorage uniquement, jamais en Firestore)
  token?: string;
  sessionStartedAt?: number;
  sessionExpiresAt?: number;
}
