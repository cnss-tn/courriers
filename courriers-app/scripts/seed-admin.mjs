/**
 * Création d'un compte dans Firestore (collection `users`) :
 * uniquement Matricule, FR_Name, AR_Name, Pw (crypté sha256).
 * Usage :
 *   node scripts/seed-admin.mjs <matricule> <motDePasse> "<nomAr>" "<nomFr>"
 * Exemple :
 *   node scripts/seed-admin.mjs 1000 "ChangeMe123" "مدير النظام" "Admin"
 *
 * Le script lit la clé service-account dans ../needs/*.json (jamais commitée : *.json ignoré par git).
 * Hash stocké : 'sha256:' + hex(SHA256(matricule + ':' + motDePasse)) — même format que campagnes.
 */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const needsDir = join(here, '..', '..', 'needs');
const keyFile = readdirSync(needsDir).find(
  (f) => f.includes('firebase-adminsdk') && f.endsWith('.json'),
);
if (!keyFile) {
  console.error('Clé service-account introuvable dans needs/. Opération annulée.');
  process.exit(1);
}

const serviceAccount = (await import(pathToFileURL(join(needsDir, keyFile)).href, { with: { type: 'json' } })).default;

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const [matricule, password, arName = 'مدير النظام', frName = 'Admin'] =
  process.argv.slice(2);
if (!matricule || !password) {
  console.error('Usage: node scripts/seed-admin.mjs <matricule> <motDePasse> "[nomAr]" "[nomFr]"');
  process.exit(1);
}

const hex = createHash('sha256').update(`${String(matricule).trim()}:${password}`).digest('hex');
const docId = `${String(matricule).trim()}-${frName}`;
await db.collection('users').doc(docId).set(
  {
    Matricule: Number(matricule),
    FR_Name: frName,
    AR_Name: arName,
    Pw: `sha256:${hex}`,
  },
  { merge: true },
);
console.log(`Compte ${matricule} créé (doc ${docId}).`);
process.exit(0);
