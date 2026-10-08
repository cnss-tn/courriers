// MODEL — pur : aucune dépendance Angular/Firebase.
// Compte utilisateur : uniquement Matricule, FR_Name, AR_Name, Pw (crypté).

export interface AppUser {
  id?: string;
  matricule: string;
  frName: string;
  arName: string;
  // Session (localStorage uniquement, jamais en Firestore)
  token?: string;
  sessionStartedAt?: number;
  sessionExpiresAt?: number;
}
