# MVC dans cette app — guide d'apprentissage Angular

## L'idée en une phrase

- **Model** (`models/`) : *qu'est-ce qu'une donnée valide ?* — pur TypeScript.
- **View** (`views/`) : *qu'est-ce qu'on affiche ?* — template + saisie locale.
- **Controller** (`controllers/`) : *que fait-on des données ?* — état + Firestore.

## Exemple concret : ajouter une مراسلة

```
courrier-form.view ──submitted(draft)──▶ courriers-list.view ──ctrl.save()──▶ CourriersController
                                                                                    │ validateCourrierDraft() (MODEL)
                                                                                    │ refs.addIfNew() / courriers.create() (core services)
                                                                                    │ reload() → signal all() mis à jour
                                                                                    ▼
-view se rafraîchit automatiquement (signal) ◀── null (succès) ── retour ── popup fermée
```

## Les 5 mécanismes Angular à observer

1. **`signal()` / `computed()`** : état réactif. `filtered = computed(...)` se
   recalcule seul quand `fSearch` ou `all` change — pas de `subscribe` manuel.
   Lire dans le template avec `ctrl.filtered()`.
2. **`@Input()` / `@Output()`** : seul pont autorisé vers une vue.
   Ex. `app-courrier-form` reçoit `[courrier]` + `[serverError]`, émet
   `(submitted)` + `(cancelled)`. Cherchez `EventEmitter` dans `views/`.
3. **`inject()` + `providedIn: 'root'`** : un seul `CourriersController` partagé
   dans toute l'app (singleton). Les vues l'obtiennent sans `constructor`.
4. **`loadComponent` dans `app.routes.ts`** : chaque page est chargée en lazy
   (voir les chunks `courriers-list-view`, `login-view` dans le build).
5. **Guards (`core/guards.ts`)** : fonctions `CanActivateFn` qui protègent les
   routes (`authGuard`, `adminGuard`) — observez l'ordre guards → layout → vue.

## Exercices proposés

1. Ajouter un filtre « objet contient » : signal + computed dans le contrôleur,
   input dans la vue — sans toucher au service.
2. Ajouter une règle métier (ex. date de réception ≥ date d'arrivée) dans
   `validateCourrierDraft()` : elle s'applique partout d'un coup.
3. Ajouter une colonne au tableau : template de la vue + `exportRows()` du
   contrôleur — le service Firestore n'a rien à changer.
