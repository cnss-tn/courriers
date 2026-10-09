# Courriers — gestion des courriers du secrétariat (direction de contrôle)

App Angular 20 (standalone, RTL arabe) inspirée de **campagnes** :
login matricule + mot de passe (**sans code OTP**), gestion des users,
registre des courriers + popup de création/édition, filtres, pagination, exports Excel/PDF.

## 1) Prérequis

- Node 20+ , npm
- Projet Firebase : **courriers-e94e1**

## 2) Config Web Firebase

`src/environments/environment.ts` contient déjà la config Web (`apiKey`, `appId`...).

Repli manuel si besoin : console Firebase > Project settings > General >
Web app > copier `apiKey` dans `src/environments/environment.ts`.

Règles Firestore : déjà publiées (console Firebase > Firestore > Rules).

## 3) Lancer / builder

```bash
npm start          # http://localhost:4200
npm run build      # dist/ -> déployable (Vercel / Netlify / GitHub Pages)
```

## 4) Structure MVC (découpage anti-répétition)

```
src/app/
  models/          # MODEL pur (zéro Angular/Firebase) : interfaces,
                   # validateCourrierDraft(), constantes
  controllers/     # CONTROLLER (injectables, signals) : seuls autorisés à
                   # toucher les services — état, filtres, CRUD, exports
  views/           # VIEW (dumb) : @Input/@Output uniquement, jamais de service
    auth/            login.view
    account/         my-account.view (infos + changement mot de passe)
    courriers/       courriers-list.view + courrier-form.view + courrier-details.view
  core/            # infrastructure : firebase.service, auth.service,
                   # courriers/sources/recipients/relevant-part-types services, guards
  shared/          # UI générique : footer, background, popup-modal, dropdown,
                   # custom-select, pagination, export-buttons, loader
  layout/          # main-layout (logo + logout fixes + contenu + footer)
```

Règle d'or : **la vue affiche et émet, le contrôleur décide et persiste,
le modèle valide.** Détails pédagogiques : voir `docs/MVC.md`.

## 5) Collections Firestore

| Collection     | Contenu |
| -------------- | ------- |
| `users`        | Matricule, FR_Name, AR_Name, Pw (sha256) — login uniquement, rien d'autre |
| `recipients`   | id `Matricule-FR_Name`, champs { Matricule, FR_Name, AR_Name } (الموجَّه إليه, lecture seule) |
| `sessions`     | id `matricule-frName` -> { matricule, createdAt, expiresAt } (heures lisibles Timestamp, 1 session live / user, expire à 19h00 ; docs expirés supprimés au logout, à l'expiration et au démarrage/login) |
| `courriers`    | seq, dateArrivee, source, typePartie, identitePartie, objet, destinataire, dateReception, ihalaIla, reponseRecue, dateReponseRecue, reponseFinale, dateReponseFinale, jihaReponse, createdAt/By, updatedAt |
| `relevant_part_type` | doc id = valeur, champ { name } (نوع الطرف المعني : مؤجر, lecture seule) |
| `sources`      | id `code-name`, champs { code, name } (المصدر, lecture seule) |

## 6) Règles de gestion

- **Séquence** attribuée automatiquement à la création (jamais réutilisée après suppression).
- **Destinataire** = tous les users (« matricule + nom arabe », ex. 126359 أحمد الزكراوي) + **« الأرشيف » toujours en dernier**.
- **المصدر / إحالة إلى** : bureaux/directions de la table `sources` ; **نوع الطرف** : table `relevant_part_type` ; **« + جديد »** partout : valeur libre utilisée telle quelle, jamais persistée.
- Si **« الإجابة الواردة = نعم »** alors تاريخ الإجابة الواردة requis.

## 7) Déploiement GitHub Pages

Déploiement automatique via `.github/workflows/deploy-pages.yml` (à la racine du repo) :
push sur `main` → build prod (`--base-href /courriers/`) → publication.

Mise en route (une fois) :
1. Commit + push du workflow et de l'app.
2. GitHub → Settings → Pages → Source : **GitHub Actions**.
3. URL : `https://cnss-tn.github.io/courriers/` (+ `/login` géré via `404.html`).
4. GCP → APIs & Services → Credentials → clé Web API → HTTP referrers :
   ajouter `https://cnss-tn.github.io/courriers/*` (et `http://localhost:4200/*` pour le dev).
