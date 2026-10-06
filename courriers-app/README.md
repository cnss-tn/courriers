# Courriers — gestion des courriers du secrétariat (direction de contrôle)

App Angular 20 (standalone, RTL arabe) inspirée de **campagnes** :
login matricule + mot de passe (**sans code OTP**), gestion des users,
registre des courriers + popup de création/édition, filtres, pagination, exports Excel/PDF.

## 1) Prérequis

- Node 20+ , npm
- Projet Firebase : **courriers-e94e1**

## 2) Clé Web API (automatique via `needs/`)

Le fichier service-account de `needs/` sert à récupérer la config Web **sans copier-coller** :

```bash
npm run setup:firebase
```

Le script lit la clé de `needs/`, interroge la Firebase Management API
et remplit `src/environments/environment.ts` (`apiKey`, `appId`...).

Repli manuel si besoin : console Firebase > Project settings > General >
Web app > copier `apiKey` dans `src/environments/environment.ts`.

Publiez aussi `firestore.rules` dans Firebase Console > Firestore > Rules.

## 3) Créer le premier admin

```bash
npm run seed:admin -- 1000 "ChangeMe123" "مدير النظام" "Admin" CT
```

## 4) Lancer / builder

```bash
npm start          # http://localhost:4200
npm run build      # dist/ -> déployable (Vercel / Netlify / GitHub Pages)
```

## 5) Structure MVC (découpage anti-répétition)

```
src/app/
  models/          # MODEL pur (zéro Angular/Firebase) : interfaces,
                   # validateCourrierDraft(), constantes
  controllers/     # CONTROLLER (injectables, signals) : seuls autorisés à
                   # toucher les services — état, filtres, CRUD, exports
  views/           # VIEW (dumb) : @Input/@Output uniquement, jamais de service
    auth/            login.view
    courriers/       courriers-list.view + courrier-form.view + courrier-details.view
  core/            # infrastructure : firebase.service, auth.service,
                   # courriers/users/referentiels services, guards
  shared/          # UI générique : footer, background, popup-modal, dropdown,
                   # custom-select, pagination, export-buttons, loader
  layout/          # main-layout (logo + logout fixes + contenu + footer)
```

Règle d'or : **la vue affiche et émet, le contrôleur décide et persiste,
le modèle valide.** Détails pédagogiques : voir `docs/MVC.md`.

## 6) Collections Firestore

| Collection     | Contenu |
| -------------- | ------- |
| `users`        | Matricule, FR_Name, AR_Name, Grade, Code_BR, Pw (sha256), user_type, pw_changed, email |
| `sessions`     | token -> { matricule, createdAt } (1 session live / user, TTL 4h côté client) |
| `courriers`    | seq, dateArrivee, source, typePartie, identitePartie, objet, destinataire, dateReception, ihalaIla, reponseRecue, dateReponseRecue, reponseFinale, dateReponseFinale, jihaReponse, createdAt/By, updatedAt |
| `referentiels` | { type: source \| partie_type \| ihala, value } (listes extensibles) |
| `counters/courriers` | { lastSeq } (séquence 1..n via transaction) |

## 7) Règles de gestion

- **Séquence** attribuée automatiquement à la création (jamais réutilisée après suppression).
- **Destinataire** = contrôleurs (users) + **« Archive » toujours en dernier**.
- **Source / نوع الطرف / إحالة إلى** : choisir ou **« + جديد »** (persisté en `referentiels`).
- Si **« تم تلقي رد؟ = نعم »** alors date du رد المستلم requise.

## 8) Déploiement GitHub Pages

Déploiement automatique via `.github/workflows/deploy-pages.yml` (à la racine du repo) :
push sur `main` → build prod (`--base-href /courriers/`) → publication.

Mise en route (une fois) :
1. Commit + push du workflow et de l'app.
2. GitHub → Settings → Pages → Source : **GitHub Actions**.
3. URL : `https://cnss-tn.github.io/courriers/` (+ `/login` géré via `404.html`).
4. GCP → APIs & Services → Credentials → clé Web API → HTTP referrers :
   ajouter `https://cnss-tn.github.io/courriers/*` (et `http://localhost:4200/*` pour le dev).
