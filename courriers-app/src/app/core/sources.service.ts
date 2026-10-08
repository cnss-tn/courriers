import { Injectable } from '@angular/core';
import { collection, getDocs, query } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

const COL = 'sources';

/**
 * المصدر (bureaux et directions) : importé de Sources.xlsx, lecture seule.
 * Les valeurs libres saisies via « + جديد » sont utilisées telles quelles,
 * jamais persistées.
 * Doc : id `code-name`, champs { code, name } uniquement.
 */
@Injectable({ providedIn: 'root' })
export class SourcesService {
  private cache: string[] | null = null;

  constructor(private fb: FirebaseService) {}

  async list(): Promise<string[]> {
    return (await this.listWithCodes()).map((s) => s.name);
  }

  /** Paires { code, name } triées par code : MINIS (1), DIR (2), numériques croissants (3). */
  async listWithCodes(): Promise<Array<{ code: string; name: string }>> {
    const db = this.fb.firestore();
    const snap = await getDocs(query(collection(db, COL)));
    const pairs = snap.docs
      .map((d) => ({
        code: String(d.data()['code'] ?? '').trim(),
        name: String(d.data()['name'] ?? '').trim(),
      }))
      .filter((x) => x.name);
    const ranked = pairs.sort((a, b) => {
      const ra = SourcesService.codeRank(a.code);
      const rb = SourcesService.codeRank(b.code);
      if (ra[0] !== rb[0]) return ra[0] - rb[0];
      if (ra[1] !== rb[1]) return ra[1] - rb[1];
      return a.name.localeCompare(b.name, 'ar');
    });
    this.cache = ranked.map((x) => x.name);
    return ranked;
  }

  private static codeRank(code: string): [number, number] {
    const c = String(code || '').trim().toUpperCase();
    if (c === 'MINIS') return [0, 0];
    if (c === 'DIR') return [1, 0];
    const n = Number(c);
    if (c !== '' && Number.isFinite(n)) return [2, n];
    return [3, 0];
  }
}
