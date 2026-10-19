# RAG vectoriel

Le connecteur apprenant (`/mcp/apprenant`, outil `rechercher_cours`) retrouve les passages de cours **par le sens** de la question, et pas seulement par les mots exacts. Ce guide explique le fonctionnement, la mise en service, l'exploitation quotidienne et l'usage du tableau de bord Qdrant.

## 1. En bref

- **RAG** : « génération augmentée par la recherche ». Avant de répondre, l'IA de l'apprenant cherche des passages de cours, puis répond en les citant.
- **Vecteur (embedding)** : une liste de 384 nombres qui résume le sens d'un texte. Deux textes de sens proche ont des vecteurs proches, même avec des mots différents.
- **Qdrant** : la base qui stocke ces vecteurs et retrouve les plus proches d'une question.
- **Symfony reste le seul juge des droits** : Qdrant ne connaît ni les comptes ni les statuts. Le site revérifie chaque résultat (publication, contenu réservé) avant de le renvoyer.

## 2. Architecture

```
Apprenant (claude.ai / ChatGPT)
      │  outil rechercher_cours
      ▼
Site Symfony (OVH)  ──── HTTPS + jeton ────►  Service RAG (Netcup, FastAPI)
  LearnerContentService                          │ calcule les vecteurs (fastembed)
  RagIndex / VectorStore                         ▼
  MySQL : rag_passage (repli)                 Qdrant (réseau Docker interne)
```

| Élément | Où | Rôle |
|---|---|---|
| `src/Service/Rag/RagIndex.php` | OVH | Découpe les cours publiés en passages et les envoie au service |
| `src/Service/Rag/VectorStore.php` | OVH | Client HTTP du service RAG (`/index`, `/search`, `/courses/{id}`) |
| `src/Service/Learner/LearnerContentService.php` | OVH | Recherche : Qdrant d'abord, sinon MySQL ; filtre les droits |
| `src/Command/ReindexVectorSearchCommand.php` | OVH | Commande `app:rag:reindex` |
| `deploy/netcup-rag/service/app.py` | Netcup | API FastAPI : vecteurs et accès à Qdrant |
| `deploy/netcup-rag/docker-compose.yml` | Netcup | Pile `qdrant` + `rag` + `dashboard` |
| `deploy/netcup-rag/dashboard/` | Netcup | Relais nginx local qui ajoute la clé Qdrant pour le tableau de bord |

Le modèle de vecteurs est `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (multilingue, 384 dimensions, exécuté sur processeur, téléchargé dans l'image Docker au build).

## 3. Indexation : du cours aux points Qdrant

1. Le site lit chaque cours publié. Le texte vient du champ `code` (cours rédigés par le connecteur) ou, à défaut, de `content` (anciens cours). Le HTML est retiré.
2. Le texte est découpé en **passages d'environ 900 caractères**, coupés sur une espace.
3. Pour chaque cours, le site **efface d'abord ses anciens points** (`DELETE /courses/{id}`), puis envoie les passages **par lots de 50** (`POST /index`, délai maximal 60 s).
4. Le service calcule un vecteur par passage et l'enregistre dans la collection `formation_ia_courses`.

Chaque **point** Qdrant contient :

| Champ | Exemple | Sens |
|---|---|---|
| identifiant | `065a0b1a-…` | UUID calculé à partir de « cours-passage » (`1-8`). Qdrant n'accepte que des UUID ou des entiers. |
| `course_id` | `1` | Identifiant du cours (`PageContent`) |
| `position` | `8` | Numéro du passage dans le cours |
| `checksum` | `101f37…` | Empreinte du statut et du texte du cours, identique pour tous ses passages |
| `text` | « documentation… » | Texte du passage, renvoyé comme citation |
| vecteur | 384 nombres | Le sens du passage |

Aucun e-mail, pseudo ni suivi d'apprenant n'est envoyé à Qdrant.

## 4. Recherche : de la question à la citation

1. L'apprenant pose une question ; son IA appelle `rechercher_cours`.
2. Le site envoie la question au service (`POST /search`, 30 résultats au plus).
3. Le service la transforme en vecteur et demande à Qdrant les passages les plus proches (similarité cosinus).
4. Le site garde seulement les passages de cours **publiés et accessibles à cet apprenant**, et renvoie les 10 premiers avec leur citation (cours, passage, texte, adresse).

**Repli automatique** : si le service RAG ne répond pas (panne, délai de 8 s dépassé, variables absentes), la recherche passe par MySQL FULLTEXT sur la table `rag_passage`, avec les mêmes règles d'accès. Cette table est remise à jour juste avant chaque recherche de repli.

## 5. Quand réindexer

> **Important.** Quand le service RAG fonctionne, la publication, la modification ou le retrait d'un cours **ne met pas Qdrant à jour automatiquement**. Le repli MySQL se resynchronise seul, mais pas Qdrant.

Conséquences :

- un **nouveau cours** n'est pas trouvé par la recherche vectorielle tant qu'on n'a pas réindexé ;
- un **cours modifié** peut renvoyer l'ancien texte en citation ;
- un **cours retiré** n'est jamais renvoyé (le site filtre les droits), mais ses points restent dans Qdrant jusqu'à la réindexation.

Lancer donc `app:rag:reindex` après :

- une publication, une modification ou un retrait de cours ;
- une restauration de Qdrant ou un changement de modèle de vecteurs ;
- une modification de `deploy/netcup-rag/service/`.

```bash
ssh ovh 'cd ~/ia && php bin/console app:rag:reindex'
```

Résultat attendu : `N cours vectorisés.` Si un envoi échoue, la commande liste les cours en échec et se termine en erreur.

## 6. Mise en service

1. Sur Netcup, copier `deploy/netcup-rag/.env.example` vers `.env`, choisir un sous-domaine HTTPS, puis générer deux secrets distincts (`RAG_SERVICE_TOKEN` et `QDRANT_API_KEY`).
2. Depuis `deploy/netcup-rag/` : `docker compose up -d --build`.
3. Mettre `RAG_VECTOR_URL` (adresse HTTPS du service) et `RAG_VECTOR_TOKEN` (même valeur que `RAG_SERVICE_TOKEN`) dans l'environnement de production OVH.
4. Lancer `app:rag:reindex` (voir section 5).

Sur le serveur actuel, la pile est dans `/home/cundo/apps/formateur-ia-rag` (conteneurs `formateur-ia-rag-qdrant-1`, `-rag-1`, `-dashboard-1`). Le site est dans `~/ia` sur OVH.

Qdrant n'est jamais exposé sur Internet : seul le service RAG a une adresse HTTPS publique, protégée par le jeton.

## 7. Utiliser le tableau de bord Qdrant

Le tableau de bord n'écoute que sur le serveur lui-même (`127.0.0.1:6333`). On y accède par un **tunnel SSH**, et le relais nginx ajoute la clé Qdrant : rien à saisir.

1. Ouvrir le tunnel depuis son ordinateur (laisser la commande tourner) :

   ```bash
   ssh -N -L 6333:127.0.0.1:6333 vps
   ```

2. Ouvrir `http://localhost:6333/dashboard` dans le navigateur.
3. Fermer le tunnel avec `Ctrl+C` après usage.

Dans le tableau de bord :

- **Collections → `formation_ia_courses`** : nombre de points (un par passage), taille des vecteurs (384), distance (Cosine).
- **Onglet Points** : chaque passage avec `course_id`, `position`, `checksum` et `text`. Filtrer par cours : `course_id` égal à l'identifiant voulu.
- **Vérifier une indexation** : le nombre de points d'un cours doit correspondre à sa longueur (environ un point par 900 caractères), et tous ses points ont le même `checksum`.
- **Console** : requêtes de l'API Qdrant, par exemple compter les points :

  ```
  POST collections/formation_ia_courses/points/count
  { "exact": true }
  ```

Bonnes pratiques :

- ne pas modifier ni supprimer de points à la main : la réindexation est la seule source de vérité ;
- ne pas supprimer la collection, sauf pour repartir de zéro ; dans ce cas, relancer aussitôt `app:rag:reindex` (le service la recrée) ;
- ne jamais exposer le port 6333 publiquement.

## 8. Dépannage

| Symptôme | Cause probable | Que faire |
|---|---|---|
| Collection vide après `reindex` | Aucun cours publié, ou envoi refusé | Lire la sortie de la commande ; elle liste les cours en échec |
| « Échec pour les cours … » | Service injoignable, jeton faux, erreur Qdrant | Vérifier `RAG_VECTOR_URL` et `RAG_VECTOR_TOKEN` sur OVH, puis `docker logs formateur-ia-rag-rag-1` sur Netcup |
| Erreur 401 dans les journaux du service | Jeton différent entre OVH et Netcup | Aligner `RAG_VECTOR_TOKEN` (OVH) et `RAG_SERVICE_TOKEN` (Netcup) |
| `is not a valid point ID` | Ancienne version du service | Reconstruire : `docker compose up -d --build rag` |
| Nouveau cours introuvable | Pas encore réindexé (section 5) | `app:rag:reindex` |
| La recherche marche mais semble « par mots » | Repli MySQL actif : service RAG en panne | Vérifier le conteneur `rag` et ses journaux |
| `localhost:6333` ne répond pas | Tunnel SSH fermé | Relancer la commande de la section 7 |

## 9. Exploitation

- Sauvegarder régulièrement le volume Docker `qdrant_storage`, surtout avant une mise à jour de Qdrant. Il peut aussi être reconstruit entièrement par `app:rag:reindex`.
- Après une modification de `deploy/netcup-rag/service/` : `docker compose up -d --build rag`, puis `app:rag:reindex`.
- Les fichiers de `deploy/netcup-rag/` ne sont pas déployés automatiquement sur Netcup : les copier à la main, puis reconstruire.
