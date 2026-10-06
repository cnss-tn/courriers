// MODEL — pur : aucune dépendance Angular/Firebase.

export interface AppUser {
  id?: string;
  matricule: string;
  frName: string;
  arName: string;
  grade: string;
  bureau?: string;
  userType: 'admin' | 'normal';
  pw_changed: number;
  email?: string;
  // Session (localStorage uniquement, jamais en Firestore)
  token?: string;
  sessionStartedAt?: number;
  sessionExpiresAt?: number;
}
