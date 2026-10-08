/**
 * Ajout d'un destinataire (الموجَّه إليه) dans Firestore (collection `recipients`) :
 * doc id `Matricule-FR_Name`, champs { Matricule, FR_Name, AR_Name } uniquement.
 * Usage :
 *   node scripts/add-recipient.mjs <matricule> "<nomFr>" "<nomAr>"
 * Exemple :
 *   node scripts/add-recipient.mjs 126359 "Zakraoui Ahmed" "أحمد الزكراوي"
 *
 * Le script lit la clé service-account dans ../needs/*.json (jamais commitée : *.json ignoré par git).
 */
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

const [matricule, frName, arName] = process.argv.slice(2);
if (!matricule || !frName || !arName) {
  console.error('Usage: node scripts/add-recipient.mjs <matricule> "<nomFr>" "<nomAr>"');
  process.exit(1);
}

const mat = String(matricule).trim();
const fr = String(frName).trim();
const ar = String(arName).trim();
const docId = `${mat}-${fr}`.replace(/\//g, '-');
await db.collection('recipients').doc(docId).set(
  {
    Matricule: Number(mat),
    FR_Name: fr,
    AR_Name: ar,
  },
  { merge: false },
);
console.log(`Destinataire ajouté : ${docId} (Matricule=${mat}, FR="${fr}", AR="${ar}").`);
process.exit(0);
