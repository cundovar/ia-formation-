# formateur-ia

Site de formation à l'intelligence artificielle, copié de l'app « Formation à la médiation numérique ».

Deux parcours publics : « J'apprends à utiliser l'IA » et « Je forme à l'IA ». Socle Vue 3 / Symfony 6.4 repris à l'identique (styles, composants, QCM, comptes apprenants facultatifs, PWA hors ligne, back-office, captures), sans les exercices interactifs. L'assistant de rédaction (connecteur MCP pour claude.ai et ChatGPT, relecture par un autre connecteur) prépare et publie les cours selon le référentiel `regles/`.

- [Plan du produit](PLAN_APP_FORMATION_IA.md)
- [Reprise de l'app médiateur](docs/REPRISE_MEDIATEUR.md)
- [Consignes communes pour Codex et Claude Code](AGENTS.md)
- [Démarrage, commandes et contrôles](docs/HARNESS.md)
- [Guide d'édition du back-office](docs/EDITION.md)
- [Référentiel de la formation à l'IA](regles/README.md)
- [Connecteur MCP de l'assistant de rédaction (claude.ai, ChatGPT)](docs/CONNECTEUR.md)

Démarrage rapide avec Docker : `cp docs/env.example .env`, puis `make up && make composer && make npm-install && make migrate`. Créer ensuite le compte du back-office avec `php bin/console app:create-admin <nom>` dans le conteneur `php`. Site : <http://localhost:8096/spa>.
