import { Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

/**
 * Initialisation unique de Firebase (SDK modulaire v10).
 * Si la clé Web API n'est pas encore renseignée, un message explicite
 * est loggé au lieu de planter toute l'application.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private warned = false;

  private ensure(): Firestore {
    if (this.db) return this.db;
    const apiKey = environment.firebase.apiKey || '';
    if (!apiKey || apiKey.includes('COLLEZ')) {
      if (!this.warned) {
        this.warned = true;
        console.error(
          '[Firebase] apiKey manquante : renseignez src/environments/environment.ts ' +
            '(console Firebase > Project settings > General > Web app).',
        );
      }
      throw new Error('firebase_api_key_missing');
    }
    this.app = initializeApp({ ...environment.firebase });
    this.db = getFirestore(this.app);
    return this.db;
  }

  firestore(): Firestore {
    return this.ensure();
  }
}
