# Harness Codex et Claude Code

Ce projet reprend le harness de l'app « Formation à la médiation numérique », adapté à ce dépôt indépendant : consignes partagées, protections automatiques et boucle de validation. Le code applicatif a été copié de cette app, sans ses exercices interactifs (voir `docs/REPRISE_MEDIATEUR.md`).

## 1. Consignes partagées

- `AGENTS.md` définit le périmètre, les priorités, les règles de contenu et les preuves attendues.
- `CLAUDE.md` importe `@AGENTS.md` ; les deux assistants reçoivent les mêmes consignes.
- `PLAN_APP_FORMATION_IA.md` garde les décisions produit détaillées.

## 2. Protections automatiques

- `.agents/hooks/lib.sh` extrait les fichiers ciblés des appels `Write`, `Edit`, `NotebookEdit` et `apply_patch`.
- `.agents/hooks/protect-files.sh` refuse une écriture directe sur un `.env` réel, une sauvegarde, une base locale ou un chemin hors du projet. Les exemples `.env.example` restent autorisés.
- `.claude/settings.json` active le hook côté Claude Code et bloque aussi la lecture des fichiers sensibles. `.codex/hooks.json` active le même script côté Codex.
- `.codex/rules/project.rules` encadre quelques commandes à risque. Ces règles ne remplacent pas les autorisations de l'environnement d'exécution.

Ces hooks ciblent les outils d'édition indiqués dans leur configuration. Ils ne protègent pas les écritures indirectes exécutées par un shell, un connecteur ou un programme. Les secrets restent exclus du dépôt par `.gitignore` et ne doivent jamais être copiés depuis l'app médiateur.

## 3. Boucle de validation

À chaque tâche : constater les fichiers et l'état Git disponibles, modifier le périmètre demandé, contrôler les fichiers touchés et expliquer les preuves obtenues.

### Configuration locale

Symfony exige un fichier `.env` à la racine. Le modèle est `docs/env.example` (`cp docs/env.example .env`). Il n'est pas à la racine parce que les règles de `.claude/settings.json` interdisent aux agents de lire `./.env.*`. Les agents ne créent pas le `.env` du projet : ils vérifient dans une copie de travail, comme la CI qui écrit son propre `.env` de test.

### Démarrage

Avec Docker (ports choisis pour ne pas entrer en conflit avec DevDoc ni avec l'app médiateur) :

```bash
make up && make composer && make npm-install && make migrate
docker compose exec php php bin/console app:create-admin <nom>   # compte du back-office
```

Assistant de rédaction : connecteur MCP sur `/mcp`, à ajouter dans claude.ai ou ChatGPT avec un compte administrateur (voir `docs/CONNECTEUR.md`) ; `php bin/console app:connecteurs` liste et coupe les accès.

Site : <http://localhost:8096/spa> ; back-office : <http://localhost:8096/admin> ; phpMyAdmin : <http://localhost:8097> ; MySQL hôte : `localhost:3312` ; Vite : `localhost:5177`.

Sans Docker, avec PHP 8.2+ et SQLite (`DATABASE_URL` SQLite dans `.env`) :

```bash
composer install && npm ci --prefix front
php bin/console doctrine:schema:create      # ou doctrine:migrations:migrate sur MySQL
php bin/console app:create-admin <nom>
./build-assets.sh                           # build Vite dans public/build et public/spa
php -S 127.0.0.1:8000 -t public             # le serveur intégré a besoin d'un routeur vers public/index.php pour /spa
```

### Contrôles

| Contrôle | Commande | Make (Docker) |
| --- | --- | --- |
| Syntaxe PHP | `find src tests migrations -name '*.php' -print0 \| xargs -0 -n1 php -l` | `make lint-php` |
| Conteneur, Twig, YAML | `php bin/console lint:container`, `lint:twig templates`, `lint:yaml config` | — |
| PHPStan (niveau 5, baseline) | `composer analyse` | `make analyse` |
| PHPUnit (SQLite jetable) | `composer test` | `make test` |
| Migrations MySQL | `doctrine:migrations:migrate`, puis `doctrine:schema:validate` | `make migrate` |
| ESLint | `npm run lint --prefix front` | `make lint-front` |
| Vitest | `npm test --prefix front` | `make test-front` |
| Build Vite | `npm run check --prefix front` | `make build-front` |
| Moteur de capture | `npm ci --prefix capture && npm run lint --prefix capture && npm test --prefix capture` | — |

`make check` enchaîne syntaxe PHP, PHPStan, ESLint, PHPUnit, Vitest et build. La CI (`.github/workflows/ci.yml`) exécute les mêmes contrôles, plus les migrations sur un MySQL 8.0 : montée, validation du schéma, retour arrière et remontée.

### Moteur de capture

`capture/` (Node, `playwright-core`) est exécuté sur Netcup par `capture-service/`, dans un conteneur séparé de l'application OVH. Le site lui envoie une demande HTTPS authentifiée avec `CAPTURE_SERVICE_URL` et `CAPTURE_SERVICE_TOKEN`, puis enregistre lui-même le JPEG et ses métadonnées. En développement, laisser `CAPTURE_SERVICE_URL` vide utilise encore le moteur local. Réglages : `docs/env.example` (`CAPTURE_SERVICE_URL`, `CAPTURE_SERVICE_TOKEN`, `CAPTURE_CHROMIUM_PATH`, `CAPTURE_NO_SANDBOX`, `CAPTURE_HOME`).

Les tests du moteur ouvrent un site local et utilisent `CAPTURE_CHROMIUM_PATH` (ou `/opt/pw-browsers/chromium`) ; en CI, `npx --prefix capture playwright-core install --with-deps chromium`. PHPUnit remplace le moteur par un double, sauf `tests/Service/NodeCaptureRunnerTest.php`, ignoré si `capture/node_modules` manque.

Pour un parcours public, compléter par un essai dans le navigateur sur ordinateur et mobile, et en mode hors ligne. Ne pas présenter les tests de l'app médiateur comme une validation de cette application.

Dans un environnement où le proxy refuse les archives GitHub, `composer install --prefer-source` fonctionne, sauf PHPStan, qui n'est distribué qu'en archive ; le cloner alors en profondeur 1 depuis `github.com/phpstan/phpstan` au tag du `composer.lock` (le clone complet est trop lourd pour certains proxys).

Le connecteur MCP est testé par PHPUnit : appels JSON-RPC réels sur `/mcp` (`tests/Functional/Mcp/`) et parcours OAuth complet (`tests/Functional/OAuthFlowTest.php`). Pour un essai manuel avec un client MCP, ajouter `localhost` à `OAUTH_REDIRECT_HOSTS` et utiliser par exemple MCP Inspector (`npx @modelcontextprotocol/inspector`) sur `http://localhost:8096/mcp`.

### Déploiement en production

`.github/workflows/ci.yml` (« CI/CD ») exécute les contrôles à chaque push et pull request. Sur `main`, le job `build` assemble l'archive de production (`composer install --no-dev`, build Vue dans `public/build` et `public/spa`, sans les dossiers de développement).

Le job `deploy` (rsync vers un hébergement OVH, puis `doctrine:migrations:migrate` et `cache:clear`, en gardant `.env`, `var/` et `public/uploads/`) est **désactivé** tant que l'hébergement de ce projet n'est pas choisi. Pour l'activer, définir dans GitHub les variables de dépôt `DEPLOY_ENABLED=true`, `OVH_HOST`, `OVH_USER`, `OVH_PATH`, le secret `OVH_SSH_PASSWORD`, et mettre l'empreinte du serveur dans `.github/ovh_known_hosts` (celle reprise de l'app médiateur correspond au cluster OVH de cette app). Le `.env` de production se crée directement sur le serveur, jamais dans le dépôt ; il doit fixer `MCP_PUBLIC_URL` (adresse https du site). Un merge sur `main` passe alors en production, migrations comprises.

L'hébergement mutualisé n'exécute jamais Playwright. Le service `deploy/netcup-capture/` se déploie sur un serveur Docker avec Traefik : choisir un domaine de capture, générer un jeton avec `openssl rand -hex 32`, le placer dans le `.env` du service, puis renseigner la même valeur et `CAPTURE_SERVICE_URL` dans le `.env` du site. Vérifier ensuite `GET /health` et une capture réelle.

Contrôles du harness lui-même :

```bash
jq empty .claude/settings.json .codex/hooks.json
bash -n .agents/hooks/lib.sh .agents/hooks/protect-files.sh
codex execpolicy check --pretty --rules .codex/rules/project.rules -- git push origin main
```

## Activation

Ouvrir le dépôt comme projet de confiance dans chaque outil, puis redémarrer la session pour charger ses réglages. Dans Claude Code, vérifier les fichiers chargés avec `/context`. Pour Codex, vérifier que les hooks et règles du projet sont effectivement pris en compte. La présence des fichiers seule ne prouve pas leur activation.
