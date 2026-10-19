# Laboratoires

Un laboratoire fait manipuler un workflow (déclencheur, conditions, agent, outils, API, recherche documentaire…) dans un simulateur du site. Tout s'exécute dans le navigateur, avec des règles fixes : aucune IA réelle, aucun service extérieur, aucun compte ni clé d'API. Le site ne garde ni le workflow de la personne ni sa réussite. Seule exception, facultative : le mode IA réelle avec la clé de la personne (`LAB-08`).

## LAB-01 — Dire que c'est une simulation

**Règle.** Chaque laboratoire annonce, avant de commencer et pendant l'exécution, que les décisions sont simulées par des règles fixes et qu'aucune IA réelle n'est utilisée. *Règle du projet.*

**Dans un laboratoire.**
- Le champ `simulation` explique en une phrase ce qui est simulé (« L'agent choisit sa réponse d'après des règles écrites à l'avance »).
- Quand un bloc simule une décision d'IA, le journal dit quelle règle a été appliquée.
- Le laboratoire rappelle qu'une vraie IA peut se tromper ou répondre autrement (`LIM-01`).
- En mode IA réelle (`LAB-08`), le bandeau et chaque étape du journal disent quel bloc a été confié à un vrai modèle, chez quel fournisseur, et que le reste du laboratoire reste simulé.

**Source.** [PLAN] : laboratoires en simulation locale ; [AI-ACT] : transparence sur l'usage de l'IA.

## LAB-02 — Uniquement des données et des services fictifs

**Règle.** Les messages, documents, personnes, organismes, adresses, API et serveurs d'un laboratoire sont imaginaires. Aucune vraie marque d'outil d'IA n'apparaît dans un bloc. *Règle du projet.*

**Dans un laboratoire.**
- Personnes : prénoms courants et nom « Exemple » ; organismes : « Médiathèque Exemple », « Mairie Exemple ».
- Adresses web et courriels en `exemple.fr`, `example.com` ou `.test` ; numéros écrits avec des X.
- Aucune clé, aucun jeton, aucun mot de passe, même d'apparence réaliste (`DON-05`).
- Les blocs restent génériques : « Agent IA », « Serveur MCP fictif », « API météo fictive ».
- En mode IA réelle (`LAB-08`), seuls la consigne et les données fictives du laboratoire partent chez le fournisseur ; la page rappelle de n'y écrire rien de personnel ni de confidentiel. Le nom du fournisseur n'apparaît que dans le panneau de ce mode, sans logo ni mise en avant.

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

## LAB-08 — Mode IA réelle avec sa propre clé

**Règle.** Dans un laboratoire qui le prévoit, la personne peut confier le bloc Agent à un vrai modèle avec **sa propre clé d'API**. Ce mode est facultatif et désactivé par défaut. La clé ne quitte le navigateur que vers le fournisseur choisi : le site ne la reçoit pas, ne la garde pas et ne finance aucun appel. *Règle du projet.*

**Dans un laboratoire.**
- Le laboratoire déclare ce mode (`"modeReel": true`) seulement si son bloc Agent a du sens face à un vrai modèle. Les outils, API, serveurs MCP, documents et mémoires restent simulés.
- Avant l'activation, la page explique : le coût est facturé par le fournisseur sur le compte de la personne ; la consigne et la donnée transmise à l'agent partent chez lui ; la clé est un mot de passe (`DON-05`), gardée en mémoire seulement et effacée en quittant la page, avec un bouton pour l'oublier ; un plafond de dépense se règle sur la page officielle du fournisseur.
- La vérification des objectifs reste calculée en simulation : une vraie IA ne répond pas deux fois pareil.
- Si l'appel échoue (clé refusée, crédit épuisé, service indisponible, appel bloqué par le navigateur, hors ligne), l'étape s'arrête avec un message clair et la simulation reste disponible.
- Seuls sont proposés les fournisseurs qui acceptent l'appel direct depuis un navigateur ; leur choix tient à cette contrainte technique, pas à une préférence ni à un partenariat.
- Les fournisseurs sont présentés de la même façon, par ordre alphabétique, sans logo.
- Le panneau dit **où sont traitées les données** du fournisseur choisi. Pour un fournisseur établi hors de l'Union européenne (par exemple en Chine), il le signale clairement, rappelle que ses conditions d'utilisation disent si les contenus envoyés peuvent être conservés ou réutilisés, et redemande de n'écrire rien de personnel ni de confidentiel dans la consigne.

**Source.** [PLAN] : phase 6 de `docs/PLAN_LABORATOIRES.md` ; `DON-05` : une clé d'API est un mot de passe ; [ANSSI-IAG] : clés d'API et fuite de données ; [ANTHROPIC-CORS], [DEEPSEEK-API], [ZHIPU-API] : appel direct depuis un navigateur ; [CNIL-TRANSFERTS] : données traitées hors de l'Union européenne.
