# Diaporamas

Un diaporama du site présente un cours, un chapitre ou un parcours entier devant un groupe. Ce n'est pas le cours recopié : c'est une **synthèse pensée pour être projetée**. L'écran montre l'essentiel, en peu de mots ; le détail est dans les notes de la personne qui présente. Le diaporama est rédigé par l'assistant de rédaction, relu par un autre connecteur, puis mis en forme par le site avec l'un de ses thèmes (`docs/PLAN_DIAPORAMAS.md`). Une diapositive peut porter une scène animée du catalogue `regles/scenes/catalogue.json` (`DIA-07` à `DIA-09`). Un brief et un scénario précèdent les diapositives (`DIA-11`), les visuels viennent des cours (`DIA-12`) et le thème Atelier visuel propose des compositions variées (`DIA-13`).

## DIA-01 — Une idée par diapositive

**Règle.** Chaque diapositive porte une seule idée. Son titre fait 60 caractères au plus ; elle a 5 points au plus, de 12 mots au plus chacun. *Règle du projet.*

**Dans un diaporama.**
- Un groupe de mots suffit souvent : « Vérifier la source », plutôt qu'une phrase complète.
- Un diaporama de cours compte de 6 à 12 diapositives ; un diaporama de chapitre, de 10 à 20 ; un diaporama de parcours, de 12 à 26.
- Le titre dit l'idée de la diapositive (« Une consigne en 4 temps »), pas seulement le thème (« Consigne »).

**Source.** [PLAN] : diaporamas synthétiques, prêts à projeter ; `RED-01` : langage clair.

## DIA-02 — Synthétiser, pas copier

**Règle.** Les points reformulent le cours. Aucun passage de plus de 8 mots n'est repris à l'identique du cours sur une diapositive. *Règle du projet.*

**Dans un diaporama.**
- Choisir ce qui compte pour un atelier : notions clés, étapes, erreurs fréquentes, une activité.
- Un exemple du cours peut être repris, mais raccourci et reformulé.
- Le diaporama d'un chapitre fait la synthèse de tout le chapitre (fil conducteur, progression) : ce n'est pas la suite des diaporamas de ses cours. De même, le diaporama d'un parcours raconte le parcours entier ; il ne remplace pas les diaporamas de ses modules, que la page du parcours propose à part.
- Les libellés d'une scène sont des textes projetés : ils suivent la même règle.

**Source.** [PLAN] : synthèse pour présentation, pas de copier-coller.

## DIA-03 — Le détail dans les notes

**Règle.** Chaque diapositive, sauf la première et la dernière, a des notes de présentation de 300 à 900 caractères. Elles permettent à une autre personne de présenter sans avoir rédigé le diaporama. *Règle du projet.*

**Dans un diaporama.**
- Les notes expliquent ce qu'il faut dire, en langage clair (`RED-01`), et peuvent proposer une question à poser au groupe.
- Pour une question de QCM, la bonne réponse et son explication sont dans les notes, pas à l'écran.

**Source.** [PLAN] ; `POS` : outiller les personnes qui forment.

## DIA-04 — Faire pratiquer

**Règle.** Un diaporama de cours « apprendre » contient au moins une diapositive d'exercice ou de question. *Règle du projet.*

**Dans un diaporama.**
- L'exercice dit quoi faire, avec quel outil et en combien de temps.
- Il se fait avec des données fictives (`DON-04`).

**Source.** `POS-06` : faire pratiquer plutôt que montrer.

## DIA-05 — Accessible et lisible de loin

**Règle.** Le texte projeté fait 24 points au moins ; le contraste est suffisant ; chaque diapositive a un titre ; chaque capture a un texte alternatif. *Règle du projet.*

**Dans un diaporama.**
- Les captures passent par le back-office (`CAP-02`), avec leur légende et leur texte alternatif (`ACC-01`).
- L'information ne dépend jamais de la seule couleur.
- Le thème du site fixe les tailles, les couleurs, les polices et les positions. L'agent choisit seulement l'identifiant d'un thème du site (`standard` ou `atelier_visuel`) ; il ne fournit ni couleur, ni police, ni position, ni code.
- Avec une scène, la diapositive garde 3 points au plus, de 44 caractères au plus, pour laisser la place au schéma.

**Source.** [RGAA] : critères 1 (images), 3 (couleurs) et 9 (structure) ; `ACC`.

## DIA-06 — Sources, licence et neutralité

**Règle.** La dernière diapositive renvoie au cours complet et aux pages officielles citées, et indique la licence. Aucun logo d'éditeur d'IA ; aucune donnée personnelle. *Règle du projet.*

**Dans un diaporama.**
- Licence : CC BY-SA 4.0. Les formateurs peuvent réutiliser et modifier le diaporama en citant la source et en partageant leurs modifications sous la même licence.
- Les outils sont nommés comme dans le cours, sans mise en avant ; le site n'est lié à aucun éditeur d'IA (`AGENTS.md`).
- Mêmes interdits que dans un cours : ni numéro, ni adresse, ni clé d'API, même d'apparence réaliste (`DON-04`, `DON-05`).

**Source.** [PLAN] : décision du 26 octobre 2026 sur la licence ; `DON` ; `CAP-04` : pages officielles.

## DIA-07 — Une scène seulement si elle aide à comprendre

**Règle.** Une scène animée est facultative. Elle sert une idée où l'ordre, le trajet, le tri ou la décision se comprend mieux en le voyant se dérouler. Le champ `justification` dit en une phrase pourquoi elle aide. Un diaporama garde au plus une scène pour trois diapositives. *Règle du projet.*

**Dans un diaporama.**
- Choisir la scène d'après ce qu'elle montre, pas d'après un mot du titre : un « niveau de stock » qui monte et descend ne justifie pas un escalier, car une marche ne se redescend pas.
- Chaque scène du catalogue indique quand elle convient et quand elle peut induire en erreur (`peutInduireEnErreur`) : le relire avant de la proposer.
- Sans scène adaptée, une diapositive fixe vaut mieux qu'une animation approximative.

**Source.** [PLAN] : décision du 21 novembre 2026 (scènes animées) ; `POS` : expliquer sans impressionner.

## DIA-08 — Une scène est une donnée du catalogue

**Règle.** Une scène se décrit par un type du catalogue `regles/scenes/catalogue.json`, sa version et les seuls champs prévus, dans leurs limites. Elle se place sur une diapositive `notion`, `etapes` ou `exercice`. Ni HTML, ni script, ni lien `javascript:` ou `data:`, ni champ inconnu : le site refuse la scène. *Règle du projet.*

**Dans un diaporama.**
- Le site déduit seul les formes, les positions, les couleurs et le mouvement : mêmes données, mêmes étapes.
- Les références internes doivent exister (la branche suivie d'un aiguillage, la ligne observée d'une loupe…).
- Les exemples des scènes de démonstration sont des propositions : les adapter au cours, sans inventer de faits qu'il ne contient pas.

**Source.** [PLAN] ; `AGENTS.md` : jamais d'`eval` ni de code fourni par l'agent.

## DIA-09 — Un équivalent fixe et accessible

**Règle.** Chaque scène a une `description` de 40 à 300 caractères qui dit ce qu'elle montre, du début à la fin, sans parler de mouvement ni de couleur. L'information ne repose jamais sur la seule couleur ni sur le seul mouvement. *Règle du projet.*

**Dans un diaporama.**
- Le site affiche une vue fixe légendée (étapes numérotées), respecte la réduction des animations demandée par le système et propose une lecture sans mouvement.
- Le PDF montre la vue fixe avec ses légendes ; le .pptx montre la vue fixe, ou les étapes sur des diapositives successives quand le catalogue le prévoit.
- Les états sont aussi signalés par un mot ou un symbole (✓, ✗, trait pointillé), pas seulement par une couleur.

**Source.** [RGAA] : critères 3 (couleurs), 13.8 (contenus en mouvement) ; [WCAG] 2.3.3 (animations déclenchées par une interaction).

## DIA-10 — Un parcours, avec ses seuls cours publiés

**Règle.** Le diaporama d'un parcours s'appuie uniquement sur les cours publiés du parcours. Il annonce sa couverture (par exemple « 3 cours rédigés sur 18 ») et ne présente jamais un cours non rédigé comme acquis. Il faut au moins un cours publié. *Règle du projet.*

**Dans un diaporama.**
- `preparer_diaporama` avec `parcoursId` donne le texte des cours publiés et l'inventaire de tous les cours, avec leur statut.
- Un module encore vide peut apparaître comme une étape à venir, clairement signalée.
- Un parcours réservé reste réservé : son diaporama suit les mêmes règles d'accès, aperçu et exports compris.

**Source.** [PLAN] : décision du 21 novembre 2026 ; `RED` : ne pas affirmer ce que le site ne contient pas.

## DIA-11 — Un brief et un scénario avant les diapositives

**Règle.** Avant d'écrire les diapositives, l'agent établit avec la personne un **brief** (public, durée indicative, objectif, contexte professionnel, thème, intention : explicative, illustrée ou atelier), puis un **scénario pédagogique** (objectif, progression, de 2 à 8 parties avec leurs transitions, démonstrations, moments de vérification, activités et durées, sources de chaque partie). Une valeur déduite par le serveur est présentée comme telle et reste `propose` tant que la personne ne l'a pas confirmée. Chaque diapositive indique la partie du scénario qu'elle sert (`scenarioPartie`). *Règle du projet, à valider par le responsable éditorial.*

**Dans un diaporama.**
- Le brief et le scénario sont gardés avec le diaporama, affichés dans l'aperçu et lus par le relecteur ; ils ne sont jamais projetés ni servis par l'API publique.
- Les sources d'une partie sont des cours publiés de la cible ; la couverture réelle est annoncée, comme en `DIA-10`.
- Prévoir au moins un moment où le groupe vérifie un résultat (`LIM`) : c'est le cœur d'une formation à l'IA.
- Un diaporama ancien, sans brief ni scénario, reste valide : les contrôles le signalent par un avertissement.

**Source.** [PLAN] : décision du 21 novembre 2026 ; `POS` : faire pratiquer et vérifier.

## DIA-12 — Seulement des visuels qui existent

**Règle.** Une capture d'un diaporama est une capture du back-office, de préférence l'une de celles des cours exploités (inventaire de `preparer_diaporama`, avec légende, texte alternatif, source, date, cours et passage). L'agent ne crée ni capture ni métadonnée : un champ absent reste vide. Une image d'interface simulée est présentée comme une simulation. *Règle du projet, à valider par le responsable éditorial.*

**Dans un diaporama.**
- Regarder l'image (`voir_visuel`) avant de la placer, et la placer là où le cours l'utilise.
- L'indice « interface simulée » est tiré de la seule légende et du texte alternatif : en cas de doute, le dire dans les notes.
- Sans visuel adapté, une diapositive sans image vaut mieux qu'une capture hors sujet ; une capture manquante se demande au responsable éditorial (`CAP`).

**Source.** `CAP` ; `AGENTS.md` : captures de pages publiques ou de conversations fictives.

## DIA-13 — Des compositions variées et lisibles

**Règle.** Le thème Atelier visuel propose, en plus des modèles d'origine, cinq compositions : exemple commenté, avant/après, démonstration en étapes, étude de cas et séparateur de partie. Chaque composition a ses champs, ses limites et son ordre de lecture dans `regles/diaporamas/modeles.json`. Un diaporama évite d'enchaîner plus de trois diapositives du même modèle. *Règle du projet, à valider par le responsable éditorial.*

**Dans un diaporama.**
- Démonstration : de 2 à 4 étapes (action, puis vérification) ; le site les montre une à une, le .pptx en fait des diapositives fixes « Étape n/N » (aucune animation PowerPoint native), le PDF une vue d'ensemble puis les étapes numérotées.
- Avant/après : deux versions d'un même texte, libellées ; la différence se lit aussi sans couleur.
- Étude de cas : un contexte fictif (`DON`) et de 1 à 3 questions pour le groupe.
- Séparateur : annonce une partie du scénario ; ses notes sont facultatives (exception à `DIA-03`).
- Une scène animée indique sa `notion` (l'idée qu'elle illustre) : elle n'est jamais choisie d'après un mot-clé.

**Source.** [PLAN] : décision du 21 novembre 2026 ; [RGAA] critères 3 (couleurs) et 10 (présentation de l'information).
