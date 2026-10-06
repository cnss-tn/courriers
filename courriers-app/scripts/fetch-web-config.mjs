/**
 * Récupère la config Web Firebase (apiKey, appId...) via le compte de service
 * de needs/ et remplit src/environments/environment.ts automatiquement.
 * Usage : npm run setup:firebase
 *
 * API utilisée : Firebase Management API
 *   GET /v1beta1/projects/{projectId}/webApps -> liste les Web Apps
 *   (création auto si aucune) puis GET /v1beta1/{appName}/config
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cert } from 'firebase-admin';

const here = dirname(fileURLToPath(import.meta.url));
const needsDir = join(here, '..', '..', 'needs');
const envFile = join(here, '..', 'src', 'environments', 'environment.ts');

const keyFile = readdirSync(needsDir).find(
  (f) => f.includes('firebase-adminsdk') && f.endsWith('.json'),
);
if (!keyFile) {
  console.error('[setup:firebase] Clé service-account introuvable dans needs/.');
  process.exit(1);
}
const serviceAccount = (await import(pathToFileURL(join(needsDir, keyFile)).href, { with: { type: 'json' } })).default;
const projectId = serviceAccount.project_id;
if (!projectId) {
  console.error('[setup:firebase] project_id absent du fichier service-account.');
  process.exit(1);
}

const cred = cert(serviceAccount);
const { access_token: token } = await cred.getAccessToken();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function api(path, options = {}) {
  const res = await fetch(`https://firebase.googleapis.com/v1beta1/${path}`, {
    ...options,
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg} [${path}]`);
  }
  return body;
}

try {
  // 1) Lister les Web Apps existantes
  let apps = [];
  try {
    const listed = await api(`projects/${projectId}/webApps?pageSize=100`);
    apps = listed.apps || [];
  } catch (e) {
    throw new Error(
      `Lecture des Web Apps impossible : ${e.message}\n` +
        '-> Vérifiez que "Firebase Management API" est activée et que le compte de service a un rôle suffisant (Editor minimum).',
    );
  }

  // 2) Créer une Web App si aucune n'existe
  let appName = apps[0]?.name;
  if (!appName) {
    console.log('[setup:firebase] Aucune Web App : création de "courriers-app"...');
    const op = await api(`projects/${projectId}/webApps`, {
      method: 'POST',
      body: JSON.stringify({ displayName: 'courriers-app' }),
    });
    // L'opération est async : attendre la fin (poll simple)
    const opName = op.name;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const done = await api(opName);
      if (done.done) {
        appName = done.response?.name;
        break;
      }
    }
    if (!appName) throw new Error('Création de la Web App : délai dépassé, réessayez.');
  }
  console.log(`[setup:firebase] Web App : ${appName}`);

  // 3) Lire la config Web (contient apiKey)
  const cfg = await api(`${appName}/config`);
  if (!cfg.apiKey) throw new Error('apiKey absente de la réponse /config.');

  // 4) Écrire environment.ts
  const content = `// Config Firebase générée automatiquement par "npm run setup:firebase"
// (Firebase Management API + compte de service de needs/). Ne pas éditer à la main.
export const environment = {
  production: false,
  firebase: {
    apiKey: '${cfg.apiKey}',
    authDomain: '${cfg.authDomain || `${projectId}.firebaseapp.com`}',
    projectId: '${cfg.projectId || projectId}',
    storageBucket: '${cfg.storageBucket || ''}',
    messagingSenderId: '${cfg.messagingSenderId || ''}',
    appId: '${cfg.appId || ''}',
  },
  sessionTtlMs: 4 * 60 * 60 * 1000, // 4h comme l'app campagnes
};
`;
  writeFileSync(envFile, content);
  console.log(`[setup:firebase] OK : ${envFile} rempli (apiKey ...${cfg.apiKey.slice(-6)}).`);
} catch (e) {
  console.error(`[setup:firebase] ÉCHEC : ${e.message}`);
  console.error(
    'Repli manuel : console Firebase > Project settings > General > Web app > copier apiKey dans src/environments/environment.ts',
  );
  process.exit(1);
}
process.exit(0);
