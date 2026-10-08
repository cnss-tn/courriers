import { Injectable } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

const COL = 'relevant_part_type';

/**
 * نوع الطرف المعني : table dédiée en lecture seule, doc id = valeur,
 * champs { name } uniquement. Les valeurs libres saisies via « + جديد »
 * sont utilisées telles quelles, jamais persistées.
 */
@Injectable({ providedIn: 'root' })
export class RelevantPartTypesService {
  private cache: string[] | null = null;

  constructor(private fb: FirebaseService) {}

  async list(): Promise<string[]> {
    if (this.cache) return [...this.cache];
    const db = this.fb.firestore();
    const snap = await getDocs(collection(db, COL));
    const values = snap.docs
      .map((d) => String(d.data()['name'] ?? '').trim())
      .filter(Boolean)
      // tri : nombre de caractères croissant, puis alphabétique arabe
      .sort((a, b) => a.length - b.length || a.localeCompare(b, 'ar'));
    this.cache = values;
    return [...values];
  }

  clearCache(): void {
    this.cache = null;
  }
}
