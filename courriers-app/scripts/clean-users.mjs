/**
 * Nettoyage de la collection `users` : ne garde que
 * Matricule, FR_Name, AR_Name, Pw (hash sha256 inchangé).
 * Supprime : Grade, Code_BR/bureau, user_type, pw_changed, email, etc.
 * Usage : node scripts/clean-users.mjs
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

const snap = await db.collection('users').get();
console.log(`Docs users trouvés : ${snap.size}`);
let cleaned = 0;
let skipped = 0;
for (const d of snap.docs) {
  const x = d.data();
  const mat = x['Matricule'];
  const fr = String(x['FR_Name'] ?? '').trim();
  const ar = String(x['AR_Name'] ?? '').trim();
  const pw = String(x['Pw'] ?? '').trim();
  if ((typeof mat !== 'number' && typeof mat !== 'string') || !fr || !ar || !pw) {
    console.log(`- IGNORÉ ${d.id} (champs requis manquants)`);
    skipped++;
    continue;
  }
  const removed = Object.keys(x).filter(
    (k) => !['Matricule', 'FR_Name', 'AR_Name', 'Pw'].includes(k),
  );
  await db.collection('users').doc(d.id).set(
    {
      Matricule: typeof mat === 'number' ? mat : Number(mat),
      FR_Name: fr,
      AR_Name: ar,
      Pw: pw,
    },
    { merge: false },
  );
  console.log(`- NETTOYÉ ${d.id} (retiré : ${removed.join(', ') || 'rien'})`);
  cleaned++;
}
console.log(`Terminé : ${cleaned} nettoyé(s), ${skipped} ignoré(s).`);
process.exit(0);
