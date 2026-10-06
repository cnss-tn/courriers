import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Courrier } from '../models/courrier.model';

const COL = 'courriers';
const COUNTER_DOC = 'counters/courriers';

/**
 * CRUD des courriers + séquence numérique 1..n via transaction
 * (compteur counters/courriers.lastSeq — jamais réutilisé après suppression,
 *  comme un registre papier du secrétariat).
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
    const seq = await runTransaction(db, async (tx) => {
      const ref = doc(db, COUNTER_DOC);
      const snap = await tx.get(ref);
      const next = Number(snap.exists() ? (snap.data()['lastSeq'] ?? 0) : 0) + 1;
      tx.set(ref, { lastSeq: next }, { merge: true });
      return next;
    });
    const now = Date.now();
    const data = { ...input, seq, createdAt: now, updatedAt: now };
    const id = `C-${seq}-${now}`;
    await setDoc(doc(db, COL, id), data);
    return { id, ...data };
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
