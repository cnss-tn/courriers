import { Injectable } from '@angular/core';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/user.model';

const COL = 'users';

/**
 * Lecture des utilisateurs — sert uniquement la liste des destinataires
 * (contrôleurs) du formulaire مراسلة. La gestion des comptes se fait via
 * `npm run seed:admin` ou la console Firestore.
 * Doc : { Matricule, FR_Name, AR_Name, Grade, Code_BR/bureau, Pw, user_type, pw_changed, email }
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private fb: FirebaseService) {}

  async list(): Promise<AppUser[]> {
    const db = this.fb.firestore();
    const snap = await getDocs(query(collection(db, COL), orderBy('Matricule', 'asc')));
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        matricule: String(x['Matricule'] ?? ''),
        frName: String(x['FR_Name'] ?? ''),
        arName: String(x['AR_Name'] ?? ''),
        grade: String(x['Grade'] ?? ''),
        bureau: String(x['Code_BR'] ?? x['bureau'] ?? ''),
        userType: String(x['user_type'] ?? 'normal').toLowerCase() === 'admin' ? 'admin' : 'normal',
        pw_changed: Number(x['pw_changed'] ?? 0) || 0,
        email: String(x['email'] ?? x['Email'] ?? ''),
      } as AppUser;
    });
  }

  /** Destinataires possibles = contrôleurs ; « Archive » ajouté côté vue en dernier. */
  async controleurs(): Promise<AppUser[]> {
    const all = await this.list();
    const known = new Set(['CT', 'CU', 'CC', 'DRC', 'CONTROLLEUR', 'CONTROLEUR']);
    const ctrls = all.filter(
      (u) => known.has(String(u.grade || '').trim().toUpperCase()) || u.userType === 'normal',
    );
    return (ctrls.length ? ctrls : all).sort((a, b) =>
      String(a.arName || a.frName).localeCompare(String(b.arName || b.frName), 'ar'),
    );
  }
}
