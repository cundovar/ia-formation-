# Consignes du projet — formation à l'intelligence artificielle

Ce fichier est la source commune des consignes pour Codex et Claude Code. Le plan de produit est dans `PLAN_APP_FORMATION_IA.md`. Lire les sections utiles au travail demandé, sans recharger tout le plan pour une correction mineure.

## État réel du projet

- Le dépôt est un projet indépendant. Le 16 octobre 2026, il a été copié de l'app « Formation à la médiation numérique » (commit `8f62602`), sans ses exercices interactifs, puis réorienté vers la formation à l'IA. Détail : `docs/REPRISE_MEDIATEUR.md`.
- Conserver le style et les composants Vue repris. Ne pas modifier le dépôt de l'app médiateur lorsque le travail concerne ce projet. L'accueil propose deux entrées : chaque catégorie (parcours) porte un champ `audience` (`apprendre` ou `former`) qui décide de l'entrée où elle apparaît. Le nom « Formation IA » est provisoire et se change dans la configuration globale du back-office.
- Deux publics : les personnes qui apprennent à utiliser l'IA générative ; les formateurs, médiateurs et enseignants qui forment à l'IA. Les formations sont libres et gratuites, utilisables seuls ou en atelier.
- Compte apprenant facultatif : inscription libre sur `/register` avec une adresse e-mail (connexion, jamais affichée ni transmise au connecteur) et un pseudo (affiché, utilisé pour attribuer des contenus), espace `/spa/mon-espace` et mot de passe oublié (`/mot-de-passe-oublie` : lien à usage unique valable une heure ; en production : `MAILER_DSN` vers Brevo, de préférence `brevo+api://`, voir `docs/env.example`, `MAILER_FROM` sur un domaine authentifié et `MCP_PUBLIC_URL`). Il sert uniquement aux cours, parcours et QCM personnalisés qu'un administrateur réserve à une personne par le connecteur (`attribuer_acces`, `apprenantIds`). Les cours publics restent ouverts sans compte ; aucun score, favori ni suivi n'est enregistré. Le back-office éditorial garde un accès protégé.
- Prévoir les connexions faibles : pages légères, captures optimisées, support imprimable et consultation hors ligne d'un module préparé.

## Priorités de livraison

1. Faire fonctionner le socle copié, avec les deux entrées « J'apprends à utiliser l'IA » et « Je forme à l'IA ».
2. Faire valider le référentiel `regles/` par le responsable éditorial.
3. Livrer un premier cours par public et une fiche d'outil.
4. Permettre au responsable éditorial de corriger un cours, un lien et une capture dans le back-office.
5. Vérifier le parcours sur mobile, au clavier et en connexion lente ou coupée.

Le suivi de progression, les attestations, les réservations, les statistiques et les exercices interactifs sont hors du premier périmètre, sauf les laboratoires IA en simulation locale (décision du 17 octobre 2026, `docs/PLAN_LABORATOIRES.md`). La génération de cours passe par l'assistant de rédaction (MCP) : un agent publie seulement après les contrôles bloquants et une relecture favorable d'un autre connecteur. Si une demande ultérieure rend une fonction écartée nécessaire, mettre à jour le plan avant de l'introduire.

## Travail sur le code

- Garder le frontend, le backend, la base et le déploiement de ce site séparés de ceux de l'app médiateur.
- Réutiliser d'abord les composants de navigation, cours, recherche et QCM existants. Adapter les textes et données aux deux publics, sans refaire inutilement l'interface.
- Pour les fonds d'interface (cartes, boutons, barres de navigation et états survol/focus/actif), utiliser uniquement des couleurs claires ou pastel. Ne jamais appliquer de couleur foncée ou saturée en arrière-plan ; garder un texte suffisamment contrasté et foncé pour rester lisible.
- Les captures d'outils d'IA utilisent des pages publiques ou des conversations entièrement fictives, sur un compte sans historique personnel. Chaque image a une source, une date, une légende et une alternative textuelle. Ne jamais publier les données d'une personne réelle.
- Ne pas présenter ce site comme lié à un éditeur d'IA (OpenAI, Anthropic, Mistral AI, Google…) ou à une administration. Les fiches pointent vers les pages officielles des outils et signalent quand une interface a changé.
- Pour un changement de données ou d'accès, vérifier les effets sur l'API, le back-office, le cache hors ligne et les tests. Les contenus non publiés ne doivent pas être exposés par l'API publique : `PublishedContentExtension` filtre les cours par statut et les contenus réservés (cours, parcours, modules, QCM) par destinataire ; le plan du site suit les mêmes règles. Le cache hors ligne est vidé à la déconnexion.
- Tout contenu pédagogique respecte le référentiel `regles/` (posture, limites de l'IA, données personnelles, langage clair, accessibilité, captures, QCM). Une règle se modifie dans `regles/` avec sa source, pas dans le code.
- L'assistant de rédaction est un connecteur MCP du site (`/mcp`, `src/Mcp/`, SDK `mcp/sdk`), ajouté dans claude.ai ou ChatGPT et autorisé par OAuth par un administrateur (`src/Service/OAuth/`, voir `docs/CONNECTEUR.md`). Il prépare des brouillons (`src/Service/Redaction/RedactionService.php`) et les publie (`publier_cours`) si les contrôles de `DraftChecker.php` passent et si un autre connecteur a donné un avis favorable ; un cours publié reste modifiable par l'agent. Chaque connecteur est un agent distinct : la relecture vient d'un autre connecteur que l'auteur. Les QCM suivent le même circuit (`src/Service/Redaction/QcmDraftService.php`, `publier_qcm`, règles `regles/06-qcm.md`) : un brouillon `QcmDraft` reste hors de l'API publique jusqu'à sa publication ; il est consultable dans le back-office, sous QCM → Brouillons du connecteur.
- Les laboratoires IA (`front/src/laboratoires/`) sont un simulateur local : moteur en fonctions pures, sans Vue ni réseau, blocs déclarés dans un registre, laboratoires décrits en JSON. Jamais d'`eval` ni de code fourni par l'apprenant, jamais d'appel à `/mcp`, à l'API ou à un service d'IA ; rien n'est enregistré. Seule exception : le mode IA réelle facultatif (`LAB-08`), où le navigateur appelle directement le fournisseur avec la clé de l'apprenant, par `front/src/services/iaReelle/`, hors du moteur ; le site ne reçoit ni ne garde jamais cette clé. Leur contenu suit `regles/07-laboratoires.md`.
- Les images d'un cours passent uniquement par les captures du back-office (marqueur `[capture:ID]`, guide : `docs/EDITION.md`).
- La capture automatique (`capture/`, Playwright et Chromium) s'exécute dans un service Docker isolé ; le site l'appelle en HTTPS avec un jeton et conserve seul les images et leurs métadonnées. Elle accepte tous les domaines publics en https, mais refuse les adresses locales ou privées. Conserver les garde-fous de lecture seule (GET uniquement), le refus des écrans de connexion, les cookies jamais acceptés et ne jamais contourner une protection anti-robots (`CAP-08`) : la capture se fait alors à la main.

## Validation et compte rendu

- Avant toute modification, constater les fichiers présents et l'état Git du dépôt concerné. Préserver les changements préexistants.
- Les commandes réelles de validation sont dans `docs/HARNESS.md`. Exécuter celles qui concernent les fichiers modifiés ; pour les parcours publics, tester aussi le navigateur sur mobile et le mode hors ligne.
- Tout changement d'entité passe par une nouvelle migration Doctrine ; ne jamais modifier une migration déjà commitée.
- Dans le compte rendu, distinguer ce qui est présent dans le code, ce qui a été testé localement, ce qui a été vérifié en CI et ce qui a été vérifié sur le site déployé. Signaler les contrôles non effectués.
- Mettre à jour le plan et la documentation seulement lorsque le comportement ou une décision durable change.

## Réponses Git demandées par l'utilisateur

- Si l'utilisateur demande uniquement un nom de commit, répondre par une seule ligne prête à copier au format Conventional Commits anglais : `type(scope): short description`.
- S'il demande uniquement quels fichiers ajouter, répondre par une seule commande `git add <file1> <file2> ...` avec les seuls fichiers pertinents modifiés, sans explication.
