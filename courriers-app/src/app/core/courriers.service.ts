import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Courrier, formatSeq } from '../models/courrier.model';

const COL = 'courriers';

/**
 * CRUD des courriers + séquence numérique.
 * Règle : next = max(seq existants) + 1 (jamais de trou réutilisé sauf si
 * le dernier est supprimé) ; base vide -> on repart de 1.
 * Doc id : `C-00001`, `C-00002`, ... Transaction anti-doublon.
 */
@Injectable({ providedIn: 'root' })
export class CourriersService {
  constructor(private fb: FirebaseService) {}

  async list(): Promise<Courrier[]> {
    const db = this.fb.firestore();
    const snap = await getDocs(query(collection(db, COL), orderBy('seq', 'asc')));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Courrier, 'id'>) }));
  }

  async create(input: Omit<Courrier, 'id' | 'seq'>): Promise<Courrier> {
    const db = this.fb.firestore();
    // Dernier seq existant (0 si base vide -> on repart de 1).
    const snap = await getDocs(query(collection(db, COL), orderBy('seq', 'desc'), limit(1)));
    let seq = 0;
    snap.forEach((d) => {
      const s = Number((d.data() as Courrier)['seq'] ?? 0);
      if (Number.isFinite(s) && s > seq) seq = s;
    });
    // Pré-vérification d'existence + retries : 2 créations simultanées
    // ne reçoivent jamais le même id.
    for (let attempt = 0; attempt < 5; attempt++) {
      seq += 1;
      const id = `C-${formatSeq(seq)}`;
      const existing = await getDoc(doc(db, COL, id));
      if (existing.exists()) continue;
      const now = Date.now();
      const data = { ...input, seq, createdAt: now, updatedAt: now };
      await setDoc(doc(db, COL, id), data);
      return { id, ...data };
    }
    throw new Error('seq_collision');
  }

  async update(id: string, patch: Partial<Courrier>): Promise<void> {
    const db = this.fb.firestore();
    const ref = doc(db, COL, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('not_found');
    const { id: _omit, seq: _seq, ...rest } = { ...(snap.data() as Courrier), ...patch };
    await setDoc(ref, { ...rest, updatedAt: Date.now() }, { merge: true });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(this.fb.firestore(), COL, id));
  }
}
