/**
 * Importe Sources.xlsx (feuille Users : Code Bureau | Bureau) dans la
 * collection Firestore `sources` : docs id `code-name`
 * (ex. 80-المكتب الجهوي بتونس البلفيدير), champs { code, name } uniquement.
 * Ré-exécutable sans doublons (ignore les noms déjà présents).
 * Usage : node scripts/import-sources.mjs
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import XLSX from 'xlsx';
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

const xlsxFile = readdirSync(needsDir).find(
  (f) => f.toLowerCase().endsWith('.xlsx') && /source/i.test(f),
);
if (!xlsxFile) {
  console.error('Sources.xlsx introuvable dans needs/.');
  process.exit(1);
}

const wb = XLSX.readFile(join(needsDir, xlsxFile));
const sheet = wb.Sheets['Users'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(1);

const existing = new Set(
  (await db.collection('sources').get()).docs.map((d) => String(d.data()['name'] || '').trim().toLowerCase()),
);

let added = 0;
let skipped = 0;
for (const r of rows) {
  const code = String(r[0] ?? '').trim();
  const name = String(r[1] ?? '').trim();
  if (!name || existing.has(name.toLowerCase())) {
    skipped++;
    continue;
  }
  const docId = code
    ? `${code.replace(/\//g, '-')}-${name.replace(/\//g, '-')}`
    : name.replace(/\//g, '-');
  await db.collection('sources').doc(docId).set({ code, name });
  existing.add(name.toLowerCase());
  added++;
}
console.log(`Import sources terminé : ${added} ajouté(s), ${skipped} ignoré(s, vide ou doublon).`);
process.exit(0);
