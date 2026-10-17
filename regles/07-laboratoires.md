# Laboratoires

Un laboratoire fait manipuler un workflow (déclencheur, conditions, agent, outils, API, recherche documentaire…) dans un simulateur du site. Tout s'exécute dans le navigateur, avec des règles fixes : aucune IA réelle, aucun service extérieur, aucun compte ni clé d'API. Le site ne garde ni le workflow de la personne ni sa réussite.

## LAB-01 — Dire que c'est une simulation

**Règle.** Chaque laboratoire annonce, avant de commencer et pendant l'exécution, que les décisions sont simulées par des règles fixes et qu'aucune IA réelle n'est utilisée. *Règle du projet.*

**Dans un laboratoire.**
- Le champ `simulation` explique en une phrase ce qui est simulé (« L'agent choisit sa réponse d'après des règles écrites à l'avance »).
- Quand un bloc simule une décision d'IA, le journal dit quelle règle a été appliquée.
- Le laboratoire rappelle qu'une vraie IA peut se tromper ou répondre autrement (`LIM-01`).

**Source.** [PLAN] : laboratoires en simulation locale ; [AI-ACT] : transparence sur l'usage de l'IA.

## LAB-02 — Uniquement des données et des services fictifs

**Règle.** Les messages, documents, personnes, organismes, adresses, API et serveurs d'un laboratoire sont imaginaires. Aucune vraie marque d'outil d'IA n'apparaît dans un bloc. *Règle du projet.*

**Dans un laboratoire.**
- Personnes : prénoms courants et nom « Exemple » ; organismes : « Médiathèque Exemple », « Mairie Exemple ».
- Adresses web et courriels en `exemple.fr`, `example.com` ou `.test` ; numéros écrits avec des X.
- Aucune clé, aucun jeton, aucun mot de passe, même d'apparence réaliste (`DON-05`).
- Les blocs restent génériques : « Agent IA », « Serveur MCP fictif », « API météo fictive ».

**Source.** [PLAN] et `DON-04` : données fictives ; `AGENTS.md` : aucune affiliation à un éditeur d'IA.

## LAB-03 — Un objectif, des critères vérifiables

**Règle.** Un laboratoire poursuit un objectif pédagogique écrit en une phrase. La réussite se vérifie par des critères précis, contrôlés sur tous les jeux de données, et chaque critère a un message clair. *Règle du projet.*

**Dans un laboratoire.**
- L'objectif dit ce que la personne saura faire (« Orienter un message avec une condition »).
- Les instructions suivent `RED-01` : phrases courtes, une action par phrase.
- Plusieurs jeux de données évitent une solution qui ne marcherait que pour un cas.
- Un critère non rempli dit quoi regarder, sans donner la solution.

**Source.** [PLAN] ; `POS` : faire pratiquer.

## LAB-04 — Des indices, puis une correction expliquée

**Règle.** La personne peut demander des indices, un à la fois, puis la correction. La correction explique pourquoi elle fonctionne. Recommencer est toujours possible, sans sanction. *Règle du projet.*

**Dans un laboratoire.**
- Les indices vont du plus général au plus précis.
- La correction se charge dans l'éditeur pour être comparée et exécutée.
- Le ton reste bienveillant, comme dans un QCM (`QCM-04`).

**Source.** [PLAN] : apprendre sans sanction ; `POS` : viser l'autonomie.

## LAB-05 — Montrer les risques pour apprendre à s'en protéger

**Règle.** Un laboratoire sur la sécurité (injection de consignes, permissions, données sensibles) montre le risque dans un cas fictif et fait pratiquer la protection : séparer données et consignes, limiter les outils, valider avant une action. Il ne donne pas de méthode d'attaque réutilisable contre un vrai service. *Règle du projet.*

**Dans un laboratoire.**
- L'exemple d'injection reste simple et fictif (« un document demande de supprimer un dossier »).
- La réussite porte sur la défense : l'action dangereuse n'est jamais exécutée.
- Le laboratoire renvoie vers une source de sécurité reconnue.

**Source.** [ANSSI-IAG] : sécurité des systèmes d'IA générative ; [OWASP-LLM] : injection de consignes.

## LAB-06 — Accessible au clavier et sur mobile

**Règle.** Un laboratoire se réalise en entier au clavier et sur un petit écran, sans dépendre de la vue graphique. L'état de chaque étape est écrit en texte, pas seulement montré par une couleur. *Règle du projet.*

**Dans un laboratoire.**
- La vue en étapes permet d'ajouter, relier, configurer et exécuter les blocs.
- Le journal d'exécution est annoncé aux lecteurs d'écran.
- Fonds clairs ou pastel, texte foncé (`ACC`).

**Source.** [RGAA] : critères 3.1 (couleur) et 12 (navigation) ; [PLAN] : vérifier mobile et clavier.

## LAB-07 — Rien n'est enregistré

**Règle.** Le site n'enregistre ni le workflow construit, ni les essais, ni la réussite. Tout disparaît en quittant la page. *Règle du projet.*

**Dans un laboratoire.** Ne pas promettre de sauvegarde, de score ou d'attestation.

**Source.** [PLAN] : aucun suivi de progression ni score enregistré.
