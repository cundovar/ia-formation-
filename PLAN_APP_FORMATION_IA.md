# Projet de site de formation à l'intelligence artificielle

Date de cadrage : 16 octobre 2026. **Base de réalisation : copie de l'application « Formation à la médiation numérique » (`cundovar/mediateur-numerique-formation`, commit `8f62602`), sans ses exercices interactifs, réorientée vers la formation à l'IA.** Détail de la reprise : `docs/REPRISE_MEDIATEUR.md`.

## 1. Publics et objectifs

Le site accueille **deux publics** : les personnes qui apprennent à se servir d'une IA générative (ChatGPT, Claude, Le Chat, Gemini…) dans leur vie quotidienne ou au travail, et les formateurs, médiateurs, enseignants ou référents qui font découvrir l'IA à d'autres. Les formations sont **libres et gratuites**, utilisables en autonomie ou en atelier.

Résultat attendu pour une personne qui apprend : savoir écrire une consigne claire, lire une réponse avec esprit critique, la vérifier et protéger ses données. Résultat attendu pour un formateur : savoir recueillir les attentes, montrer, faire pratiquer, vérifier les acquis et transmettre les limites de l'IA.

L'accueil propose deux entrées : **« J'apprends à utiliser l'IA »** (`/apprendre`, public `apprendre`) et **« Je forme à l'IA »** (`/former`, public `former`). Chaque parcours (catégorie) porte ce champ `audience`. Le nom « Formation IA » est provisoire et se change dans la configuration globale du back-office.

## 2. Architecture reprise

| Couche | Choix | Remarque |
| --- | --- | --- |
| Interface | Vue 3, Vue Router, Vite, Tailwind, composants et styles de l'app médiateur | Même identité visuelle, fonds clairs ou pastel uniquement. |
| Entraînement | QCM avec correction, publics et personnalisés | Aucun score enregistré sur le serveur. Les exercices interactifs de l'app médiateur (simulateurs) ne sont pas repris. |
| Laboratoires IA | Workflows à blocs exécutés par un simulateur JavaScript local et déterministe (`front/src/laboratoires/`) | Décision du 17 octobre 2026, voir `docs/PLAN_LABORATOIRES.md`. Aucune IA réelle, aucun appel réseau, rien d'enregistré. Distincts du connecteur MCP de rédaction. |
| Connexion faible et hors ligne | PWA et cache IndexedDB, module téléchargeable | Cache vidé à la déconnexion. |
| API et administration | Symfony 6.4, Doctrine, API Platform, EasyAdmin | Contenus non publiés et réservés filtrés par `PublishedContentExtension`. |
| Rédaction assistée | Connecteur MCP `/mcp` (claude.ai, ChatGPT), OAuth administrateur | Publication après contrôles bloquants et relecture favorable d'un autre connecteur. |
| Captures | Moteur `capture/` exécuté par `capture-service/` dans un conteneur isolé | Pages publiques en https, lecture seule, jamais de contournement anti-robots. |
| Base de données | Une seule base MySQL (`formateur_ia`) | Indépendante de celle de l'app médiateur. |

Modèle : **parcours → modules → cours → QCM**, plus **fiches d'outil** (cours avec page officielle de référence) et **captures pédagogiques**. Chaque contenu a un niveau, un statut (brouillon, en revue, publié, à réviser), une source et une date de vérification.

Compte apprenant **facultatif** : adresse e-mail (connexion, jamais affichée ni transmise au connecteur), pseudo et mot de passe. Il sert aux cours, parcours et QCM personnalisés qu'un administrateur réserve à une personne par le connecteur. Les cours publics restent ouverts sans compte. Un suivi minimal peut être activé seulement après un accord explicite de la personne ; elle peut l'effacer ou le désactiver à tout moment. Sans accord, aucune progression, note ni visite n'est enregistrée.

## 3. Principes de contenu

- Le référentiel `regles/` s'applique à tout contenu : posture (faire pratiquer, esprit critique), limites de l'IA (erreurs, inventions, biais, usages à risque), données personnelles (rien de personnel ni de confidentiel dans une consigne, clés d'API), langage clair, accessibilité, captures, QCM.
- Chaque cours rappelle qu'une IA peut se tromper et demande de vérifier les informations importantes.
- Les exemples de consignes, les conversations montrées et les captures n'utilisent que des données fictives.
- Le site n'est affilié à aucun éditeur d'IA ni à une administration. Il renvoie vers les pages officielles des outils pour leurs conditions, leurs réglages de confidentialité et leurs tarifs.
- Les interfaces des outils d'IA changent souvent : chaque capture a une date de prochaine vérification (environ trois mois) et le cours passe « À réviser » si l'outil a changé.
- Accessibilité dès la conception : navigation clavier, contraste, textes alternatifs, rien d'important seulement dans une image ou par la couleur, zoom et impression.

## 4. Priorités de livraison

1. Faire fonctionner le socle copié, sans exercices interactifs, avec les deux entrées IA.
2. Valider le référentiel `regles/` avec le responsable éditorial (sources à consulter et dater).
3. Livrer un premier cours par public et une fiche d'outil, rédigés par le connecteur et relus par un autre connecteur.
4. Vérifier le parcours sur mobile, au clavier et en connexion lente ou coupée.
5. Choisir l'hébergement, le domaine et le service de capture de production, puis activer le déploiement.

6. Laboratoires IA (décision du 17 octobre 2026) : simulateur local de workflows et d'agents, définitions en JSON dans le code, règle `regles/07-laboratoires.md`. Phases et tâches : `docs/PLAN_LABORATOIRES.md`.

Hors du premier périmètre : attestations, réservations, statistiques, exercices interactifs autres que les laboratoires, mode « IA réelle » des laboratoires (appels à un modèle, même côté serveur). Le suivi de progression minimal sur consentement fait partie de la phase MCP apprenant ; il ne contient ni score ni historique de visite détaillé. Si une demande rend une autre fonction nécessaire, mettre à jour ce plan avant de l'introduire.
