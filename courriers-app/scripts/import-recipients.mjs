/**
 * Remplit la table `recipients` (personnes الموجَّه إليه) depuis `users` :
 * doc id `Matricule-FR_Name`, champs { Matricule, FR_Name, AR_Name } uniquement.
 * Ré-exécutable sans doublons (écrase à l'identique).
 * Usage : node scripts/import-recipients.mjs
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

const users = await db.collection('users').get();
console.log(`Docs users trouvés : ${users.size}`);
let added = 0;
let skipped = 0;
for (const d of users.docs) {
  const x = d.data();
  const mat = x['Matricule'];
  const fr = String(x['FR_Name'] ?? '').trim();
  const ar = String(x['AR_Name'] ?? '').trim();
  if ((typeof mat !== 'number' && typeof mat !== 'string') || !fr || !ar) {
    console.log(`- IGNORÉ ${d.id} (champs requis manquants)`);
    skipped++;
    continue;
  }
  const docId = `${String(mat).trim()}-${fr}`.replace(/\//g, '-');
  await db.collection('recipients').doc(docId).set(
    {
      Matricule: typeof mat === 'number' ? mat : Number(mat),
      FR_Name: fr,
      AR_Name: ar,
    },
    { merge: false },
  );
  console.log(`- IMPORTÉ ${docId}`);
  added++;
}
console.log(`Terminé : ${added} importé(s), ${skipped} ignoré(s).`);
process.exit(0);
