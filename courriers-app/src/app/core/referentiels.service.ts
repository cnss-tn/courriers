import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { ReferentielItem, ReferentielType } from '../models/referentiel.model';

const COL = 'referentiels';

const DEFAULTS: Record<ReferentielType, string[]> = {
  source: [],
  partie_type: [],
  ihala: [],
};

/**
 * Listes déroulantes extensibles (pattern « النشاط » de campagnes :
 * choisir dans la liste OU ajouter une nouvelle valeur).
 * Stockage : collection `referentiels` { type, value }.
 */
@Injectable({ providedIn: 'root' })
export class ReferentielsService {
  private cache = new Map<ReferentielType, string[]>();

  constructor(private fb: FirebaseService) {}

  async list(type: ReferentielType): Promise<string[]> {
    if (this.cache.has(type)) return [...(this.cache.get(type) || [])];
    const db = this.fb.firestore();
    const snap = await getDocs(query(collection(db, COL), where('type', '==', type)));
    const values = snap.docs
      .map((d) => String((d.data() as ReferentielItem)['value'] ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ar'));
    const merged = [...DEFAULTS[type], ...values.filter((v) => !DEFAULTS[type].includes(v))];
    this.cache.set(type, merged);
    return [...merged];
  }

  /** Ajoute la valeur si absente (insensible à la casse/espaces) puis la retourne. */
  async addIfNew(type: ReferentielType, value: string): Promise<string> {
    const v = String(value || '').trim();
    if (!v) return v;
    const current = await this.list(type);
    if (current.some((x) => x.toLowerCase() === v.toLowerCase())) return v;
    await addDoc(collection(this.fb.firestore(), COL), {
      type,
      value: v,
      createdAt: Date.now(),
    });
    this.cache.set(type, [...current, v].sort((a, b) => a.localeCompare(b, 'ar')));
    return v;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
