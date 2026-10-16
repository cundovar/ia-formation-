# Reprise de l'application de médiation numérique

Le 16 octobre 2026, ce projet a été créé à partir des fichiers suivis de `cundovar/mediateur-numerique-formation`, branche `main`, commit `8f62602` (fusion de la PR #34). La copie a été faite sans historique (`git archive`) : aucun `.env`, base, dépendance installée (`vendor/`, `node_modules/`), build, cache (`var/`) ni média non suivi n'a été repris. Le dépôt, la base et le déploiement sont indépendants de ceux de l'app médiateur.

## Retiré

| Élément | Fichiers |
| --- | --- |
| Exercices interactifs (gestes du téléphone, envoyer un message, remplir un formulaire, trouver le vrai site) | `front/src/exercices/`, `front/src/components/features/exercices/`, `front/src/views/Exercice(s)Page.vue`, `front/tests/unit/exercices/`, routes `/exercices` et liens « Exercices » des menus |
| Historique de travail de l'ancien projet | `aidd_docs/tasks/`, `docs/REPRISE_DEVDOC.md` |

Conservés : QCM publics et personnalisés (série « Mes QCM » de l'espace personnel), comptes apprenants, connecteur MCP et OAuth, captures (moteur, service, déploiement Netcup), PWA et hors ligne, harness Codex et Claude Code. Les migrations Doctrine sont reprises telles quelles.

## Adapté

- Public `accompagner` renommé `former` (`Category::AUDIENCE_FORMER`, route `/former`, gabarit `cours-former`) ; textes des deux entrées dans `front/src/config/audiences.js`.
- Nom du site « Formation IA », textes de l'accueil, SEO, PWA, e-mails, inscription, conditions et confidentialité.
- Référentiel `regles/` réécrit pour la formation à l'IA, avec les mêmes identifiants de règles ; gabarit `fiche-service` remplacé par `fiche-outil`.
- Contrôles de rédaction : un cours « former » attend « Points de vigilance » ; nouveau contrôle bloquant `CLE_API`.
- Connecteur MCP : nom `formation-ia-redaction`, consignes et grille de relecture orientées IA.
- Docker : projet `formateur_ia`, ports 8096 (site), 8097 (phpMyAdmin), 3312 (MySQL), 5177 (Vite), pour tourner à côté de l'app médiateur.
- CI : contrôles inchangés ; déploiement désactivé tant que la variable de dépôt `DEPLOY_ENABLED` ne vaut pas `true`.

## Reste à faire

- `deploy/netcup-capture/.env.example` cite encore le domaine de capture de l'app médiateur : le remplacer par celui de ce projet (les agents ne peuvent pas modifier les fichiers `.env*`).
- Les données d'exemple des tests (CAF, Ameli…) sont reprises de l'app médiateur ; elles restent fictives et n'ont pas d'effet sur le site.
- Choisir l'hébergement, le domaine, `MAILER_FROM`, `MCP_PUBLIC_URL` et le service de capture de production.
