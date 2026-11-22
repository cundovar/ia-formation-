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

## 14. Préparer avant d'écrire : brief, scénario, visuels, compositions et contrôle du rendu (21 novembre 2026)

### 14.1 Ce qui existait et ce qui a été ajouté

| Besoin | Avant | Ajouté |
| --- | --- | --- |
| Cadrer la demande | Objectif et thème seulement | **Brief** (`DiaporamaBrief.php`) : public, durée, objectif, contexte professionnel, thème, intention ; proposé par `preparer_diaporama` avec l'origine de chaque valeur déduite, statut `propose` puis `confirme` |
| Construire la progression | Aucune étape entre la source et les diapositives | **Scénario** (`DiaporamaScenario.php`) : 2 à 8 parties (transition, démonstration, vérification, activité, durée, sources, visuels) ; `verifier_scenario_diaporama` ; chaque diapositive porte `scenarioPartie` |
| Choisir les images | Liste des captures du site | **Inventaire des visuels des cours** (`DiaporamaVisuels.php`) : fiche complète, cours et passage, indice d'interface simulée tiré de la légende ; `voir_visuel` renvoie un aperçu réduit |
| Varier la mise en page | 10 modèles, très textuels | **Cinq compositions** de l'Atelier visuel (exemple commenté, avant/après, démonstration en étapes, étude de cas, séparateur), décrites dans `regles/diaporamas/modeles.json` (lu par `ModeleCatalogue.php` et `front/src/diaporamas/modeles.js`) ; mise en page dans `front/src/diaporamas/compositions.js` |
| Guider les scènes | Catalogue et justification | Champ `notion`, rendus web, .pptx et PDF annoncés par modèle ; la démonstration réutilise le rendu par étapes des scènes |
| Vérifier le rendu | Bouton manuel, résultat non gardé | **Boucle de contrôle** : mesure à l'ouverture de l'aperçu (16:9 et étroit), rapport structuré enregistré (`POST /api/apercu-diaporamas/{id}/controle-rendu`, CSRF), empreinte du contenu, avertissements `DIAPO_RENDU_*` relus par `verifier_diaporama` |

Entité : `brief`, `scenario` et `controle_rendu` (JSON, migration `Version20261122100000`), hors API publique. Un ancien diaporama reste valide : l'absence de brief ou de scénario n'est qu'un avertissement.

### 14.2 Trois niveaux de contrôle

| Niveau | Exemples | Effet |
| --- | --- | --- |
| Automatique et fiable (serveur, sans navigateur) | Champs et limites des compositions, partie de scénario inconnue, source hors cible, visuel inexistant | Bloquant |
| Mesuré dans le navigateur | Débordement, sortie du cadre, chevauchement, par diapositive et par élément | Avertissement (dépend du navigateur et des polices) |
| Relecture éditoriale | Fidélité au cours, pertinence du fil rouge et des visuels, interface simulée bien annoncée | Avis de l'autre connecteur, puis du responsable éditorial |

### 14.3 Décisions

1. Le serveur propose le brief, la personne le confirme : l'agent n'invente ni le contexte professionnel ni la durée.
2. Aucune capture n'est créée pour un diaporama : seules les captures du back-office, de préférence celles des cours exploités (`DIA-12`).
3. Le .pptx garde des diapositives fixes : une démonstration y devient une diapositive par étape (« Étape n/N »), jamais une animation PowerPoint native.
4. Pilote : chapitre 19 « 3. Utiliser Microsoft 365 Copilot », fil rouge fictif (Outlook, Teams, Word, Excel), gardé dans le code (`front/src/diaporamas/pilote/copilot-fil-rouge.json`) et appliqué en brouillon au diaporama existant du chapitre, sans publication.

### 14.4 Tâches

- T1 (fait) Brief, scénario, entité et migration ; contrôles `DIAPO_BRIEF_*`, `DIAPO_SCENARIO_*` ; tests PHPUnit.
- T2 (fait) Inventaire des visuels et `voir_visuel` ; tests fonctionnels.
- T3 (fait) Catalogue des modèles et cinq compositions ; validation serveur (`DIAPO_MODELE_CHAMP_LONG`) et rendu web, .pptx et PDF ; tests Vitest aux longueurs maximales.
- T4 (fait) Contrôle du rendu enregistré et relu par le connecteur ; tests.
- T5 (fait) Consignes `rediger_diaporama` (7 temps) et `relire_diaporama` mises à jour ; règles `DIA-11` à `DIA-13`.
- T6 (à faire) Validation éditoriale de `DIA-11` à `DIA-13` ; relecture du pilote par l'autre connecteur ; ouverture des exports dans PowerPoint et Google Slides.

### 14.5 Limites connues

- L'indice « interface simulée » ne lit que la légende et le texte alternatif.
- Le contrôle du rendu n'a lieu que lorsqu'un administrateur ouvre l'aperçu ; ses mesures varient selon le navigateur et les polices installées.
- Le .pptx n'a pas été ouvert dans PowerPoint ni dans Google Slides ; seule la conversion LibreOffice est vérifiable localement.

## Pilote TPE, module 9

Le brief peut enregistrer une direction visuelle dans `brief.visuel`, avec
la palette, la typographie, les références, le style des schémas et la
préférence d’illustration. Ces champs guident les choix dans le thème du
site. Le pilote de devis fictif est accessible dans la démonstration des
diaporamas, onglet « Deux diapositives test · TPE ».

La consigne de rédaction place la validation de deux diapositives test
avant la rédaction de la série. Ce jalon est éditorial. L’aperçu relève les
débordements et les superpositions ainsi que le texte pédagogique sous
24 points. La hiérarchie, la cohérence et la densité se jugent sur le rendu.

Pour le pilote, le web anime les étapes du schéma, le PPTX les décline en
diapositives fixes avec formes et textes éditables, et le PDF donne une
vue fixe avec les légendes. Les animations PowerPoint natives restent à
qualifier séparément.

## Atelier visuel v3 — proposition du 22 novembre 2026

**Statut : direction visuelle validée le 22 novembre 2026** sur les deux
diapositives test (maquettes Penpot, page « Atelier visuel v3 »). Première
implémentation dans le moteur : thème versionné `atelier_visuel_v3`
(`front/src/diaporamas/themes/atelierVisuelV3.js`, jetons recopiés de Penpot),
compositions « convergence » (quatre blocs reliés à la bulle) et « circuit »
(trois étapes, contrôle humain) dans `miseEnPageV3.js`, catalogue d’icônes
`regles/diaporamas/icones.json`, pilote `pilote/devis-tpe-v3.json`. Révélation :
le web montre un bloc ou une étape par appui (clavier ou clic, sans mouvement si
la préférence le demande) ; le PDF imprime la vue fixe suivie des étapes
légendées ; le PPTX garde une diapositive fixe aux formes et textes modifiables,
étapes dans les notes. Les autres modèles et la lecture étroite suivent encore
Atelier visuel ; le contrat MCP (étape 2 et suivantes) reste à brancher. Référence
graphique : [maquette Penpot locale](http://localhost:9001/#/workspace?team-id=9b657248-8f9f-81e1-8008-c91089ea6788&file-id=4911bca2-c422-8010-8008-fb5075a6a325&page-id=b08f8722-b968-8006-8008-fb543d43a4bf).

L’agent fournit le contenu et sa structure. Le site choisit les compositions,
alterne les dispositions compatibles, calcule la numérotation et applique
les couleurs, rayons, ombres et motifs du thème. Il mesure le texte pour
ajuster le surlignage et les cartes. Une fois la maquette validée, ses jetons
seront reportés dans le thème versionné. Penpot sert de référence de conception.

| Donnée proposée | Contrôle du MCP et comportement du site |
|---|---|
| Parties ordonnées | Réutiliser `scenario.parties` et les identifiants `scenarioPartie` déjà présents. Pour la v3, quatre parties au plus. Chaque diapositive référence une partie connue et suit l’ordre déclaré. Le site insère les séparateurs et affiche la progression. |
| `motCle` | Un passage de trois mots au plus, présent tel quel dans le titre. Surlignage mesuré par le site, avec mise en couleur du texte si la mesure échoue. |
| `points` structurés | Accepter les phrases existantes et les objets `{titre, texte, icone}`. Titre de quatre mots au plus et texte d’environ 90 caractères, sous réserve des limites du modèle. |
| Catalogue d’icônes | Ajouter `regles/diaporamas/icones.json` et `lister_icones`. Les identifiants décrivent un sens. Valider leur appartenance au catalogue côté serveur et côté rendu. Les dessins proviennent du site. |
| `miseEnAvant` | Index valide d’un point essentiel. Le site souligne une seule carte, la première par défaut. |
| `chiffres_cles` | Valeur, unité, libellé, texte, proportion éventuelle et nature `repere` ou `statistique`. Afficher la nature. Pour une statistique, exiger une source issue d’un cours utilisé et vérifier la concordance du chiffre, de l’unité et du contexte à la relecture. |
| Visuel d’étape | Référencer une capture ou une illustration du back-office et justifier son utilité selon DIA-12. Réutiliser le champ `capture` des étapes de démonstration ou documenter une correspondance si le contrat v3 expose `visuel`. Afficher l’icône du catalogue en l’absence de visuel. |

Parcours prévu : lire les sources avec `preparer_diaporama`, proposer le brief
et le scénario, contrôler le scénario avec `verifier_scenario_diaporama` et
valider la direction sur deux diapositives test selon DIA-14. Créer ensuite
le brouillon. L’aperçu relève les défauts de rendu et `verifier_diaporama`
renvoie les constats par diapositive. Après correction, un autre connecteur
relit le brouillon avant publication.

Avant de généraliser, comparer au pilote TPE dans le web, le PDF et le PPTX.
Vérifier en particulier l’enchaînement des parties, la place du surligneur,
la lisibilité des cartes, la compatibilité des anciens contenus et la
distinction entre repère pédagogique et statistique.

### Plan d’implémentation v3

1. **Valider le rendu avant de généraliser.** Relever dans Penpot les jetons
   et les compositions de la maquette. Construire dans le moteur deux
   essais pour le module 9, parcours 3, avec la demande de devis fictive.
   Le premier relie quatre blocs (objectif, contexte, public et ton, limites).
   Le second relie demande, réponse de l’IA et contrôle humain. Inclure un
   exemple court par bloc et une seule conclusion par diapositive. Vérifier
   qu’aucun prix ni délai n’est inventé. Soumettre les deux rendus au porteur
   du projet et consigner les ajustements retenus. Livrer les essais en
   aperçu, avec leur PDF et leur PPTX modifiable.

2. **Versionner le contrat éditorial.** Dans `DiaporamaScenario`,
   `DiaporamaChecker` et le catalogue des modèles, réserver les nouvelles
   contraintes aux diaporamas v3. Réutiliser `scenario.parties` et
   `scenarioPartie` comme référence canonique. Tester les parties inconnues,
   manquantes ou désordonnées et la limite de quatre. Contrôler `motCle`,
   les points structurés, les icônes et l’index `miseEnAvant`. Inclure
   les champs textuels dans les contrôles éditoriaux existants. Maintenir
   la lecture et l’édition des anciens contenus, y compris les listes
   de phrases et les séparateurs déjà rédigés. Prévoir une nouvelle
   migration Doctrine si le stockage change.

3. **Brancher la v3 sur ia-admin.** Dans `RedactionMcpServer` et
   `DiaporamaService`, exposer le catalogue fermé avec `lister_icones`.
   Renvoyer le contrat de la version cible, les modèles et les visuels
   disponibles dans `preparer_diaporama`. Aligner les schémas de création
   et de modification sur les validations côté serveur. Exiger une
   référence vérifiable au cours source pour toute statistique, avec
   le passage qui justifie la valeur. Conserver la distinction entre
   erreurs bloquantes et constats de rendu. Relier les messages au numéro
   de la diapositive source, y compris lorsque le site insère un séparateur.

4. **Faire composer les trois sorties par le moteur.** Dans le registre
   des thèmes et `miseEnPageAtelier.js`, choisir une composition compatible
   avec la quantité et le type de contenu. Alterner quand plusieurs
   compositions conviennent. Calculer les séparateurs, les numéros et
   la progression dans le plan de rendu partagé. Utiliser `mesure.js`
   pour le surligneur et la hauteur des cartes, avec repli si la mesure
   échoue. Résoudre les icônes depuis le catalogue et les visuels depuis
   le back-office. Vérifier que le web, le PDF et `construirePptx.js`
   lisent le même ordre de présentation. Garder les formes et textes
   éditables en PPTX et les légendes lisibles sur la vue fixe du PDF.

5. **Vérifier le parcours complet.** Suivre `docs/HARNESS.md`. Tester le
   pilote et un diaporama antérieur, puis les entrées invalides du
   connecteur, dont une icône inconnue et une statistique sans source.
   Inspecter en navigateur les débordements, le contraste, le mobile,
   le clavier et le hors ligne sur un contenu préparé. Générer les deux
   exports depuis le pilote et les ouvrir dans les lecteurs disponibles.
   Tester la correction du brouillon et le passage au connecteur
   relecteur. Consigner les limites des lecteurs et le résultat des
   contrôles. Maintenir le pilote en brouillon pendant les essais.
