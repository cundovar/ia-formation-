# Plan : diaporamas de cours et de chapitre

Proposition du 26 octobre 2026, **validée par le porteur du projet le 26 octobre 2026** (décisions au § 11). Elle ajoute une fonction au périmètre de `PLAN_APP_FORMATION_IA.md`. Les règles nouvelles (`DIA-*`) restent à valider par le responsable éditorial, comme le reste de `regles/`.

## 1. Objectif

Proposer, pour un cours et pour un chapitre, un **diaporama prêt à projeter** (.pptx, et .pdf pour imprimer ou lire sans PowerPoint), au design soigné et identique d'un diaporama à l'autre. Le contenu est une **synthèse pensée pour la présentation**, pas une copie du cours : une idée par diapositive, peu de texte à l'écran, le détail dans les notes de la personne qui présente.

Public visé en premier : les formateurs, médiateurs et enseignants (entrée « Je forme à l'IA »), qui animent un atelier à partir d'un cours. Une personne qui apprend seule peut aussi s'en servir comme fiche de révision.

## 2. Principes

- **L'IA résume, le site met en forme.** Le site n'a pas d'IA à lui et ne finance aucun appel (décision de `LAB-08` et du plan général). La synthèse est donc rédigée par un agent, par le connecteur MCP de rédaction, comme les cours et les QCM. Le site garde un contenu **structuré** (des diapositives, pas un fichier) et lui applique un **thème fixe** : le design ne dépend jamais de l'agent.
- **Même circuit que les cours et les QCM** : brouillon, contrôles automatiques, relecture favorable par un autre connecteur, publication. Un diaporama publié reste modifiable par l'agent.
- **Le fichier .pptx est construit dans le navigateur** (bibliothèque libre PptxGenJS, chargée seulement au clic) : aucune charge pour l'hébergement mutualisé OVH, aucun fichier stocké sur le serveur, fonctionne hors ligne pour un module préparé.
- **Un diaporama suit son cours** : il n'est visible que si le cours (ou le chapitre) est publié, et réservé aux mêmes personnes qu'un contenu réservé (`PublishedContentExtension`).
- **Rien n'est copié tel quel** : un contrôle bloque les points repris mot pour mot du cours (voir `DIA-02`).

## 3. Ce qu'on produit

| Cible | Source de la synthèse | Taille visée |
|---|---|---|
| Cours (`PageContent`) | le texte du cours | 6 à 12 diapositives |
| Chapitre (`Menus`, groupe de cours d'un parcours) | tous les cours publiés du chapitre | 10 à 20 diapositives |

Le diaporama d'un chapitre est une **vraie synthèse** du chapitre (fil conducteur, notions communes, progression), pas la suite des diaporamas de ses cours. Il n'est créé et publié que lorsque **tous les cours du chapitre sont publiés** (décision du 26 octobre 2026).

## 4. Format d'un diaporama (contenu structuré)

```json
{
  "titre": "Bien écrire une consigne",
  "sousTitre": "Atelier de 45 minutes",
  "diapositives": [
    { "modele": "objectifs", "titre": "Ce que vous saurez faire", "points": ["Écrire une consigne claire", "Vérifier la réponse obtenue"], "notes": "…" },
    { "modele": "etapes", "titre": "Une consigne en 4 temps", "points": ["Le rôle", "La tâche", "Le contexte", "Le format attendu"], "notes": "…" },
    { "modele": "capture", "titre": "Exemple dans l'outil", "capture": 42, "points": ["La consigne est précise"], "notes": "…" },
    { "modele": "a_retenir", "titre": "À retenir", "points": ["…"], "notes": "…" }
  ]
}
```

Modèles de diapositive (le thème leur donne une mise en page fixe) :

| Modèle | Usage | Contenu |
|---|---|---|
| `titre` | première diapositive | titre, sous-titre, public, durée indicative |
| `objectifs` | ce que l'on saura faire | 2 à 4 points |
| `notion` | une idée, une définition | titre, 1 à 4 points, pictogramme facultatif |
| `etapes` | une démarche | 2 à 5 étapes numérotées |
| `comparaison` | deux colonnes (à faire / à éviter, avant / après) | 2 listes de 1 à 4 points |
| `capture` | montrer l'outil | une capture du back-office (`[capture:ID]`), 0 à 2 points |
| `exercice` | faire pratiquer (`POS-06`) | consigne d'activité, durée |
| `question` | question de QCM ou de discussion | question, 2 à 4 réponses, réponse dans les notes |
| `a_retenir` | synthèse | 2 à 5 points |
| `fin` | clôture | lien vers le cours complet, sources, date |

Champs de chaque modèle (référence : `front/src/diaporamas/modeles.js`) : `points` (liste de textes) ; `comparaison` : `colonnes` (deux objets `{ titre, points }`) ; `capture` : `capture` (identifiant de la capture) ; `exercice` : `consigne`, `duree` (minutes) ; `question` : `question`, `reponses` ; `fin` : `lien`, `sources` (objets `{ libelle, url }`), `date` ; `titre` : `sousTitre`, `public`, `duree`. Le diaporama porte aussi `audience` (`apprendre` ou `former`), qui donne la couleur du thème.

Chaque diapositive a des **notes de présentation** : c'est là que va le détail du cours, reformulé à l'oral.

## 5. Règles éditoriales à ajouter (`regles/08-diaporamas.md`)

- **DIA-01 — Une idée par diapositive.** Titre de 60 caractères au plus ; 5 points au plus ; 12 mots au plus par point ; pas de phrase complète à l'écran quand un groupe de mots suffit.
- **DIA-02 — Synthétiser, pas copier.** Les points reformulent ; aucun passage de plus de 8 mots repris à l'identique du cours sur une diapositive. Le texte détaillé va dans les notes.
- **DIA-03 — Le détail dans les notes.** Chaque diapositive (sauf `titre` et `fin`) a des notes de 300 à 900 caractères, en langage clair (`RED-01`), qui permettent à quelqu'un d'autre de présenter.
- **DIA-04 — Faire pratiquer.** Un diaporama de cours « apprendre » contient au moins une diapositive `exercice` ou `question` (`POS-06`).
- **DIA-05 — Accessible.** Contraste suffisant, texte de 24 points au moins, chaque capture avec son texte alternatif (`CAP-*`), un titre par diapositive pour la lecture d'écran, ordre de lecture logique.
- **DIA-06 — Sources et neutralité.** La diapositive `fin` renvoie au cours complet et aux pages officielles citées ; aucun logo d'éditeur d'IA ; aucune donnée personnelle (`DON-*`).

## 6. Contrôles automatiques (`DiaporamaChecker`)

La liste de référence, complète, est dans `regles/controles.md` (section « Contrôles d'un diaporama »).

| Code | Règle | Niveau | Ce qui est vérifié |
|---|---|---|---|
| `DIAPO_NOMBRE` | `DIA-01` | bloquant | 6 à 12 diapositives (cours), 10 à 20 (chapitre) |
| `DIAPO_TITRE_LONG` | `DIA-01` | bloquant | titre de 60 caractères au plus |
| `DIAPO_TROP_DE_POINTS` | `DIA-01` | bloquant | 5 points au plus |
| `DIAPO_POINT_LONG` | `DIA-01` | avertissement | point de plus de 12 mots |
| `DIAPO_COPIE` | `DIA-02` | bloquant | aucun passage de plus de 8 mots identique au cours (comparaison de suites de mots, sans casse ni ponctuation) |
| `DIAPO_NOTES_MANQUANTES` | `DIA-03` | bloquant | notes présentes et assez longues |
| `DIAPO_SANS_PRATIQUE` | `DIA-04` | avertissement | une diapositive `exercice` ou `question` (cours « apprendre ») |
| `DIAPO_MODELE_INCONNU` | — | bloquant | modèle déclaré et champs attendus présents |
| `DIAPO_CHAPITRE_INCOMPLET` | — | bloquant | diaporama de chapitre : tous les cours du chapitre sont publiés |
| `CAPTURE_INCONNUE`, données personnelles (`TELEPHONE`, `IBAN`, `CLE_API`, `COURRIEL_REEL`…) | `CAP-02`, `DON-04` | bloquant | mêmes contrôles que pour un cours, appliqués aux points et aux notes |
| `RELECTURE_MANQUANTE`, `RELECTURE_DEFAVORABLE` | `RED-02` | bloquant (publication) | relecture favorable d'un autre connecteur |

**Cours modifié après la synthèse** : le diaporama garde l'empreinte du texte source. Si le cours change, le diaporama est signalé « à mettre à jour » (back-office et connecteur), sans être retiré.

## 7. Architecture

**Base de données** (nouvelle migration Doctrine) : entité `Diaporama`.
- cible : `cours` (`PageContent`, facultatif) **ou** `chapitre` (`Menus`, facultatif) ; exactement l'un des deux ;
- `titre`, `sousTitre`, `diapositives` (JSON) ;
- `statut` (`brouillon`, `en_revue`, `publie`), `auteur`, `rapportRelecture`, `reluPar`, `reluLe`, `publieLe` ;
- `empreinteSource` (empreinte du texte du cours ou du chapitre au moment de la synthèse) ;
- dates de création et de mise à jour.

**Connecteur de rédaction** (`src/Mcp/RedactionMcpServer.php`, `src/Service/Redaction/DiaporamaService.php`) :
- `creer_brouillon_diaporama` (cible, contenu), `modifier_brouillon_diaporama`, `voir_brouillon_diaporama`, `lister_brouillons_diaporama` ;
- `verifier_brouillon_diaporama` (contrôles), `enregistrer_relecture_diaporama` (autre connecteur), `publier_diaporama` ;
- consignes `rediger_diaporama` et `relire_diaporama`, comme `rediger_qcm` et `relire_qcm`.
- Le connecteur fournit à l'agent le texte du cours ou du chapitre, les règles `DIA-*` et la liste des modèles.

**API publique** : `GET /api/diaporamas?cours={id}` et `?chapitre[]={id}&chapitre[]={id}` (plusieurs chapitres d'un parcours en une requête) ; chaque élément de `member` porte `titre`, `sousTitre`, `audience` (facultatif : sinon celle du parcours), `diapositives`, et sa cible `cours` ou `chapitre` (identifiant ou IRI). C'est le format attendu par le front (`front/src/services/diaporamas.js`), filtrée par `PublishedContentExtension` (diaporama publié, cible publiée, accès réservé respecté). Les brouillons n'y apparaissent jamais.

**Back-office** : liste des diaporamas, aperçu, correction d'un point ou d'une note, retrait de la publication, mention « à mettre à jour ».

**Front** (`front/src/diaporamas/`) :
- `theme.js` : couleurs pastel du site, polices, marges, tailles, format 16/9 ; un masque de diapositive par modèle ;
- `construirePptx.js` : fonction qui reçoit le contenu structuré et le thème, et renvoie le fichier ; PptxGenJS chargé à la demande (import dynamique), pour garder les pages légères ;
- boutons « Télécharger le diaporama (.pptx) » et « Version PDF » sur la page d'un cours et sur la page d'un parcours (par chapitre) ;
- PDF : vue « impression » des mêmes diapositives (HTML et CSS d'impression, une diapositive par page, notes en dessous en option), enregistrée en PDF par le navigateur ; aucune bibliothèque supplémentaire ;
- aperçu facultatif dans la page (vignettes HTML), pour vérifier avant de télécharger ;
- captures intégrées au fichier depuis le site (mêmes images optimisées, texte alternatif repris) ;
- hors ligne : le contenu du diaporama entre dans le cache du module préparé ; le cache est vidé à la déconnexion.

## 8. Design du thème

- **Format** 16/9, marges larges, une grille commune à tous les modèles.
- **Couleurs** : fonds blancs ou pastel, bandeau de la couleur du public (bleu pour « apprendre », vert pour « former »), texte foncé ; jamais de fond foncé ni saturé (règle des fonds d'interface).
- **Typographie** : titres 36 à 40 points, texte 24 à 28 points, police **Arial** (décision du 26 octobre 2026). PowerPoint n'intègre pas les polices web ; Arial est présente sous Windows et macOS, et remplacée à l'identique (mêmes largeurs) par Liberation Sans sous LibreOffice et Arimo dans Google Slides. La version PDF peut utiliser Atkinson Hyperlegible, comme le site.
- **Repères** : numéro de diapositive, titre du cours en pied de page, pictogrammes simples ; aucune marque d'éditeur d'IA.
- **Licence** : mention « Licence CC BY-SA 4.0 : vous pouvez réutiliser et modifier ce diaporama, en citant la source et en partageant vos modifications sous la même licence » sur la diapositive `fin` et dans les propriétés du fichier.
- **Accessibilité** : chaque diapositive a un titre dans l'emplacement prévu par PowerPoint, textes alternatifs des images, ordre de lecture du haut vers le bas.

## 9. Tâches

- D0 (S) **Décisions** (faites le 26 octobre 2026, § 11) ; mise à jour de `PLAN_APP_FORMATION_IA.md` et `AGENTS.md`.
- D1 (S) **Règles** : `regles/08-diaporamas.md`, ajouts à `regles/controles.md` et `regles/README.md` ; validation éditoriale avant D3.
- D2 (M) **Thème et générateur** (fait le 26 octobre 2026) : `front/src/diaporamas/` (thème, modèles, `construirePptx.js`). Tests Vitest : chaque modèle produit les bons éléments, aucune diapositive vide, textes alternatifs présents. Revue visuelle d'un diaporama de démonstration en données fictives.
- D3 (M) **Entité et migration** (fait le 26 octobre 2026 : `src/Entity/Diaporama.php`, `DiaporamaChecker`, `DiaporamaSource`) `Diaporama` ; `DiaporamaChecker` et ses tests PHPUnit (dont `DIAPO_COPIE`).
- D4 (M) **Connecteur** (fait le 26 octobre 2026 : `src/Service/Redaction/DiaporamaService.php`, outils `*_diaporama` et consignes `rediger_diaporama`, `relire_diaporama`) : outils et consignes, relecture par un autre connecteur, publication. Tests du service.
- D5 (S) **API publique** (fait le 26 octobre 2026 : `/api/diaporamas?cours=` et `?chapitre[]=`, lecture seule) et filtrage dans `PublishedContentExtension` ; le plan du site n'a pas d'entrée propre (le diaporama est servi sur la page du cours ou du parcours) et le cache hors ligne suit celui de l'API. Tests d'accès (brouillon invisible, contenu réservé).
- D6 (M) **Front** (fait le 26 octobre 2026 ; branché sur l'API depuis D5) : boutons de téléchargement .pptx et version PDF (cours, chapitre), aperçu, hors ligne. Tests Vitest et vérification sur mobile, au clavier et en connexion lente.
- D7 (S) **Back-office** (fait le 26 octobre 2026 : `DiaporamaCrudController`, guide dans `docs/EDITION.md`) : liste, aperçu, correction, mention « à mettre à jour ».
- D8 (S) **Essai réel** : un diaporama de cours et un de chapitre rédigés par un agent, relus par l'autre connecteur, ouverts dans PowerPoint, LibreOffice Impress et Google Slides.

## 10. Risques et parades

- **Synthèse trop proche du cours** : contrôle `DIAPO_COPIE`, relecture par un autre connecteur, règle `DIA-02`.
- **Diaporama périmé après une correction du cours** : empreinte de la source, mention « à mettre à jour ».
- **Rendu différent selon le logiciel** (PowerPoint, LibreOffice, Google Slides) : modèles simples, police répandue, essai sur les trois en D8.
- **Poids du fichier** : captures déjà optimisées, PptxGenJS chargé seulement au clic.
- **Confusion avec un support officiel d'un éditeur d'IA** : aucun logo, mentions de non-affiliation en diapositive `fin`.

## 11. Décisions (26 octobre 2026)

1. **Police** : Arial dans le .pptx (rendu fiable partout, voir § 8) ; Atkinson Hyperlegible possible dans la version PDF. Choix laissé à l'agent de développement par le porteur du projet.
2. **Licence** : les formateurs peuvent réutiliser et modifier les diaporamas. Licence retenue : **CC BY-SA 4.0** (citer la source, partager les modifications sous la même licence). À changer en CC BY 4.0 si le porteur du projet ne veut pas imposer le partage à l'identique.
3. **PDF** : oui, en plus du .pptx, par une vue d'impression des mêmes diapositives.
4. **Chapitre** : son diaporama attend que tous les cours du chapitre soient publiés (contrôle `DIAPO_CHAPITRE_INCOMPLET`).

## 12. Hors de ce plan

- Génération automatique par le site sans agent (le site n'a pas d'IA).
- Modification du design par l'agent : il choisit seulement l'identifiant d'un thème du site (`standard`, `atelier_visuel`), jamais une couleur, une police, une position ni du code (décision du 21 novembre 2026, § 13).
- Animations libres, transitions complexes, vidéos intégrées : seules les six scènes déclaratives du catalogue sont animées (§ 13).

## 13. Diaporamas de parcours et scènes animées (21 novembre 2026)

### 13.1 Décisions

1. **Trois cibles** : un cours, un chapitre ou un **parcours entier**. Le diaporama d'un parcours est une synthèse du parcours ; il ne remplace pas les diaporamas des modules, que la page du parcours continue d'afficher dans chaque chapitre. Le panneau « Présentation du parcours » est placé au-dessus des chapitres.
2. **Parcours partiellement rédigé** : un diaporama de parcours est permis dès qu'un cours est publié. Il s'appuie sur les seuls cours publiés et ouverts à tous (un cours réservé n'y entre pas), annonce sa couverture (« 3 cours rédigés sur 18 », `DIA-10`, avertissement `DIAPO_COUVERTURE_PARTIELLE`) et garde l'inventaire des cours et de leur statut au moment de la synthèse (`coursSources`).
3. **Thèmes** : l'agent choisit un identifiant, `standard` (thème d'origine) ou `atelier_visuel` (fond crème, schéma au centre, encadrés en bas, ouverture et activité dédiées, lecture mobile empilée). `DIA-05` est reformulée en ce sens.
4. **Scènes animées** : six scènes déclaratives (escalier, chaîne de traitement, aiguillage, entonnoir, loupe, sas de validation), décrites dans le catalogue versionné `regles/scenes/catalogue.json`, lu par le site et par le connecteur. Une scène est facultative, justifiée (`DIA-07`), validée (`DIA-08`) et a un équivalent fixe (`DIA-09`).
5. **Démonstration** : `/spa/diaporamas/demonstration`, réservée aux administrateurs (et au serveur de développement), hors navigation et hors plan du site. Le pilote « Automatiser des tâches avec l'IA » (3 diapositives) et la galerie des six scènes y sont marqués « Proposition » ; ils ne sont pas en base et ne sont pas publiés.

### 13.2 Architecture

- **Moteur** (`front/src/diaporamas/scenes/`) : fonctions pures, sans Vue ni réseau (règle ESLint). `etats(données, {zone, couleurs, variante})` renvoie des étapes `{legende, court, elements}` ; chaque élément a un identifiant stable, ce qui permet au rendu web d'animer le passage d'une étape à l'autre. L'équivalent fixe est la dernière étape et ses légendes numérotées.
- **Validation** : `front/src/diaporamas/scenes/valider.js` et `src/Service/Redaction/SceneValidator.php` appliquent la même logique au même catalogue, testée par Vitest et PHPUnit sur `regles/scenes/exemples/` (valides et invalides).
- **Thème Atelier visuel** : `front/src/diaporamas/themes/atelierVisuel.js` centralise couleurs, tailles, espacements et zones (16:9 et lecture étroite) ; `miseEnPageAtelier.js` place les éléments.
- **Rendus** depuis le même contenu structuré :
  - web : `ProjectionDiaporama.vue` (étapes, rejouer, variantes simulées, vue fixe légendée, lecture sans mouvement, plein écran, notes hors de la zone projetée, clavier) ; route `/spa/diaporamas/:id/projection` et aperçu administrateur `/spa/diaporamas/apercu/:id` ;
  - .pptx : formes modifiables (rectangles arrondis, trapèze, flèches, pointillés, atténuation) ; vue fixe, ou une diapositive par étape quand le catalogue le prévoit (`rendus.pptx`), avec « Étape n/N » en tête des notes : PowerPoint, LibreOffice et Google Slides n'ont pas d'animation commune fiable ;
  - PDF : vue d'impression avec la vue fixe, puis les étapes numérotées (sur une page qui suit la diapositive, ou sous les notes au format A4).
- **Serveur** : entité `Diaporama` (cible `parcours`, `theme`, `objectif`, `coursSources`, migration `Version20261121100000`), contrôles `DIAPO_THEME_INCONNU`, `DIAPO_SCENE_*`, `DIAPO_PARCOURS_VIDE`, `DIAPO_COUVERTURE_PARTIELLE`, `DIAPO_SCENES_NOMBREUSES` ; outil `lister_scenes`, ressource `scenes:///catalogue.json`, `parcoursId`, `theme`, `objectif` et `scene` dans les outils ; aperçu `GET /api/apercu-diaporamas/{id}` (administrateurs, jamais mis en cache) ; filtre `?parcours=` de l'API publique.

### 13.3 Contrôles : à l'enregistrement ou dans le navigateur

| Contrôle | Quand | Où |
| --- | --- | --- |
| Modèle, champs, références, version, HTML ou script refusés | À l'enregistrement | `SceneValidator` (serveur), `valider.js` (site) |
| Longueurs et nombres d'éléments, 3 points de 44 caractères au plus avec une scène | À l'enregistrement | Catalogue, `DiaporamaChecker` |
| Tenue des textes aux limites maximales, absence de chevauchement, contraste (4,5:1 texte, 3:1 traits) | À chaque changement du code | Tests Vitest (`scenes.spec.js`), estimation de la largeur des textes |
| Débordement, sortie du cadre, chevauchement réels | Dans le navigateur | Bouton « Vérifier toutes les diapositives » de l'aperçu (`controleRendu.js`) |
| Pertinence de la scène, fidélité au cours, couverture annoncée | Relecture | Autre connecteur (`relire_diaporama`) |

### 13.4 Outils spécialisés évalués

Le besoin réel (six scènes 2D, étapes discrètes, équivalent fixe, exports .pptx et PDF, hors ligne, données validées) ne dépasse pas ce que font le CSS et le SVG. Aucun outil n'est retenu ; à réexaminer si une scène demande un mouvement continu ou une illustration riche.

| Outil | Édition | Poids | Hors ligne | Accessibilité | Exports .pptx / PDF | Conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| Moteur du site (CSS, SVG, données JSON) | Par données validées ; aucun code | Aucune dépendance ajoutée | Oui (dans le bundle) | Étapes annoncées, vue fixe, mouvement réduit | Formes natives modifiables | Retenu |
| Lottie (lottie-web) | Animation dessinée dans un outil externe (After Effects) | Lecteur de plusieurs centaines de Ko | Oui | Contenu en image : légendes à doubler | Pas de formes modifiables | Écarté |
| Rive | Éditeur en ligne, machine à états | Moteur WebAssembly | Oui | Canvas : légendes à doubler | Pas d'export .pptx | Écarté |
| GSAP | Code JavaScript par scène | Quelques dizaines de Ko | Oui | À la charge du code | Aucun | Écarté : du code par scène, contraire à DIA-08 |
| Remotion, Motion Canvas | Code React ou TypeScript, rendu vidéo | Chaîne de rendu lourde | Vidéo seulement | Vidéo : sous-titres à prévoir | Vidéo, pas de formes | Écarté |
| reveal.js | HTML des diapositives | Moyen | Oui | Bonne en HTML | Export PDF ; pas de .pptx | Écarté : doublerait le moteur du site |

### 13.5 Tâches

- S1 (fait) Thème Atelier visuel et trois diapositives du pilote ; vérifiées à l'écran, en 16:9 et sur mobile (375 px).
- S2 (fait) Catalogue, moteur et six scènes ; galerie de démonstration ; tests Vitest (déterminisme, limites, contrastes, variantes).
- S3 (fait) Entité, migration, contrôles et règles `DIA-07` à `DIA-10` ; tests PHPUnit.
- S4 (fait) Connecteur : `lister_scenes`, `parcoursId`, `theme`, `scene`, consignes en 5 temps ; aperçu administrateur ; API `?parcours=` ; tests fonctionnels (brouillon, scène invalide refusée, relecture par un autre connecteur, parcours réservé).
- S5 (fait) Exports .pptx et PDF des scènes ; conversion LibreOffice et impression Chrome vérifiées localement.
- S6 (fait) Panneau « Présentation du parcours » sur la page du parcours.
- S7 (à faire) Validation éditoriale de `DIA-07` à `DIA-10` et du catalogue ; essai réel d'un diaporama de parcours rédigé par ia2 et relu par l'autre connecteur ; ouverture dans PowerPoint et Google Slides (non vérifiée).
