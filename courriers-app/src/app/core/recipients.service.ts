import { Injectable } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/user.model';

const COL = 'recipients';

/**
 * Personnes الموجَّه إليه : table dédiée (remplie via `npm run import-recipients`),
 * doc id `Matricule-FR_Name`, champs { Matricule, FR_Name, AR_Name } uniquement.
 * Tri par matricule croissant (الأرشيف ajouté en dernier côté contrôleur).
 */
@Injectable({ providedIn: 'root' })
export class RecipientsService {
  constructor(private fb: FirebaseService) {}

  async list(): Promise<AppUser[]> {
    const db = this.fb.firestore();
    const snap = await getDocs(collection(db, COL));
    return snap.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          matricule: String(x['Matricule'] ?? ''),
          frName: String(x['FR_Name'] ?? ''),
          arName: String(x['AR_Name'] ?? ''),
        } as AppUser;
      })
      .sort((a, b) => Number(a.matricule) - Number(b.matricule));
  }
}
