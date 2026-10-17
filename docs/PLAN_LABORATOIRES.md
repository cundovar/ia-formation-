# Laboratoires IA — plan de développement

Décision du 17 octobre 2026. Les laboratoires sortent du hors-périmètre de `PLAN_APP_FORMATION_IA.md`, en **simulation locale uniquement**. Le suivi de progression, les scores et le mode « IA réelle » restent écartés. Règles de contenu : `regles/07-laboratoires.md`.

## 1. Objectif

Faire manipuler un workflow fait de blocs (déclencheur, condition, agent, outil, API, MCP, RAG, mémoire, validation humaine), le lancer dans un simulateur déterministe et observer chaque étape : données d'entrée et de sortie, décision, erreur. L'apprenant n'a besoin ni de compte chez un fournisseur ni de clé d'API.

## 2. Principes

- **Trois couches séparées** :
  - le moteur pur, dans `front/src/laboratoires/` (sans Vue ni réseau, testé par Vitest) ;
  - les composants, dans `front/src/components/features/laboratoires/` ;
  - un store Pinia `stores/laboratoire.js`, non persisté.
- **Un laboratoire = un fichier JSON** dans `front/src/laboratoires/catalogue/`, réuni par un registre `import.meta.glob`. C'est le patron de l'ancien `exercices/index.js` de l'app médiateur, repris sans son code.
- **Aucun code arbitraire** : conditions et transformations passent par un mini-langage déclaratif. Pas d'`eval`, pas de `new Function`, pas de regex fournie par l'apprenant, et les chemins `__proto__`, `constructor` et `prototype` sont refusés.
- **Aucun réseau** : une règle ESLint limitée à `src/laboratoires/**` interdit `vue`, `axios`, `@/services`, `fetch`, `XMLHttpRequest` et `WebSocket`.
- **Simulateurs fictifs séparés** : `simulateurs/apiFictive.js`, `mcpFictif.js` (protocole JSON-RPC 2.0) et `rechercheFictive.js` (RAG par mots-clés). Ils n'ont aucun lien avec `src/Mcp/` ni avec `/mcp`.
- **Deux vues du même workflow** :
  - une vue séquentielle, éditeur complet en formulaires, affichée par défaut sous `lg`, utilisable au clavier et avec un lecteur d'écran ;
  - une vue graphe avec Vue Flow, chargée à la demande sur grand écran, et qui ne détient pas l'état.

## 3. Moteur

- **Modèle** : `{ noeuds: [{ id, type, config, position }], liens: [{ id, source, sortie, cible, entree }] }`. `position` sert uniquement à l'affichage.
- **`valider(workflow)`** renvoie des erreurs codées (`CYCLE`, `ENTREE_MANQUANTE`, `TYPE_INCONNU`, `NOEUD_ISOLE`, `CONFIG_INVALIDE`, `TROP_DE_NOEUDS`…). Les cycles sont refusés (tri topologique). Plafonds : 50 nœuds, 100 liens.
- **`creerExecution(workflow, jeu)`**, **`etapeSuivante(execution)`** (asynchrone, pure, renvoie un nouvel état), **`executerTout`**, **`repondreValidation`**.
  - Statuts : `pret`, `en_cours`, `pause`, `attente_humaine`, `termine`, `erreur`.
  - État de chaque nœud : `attente`, `actif`, `ok`, `ignore`, `erreur`.
  - Garde-fous : 200 étapes au plus, `structuredClone` à chaque étape, environ 50 Ko de données au maximum.
- **Bloc** = `{ definition (ports, icône, couleur pastel, libellé), schemaConfig, executer({ entree, config, contexte }), explication }`. Les exécuteurs peuvent renvoyer une promesse, ce qui permettra de brancher un mode réel plus tard sans changer le moteur.
- **Critères** :
  - types : `contientBloc`, `lienEntre`, `blocAvant`, `sortieAttendue`, `blocExecute`, `blocNonExecute`, `outilAppele`, `outilNonAppele`, `outilNonPropose`, `mcpAvant`, `donneeNonMemorisee`, `sansErreur`, `nombreMaxBlocs` ;
  - le workflow est vérifié sur **tous** les jeux de données.

## 4. Format d'un laboratoire

```json
{
  "schema": 1,
  "slug": "trier-des-emails",
  "titre": "Trier automatiquement des e-mails fictifs",
  "niveau": "debutant",
  "public": "apprendre",
  "duree": "15 minutes",
  "coursSlugs": [],
  "objectif": "Orienter un message avec une condition.",
  "prerequis": ["comprendre-un-workflow"],
  "simulation": "Les décisions sont calculées par des règles fixes : aucune IA réelle n'est utilisée.",
  "instructions": ["…"],
  "blocsDisponibles": ["declencheur", "donnees", "condition", "transformation", "resultat"],
  "workflowInitial": { "noeuds": [], "liens": [] },
  "verrous": { "noeuds": [], "liens": [] },
  "jeuxDeDonnees": [{ "id": "facture", "libelle": "E-mail de facture", "donnees": {} }],
  "simulateurs": { "api": [], "outils": [], "documents": [], "mcp": null },
  "criteres": [{ "id": "c1", "type": "sortieAttendue", "jeu": "facture", "chemin": "dossier", "egal": "Comptabilité", "message": "…" }],
  "indices": ["…"],
  "correction": { "workflow": {}, "explication": "…" },
  "animation": "Déroulé suggéré en atelier (public former).",
  "source": "…",
  "verifieLe": "2026-10-17"
}
```

Le contrôle est fait par `catalogue/validerLaboratoire.js` (validateur maison : pas de JSON Schema ni d'Ajv tant que le serveur n'en a pas besoin, phase 5). Un test vérifie chaque fichier du catalogue : schéma respecté, slug unique, critères qui renvoient à des jeux existants, correction qui satisfait tous les critères, workflow initial qui ne les satisfait pas. Sur un cours, le bouton « Pratiquer » (`PageContent.vue`) apparaît quand un laboratoire cite son slug dans `coursSlugs`.

## 5. Catalogue

| # | Niveau | Laboratoire | Blocs | Réussite |
|---|---|---|---|---|
| 1 | Débutant | Comprendre un workflow | déclencheur, données, transformation, résultat | Exécution pas à pas ; relier le bloc Résultat manquant |
| 2 | Débutant | Trier des e-mails fictifs | + condition | Facture → Comptabilité, les autres → À lire, sur tous les jeux |
| 3 | Débutant | Conditions et branchements | condition (toutes / une) | Chaque jeu arrive dans la bonne branche |
| 4 | Intermédiaire | Premier agent | + agent (règles) | Bon contexte transmis, réponse attendue |
| 5 | Intermédiaire | Donner des outils à un agent | + outil | Bon outil, arguments valides, retour réutilisé |
| 6 | Intermédiaire | JSON et API | + API | Extraire la bonne valeur ; gérer une réponse 404 |
| 7 | Intermédiaire | Observer un appel d'outil MCP | + mcp fictif | `tools/list` avant `tools/call` ; outil adapté au besoin |
| 8 | Avancé | Assistant documentaire RAG | + rag | Bon passage cité ; `topK` bien réglé |
| 9 | Avancé | Mémoire et contexte | + mémoire | Information du tour 1 disponible au tour 3 ; rien de sensible mémorisé |
| 10 | Avancé | Déboguer un agent | tous | Les 3 défauts sont corrigés, aucune erreur |
| 11 | Avancé | Injection de consignes et permissions | agent, outil, validation humaine | L'action dangereuse n'est jamais exécutée ; validation avant toute écriture |

## 6. Phases

Complexité : S ≤ ½ jour, M = 1–2 jours, L = 3–5 jours.

### Phase 0 — Cadrage
- [x] T0.1 (S) Mettre à jour le périmètre : `PLAN_APP_FORMATION_IA.md`, `AGENTS.md`, ce document.
- [x] T0.2 (S) Écrire la règle `regles/07-laboratoires.md` et l'ajouter à `README.md` et `sources.md`. **Reste à faire valider par le responsable éditorial.**
- [x] T0.3 (S) Essai de Vue Flow. Résultat (17 octobre 2026) : `@vue-flow/core` 1.48.2 (MIT) ; chunk séparé de 164 Ko (54 Ko compressé), chargé seulement à l'ouverture de la vue graphique ; le chunk principal ne prend que 2,3 Ko (`defineAsyncComponent`) ; build PWA correct. Clavier : un bloc a le focus avec Tab, Entrée le sélectionne, les flèches le déplacent ; la création de lien au clavier reste dans les réglages du bloc (vue en étapes ou panneau sous le graphe).

### Phase 1 — MVP (moteur, lecteur séquentiel, labos 1 et 2)

État au 17 octobre 2026 : T1.1 à T1.7 présents dans le code et testés localement (Vitest, ESLint, build Vite, navigateur sur une application Vue servie seule par Vite). Restent à faire : l'essai sur le site complet (Symfony + service worker, hors ligne après rechargement), la CI, et l'association à de vrais cours (`coursSlugs` vides tant que les cours ne sont pas publiés).

Écarts au plan : pas de `schema/laboratoire.schema.json` (voir § 4) ; les données sont copiées par `moteur/cloner.js` (copie JSON) car `structuredClone` refuse les objets réactifs de Vue ; la vue graphe et l'historique annuler/rétablir restent en phase 2.

| Tâche | Fichiers | Tests | Acceptation |
|---|---|---|---|
| T1.1 Modèle et validation (M) | `moteur/{workflow,erreurs,expressions}.js`, `blocs/index.js` | `tests/unit/laboratoires/workflow.spec.js`, `expressions.spec.js` | Erreurs codées ; chemins piégés refusés ; couverture du moteur ≥ 90 % |
| T1.2 Exécution pas à pas (M) | `moteur/execution.js` | ordre, branche ignorée, propagation, plafond d'étapes, arrêt sur erreur, déterminisme | `executerTout` donne le même résultat qu'une suite d'appels à `etapeSuivante` ; les entrées ne sont jamais modifiées |
| T1.3 Blocs du noyau (M) | `blocs/{declencheur,donnees,condition,transformation,resultat}.js` | une spec par bloc | Chaque étape a une explication lisible |
| T1.4 Critères et catalogue (M) | `moteur/criteres.js`, `catalogue/index.js`, `schema/laboratoire.schema.json`, 2 fichiers JSON | `catalogue.spec.js` | Ajouter un labo = ajouter un JSON. Validateur maison, pas d'Ajv dans le bundle |
| T1.5 Garde-fou réseau et code (S) | `front/eslint.config.js` | `npm run lint` | Un `fetch` dans `src/laboratoires/` fait échouer le lint |
| T1.6 Store et lecteur séquentiel (L) | `stores/laboratoire.js`, `LaboratoirePlayer.vue`, `editeur/*`, `execution/*`, `BandeauSimulation`, `CriteresReussite`, `IndicesCorrection` (réutilise `App*`, `useResponsive`) | `LaboratoirePlayer.spec.js`, `stores/laboratoire.spec.js` | Labo faisable entièrement au clavier ; journal en `aria-live` ; bandeau toujours visible ; fonds pastel ; `prefers-reduced-motion` respecté |
| T1.7 Pages et entrées (M) | `views/LaboratoiresPage.vue`, `views/LaboratoirePage.vue` ; `router/index.js`, `MenuLinks.vue`, `NavFooterMobile.vue`, `HomePage.vue`, `PageContent.vue`, `SitemapController.php` | `HomeAndAudience.spec.js`, `Laboratoires.spec.js`, PHPUnit du sitemap | « Pratiquer » seulement sur les cours cités ; labo fonctionnel hors ligne après une visite |
| T1.8 Vérification (S) | — | lint, Vitest, build ; `composer test` et `composer analyse` si du PHP a changé ; navigateur sur bureau, mobile 375 px, clavier, hors ligne | Compte rendu qui sépare code, local, CI et site déployé |

### Phase 2 — Éditeur graphique

État au 17 octobre 2026 : T2.1 à T2.3 présents dans le code et testés localement (Vitest, ESLint, build, navigateur sur l'application Vue servie seule). Non vérifié : site complet, tactile réel (seulement la souris et le clavier), CI.

Décisions : la vue en étapes reste la vue par défaut ; la vue graphique est proposée à partir de 1024 px et prend alors toute la largeur (contrôles et journal dessous). Vue Flow est une projection du store : chaque geste (relier, déplacer, supprimer) devient une action du store, avec le même historique et les mêmes contrôles. Si la vue graphique ne se charge pas (hors ligne avant toute visite), un message renvoie vers la vue en étapes. Les liens empruntés sont en trait plein vert, les chemins non pris en pointillés gris, sans animation. La condition accepte un deuxième test (« et » / « ou »).
- T2.1 (L) `editeur/GrapheVueFlow.vue` (import dynamique) et `adaptateurs/vueFlow.js` (pur, avec un test d'aller-retour sans perte). Le chunk principal ne doit pas grossir.
- T2.2 (M) Annuler/rétablir (20 états), suppression au clavier, duplication. Chaque action a son équivalent dans la vue séquentielle.
- T2.3 (M) `blocs/api.js` et `simulateurs/apiFictive.js` (réponses 200, 404, 500), labos 3 et 6. Test : un espion vérifie que `fetch` n'est jamais appelé.

### Phase 3 — Agents, outils, MCP, sécurité (simulés)

État au 17 octobre 2026 : T3.1 à T3.4 présents dans le code et testés localement (Vitest, ESLint, build, navigateur sur l'application Vue servie seule : labo 11 au clavier en 375 px, labo 7 en vue graphique, aucune requête hors de l'hôte local). Non vérifié : site complet, CI, relecture éditoriale des quatre labos.

Décisions :
- Le « modèle » simulé est commun au laboratoire (`simulateurs.agent` : règles `si / alors`, `parDefaut`). L'apprenant règle ce que l'agent voit (`contexte`), sa consigne et les outils proposés ; les règles sont affichées dans le panneau du bloc (« Comment le simulateur décide »). Une règle qui demande un outil non proposé est écartée et le journal le dit. Une règle marquée `injection` remplace l'option `suitInstructionsDansDonnees` prévue : le journal signale la consigne cachée suivie.
- L'agent ne fait qu'une demande d'outil (`agent.appel`) ; le bloc Outil vérifie les arguments selon les paramètres déclarés et l'exécute. Pas de contrôle d'accès bloquant sur les outils en écriture : le journal avertit quand personne n'a validé, et la protection s'apprend dans le labo 11 (outil retiré + validation humaine).
- Validation humaine : statut `attente_humaine`, `repondreValidation`. En vérification automatique, la décision vient du jeu de données (`decisionHumaine`, refus par défaut).
- Le serveur MCP fictif est simplifié : `initialize` exigé avant les autres méthodes, erreurs JSON-RPC -32600, -32601 et -32602 ; pas de notification `initialized`. Les arguments JSON sont lus avant de remplir les `{{…}}`, pour qu'une donnée ne puisse pas en casser la forme.
- Ordre du catalogue : intermédiaire 1 JSON et API, 2 premier agent, 3 outils, 4 MCP ; avancé 1 injection et permissions.
- T3.1 (M) Agent par règles `si / alors`, option `suitInstructionsDansDonnees` pour la démonstration d'injection, explication « règle n° X appliquée ».
- T3.2 (M) Outils fictifs (arguments vérifiés selon un schéma, permission lecture ou écriture) et validation humaine (Approuver / Refuser).
- T3.3 (M) `mcpFictif.js` et `blocs/mcp.js`, panneau des messages JSON-RPC. Test : aucune référence à `/mcp`.
- T3.4 (L) Labos 4, 5, 7 et 11.

### Phase 4 — RAG, mémoire, débogage

État au 17 octobre 2026 : T4.1 à T4.3 présents dans le code et testés localement (Vitest, ESLint, build, navigateur sur l'application Vue servie seule : labo 9 fait entièrement dans l'interface en 375 px, labo 8 pas à pas). Non vérifié : site complet, CI, relecture éditoriale des trois labos.

Décisions :
- Recherche fictive : score = part des mots de la question (sans accents, mots vides ni « s » final) présents dans le passage ; tri par score puis par ordre des documents ; réglages `topK` (1 à 5) et score minimal. Le bloc range `passages`, `sources` (identifiants) et `citations` (texte) pour que l'agent cite sa source.
- Mémoire : un bloc qui retient, relit ou oublie, dans l'état de l'exécution (10 souvenirs au plus) ; elle repart vide à chaque exécution. Chaque mise en mémoire est tracée, d'où le critère `donneeNonMemorisee` (une donnée du jeu n'est jamais retenue, même dans un objet).
- La conversation du labo 9 est rejouée en une exécution ; une transformation verrouillée retire le premier message pour figurer la fenêtre de contexte.
- Ordre des labos avancés : 1 RAG, 2 mémoire, 3 débogage, 4 injection et permissions. Le catalogue (chunk partagé, aussi chargé par l'encart « Pratiquer » des cours) passe à 80 Ko, 18,6 Ko compressé.
- T4.1 (M) `blocs/rag.js` et `rechercheFictive.js` : passages, score, `topK`, sources.
- T4.2 (S) `blocs/memoire.js` : mémoire limitée à une exécution.
- T4.3 (L) Labos 8, 9 et 10.

### Phase 5 (facultative) — Labos en base, rédigés par le connecteur
- **Backend** : entité `Laboratoire` (définition JSON, statut, destinataires), nouvelle migration, ressource API Platform filtrée par `PublishedContentExtension`, CRUD EasyAdmin, validation par le même schéma.
- **Connecteur** : outils MCP brouillon → contrôles (`CLE_API`, `PersonalDataChecker`, domaines fictifs) → relecture par un autre connecteur → publication, sur le modèle de `QcmDraftService`.
- **Front** : fusion des labos du code et de ceux de l'API, cache vidé à la déconnexion.

### Phase 6 (hors première version) — Mode IA réelle
- Endpoint Symfony séparé : clé côté serveur, `symfony/rate-limiter`, quotas, entrée bornée, aucune journalisation du contenu, désactivé par défaut.
- À cadrer dans ce plan et dans `regles/` avant de commencer.

## 7. Risques et parades

| Risque | Parade |
|---|---|
| Poids de Vue Flow sur une connexion faible | Chargé à la demande, seulement en vue graphe ; la vue séquentielle suffit pour tout faire |
| Édition graphique sur mobile | Vue séquentielle par défaut sous `lg` ; graphe en lecture seule sur mobile si nécessaire |
| Accessibilité d'un canevas | Vue séquentielle complète, tableau des liens, journal en `aria-live`, états écrits en texte |
| Hors ligne sans visite préalable | Définitions incluses dans le chunk ; bouton « Préparer pour le hors-ligne » en phase 2 |
| Boucles et workflows pathologiques | Cycles refusés ; plafonds sur les étapes, les nœuds et la taille des données |
| Exécution de code, XSS | Mini-langage déclaratif, lint dédié, JSON affiché en texte (jamais `v-html`) |
| Confusion simulateur / MCP réel / RAG réel | Dossiers séparés, nommage « fictif », bandeau, test d'absence de réseau |
| Démonstration d'injection réutilisable | `LAB-05` : un cas fictif, réussite centrée sur la défense |
| Évolution du format JSON | Champ `schema`, tests du catalogue, migrations du format dans `catalogue/index.js` |

**Reporté** : boucles et itérations, exécution en parallèle, sauvegarde du workflow de l'apprenant (au mieux un export ou import de fichier, jamais sur le serveur), partage, éditeur de labos dans le back-office, statistiques, attestations.

## 8. Vérification à chaque phase

1. `npm run lint --prefix front && npm test --prefix front && npm run check --prefix front`, et `make check` si du PHP est touché.
2. `make up`, puis `http://localhost:8096/spa/laboratoires` : faire un labo au clavier seul ; mobile 375 px ; hors ligne après une visite ; vérifier dans l'onglet Réseau qu'aucune requête ne part pendant l'exécution.
3. « Pratiquer » présent sur un cours cité et absent sur les autres.
4. Taille de `public/build/assets` comparée avant et après.
