# RAG vectoriel

Le connecteur apprenant recherche les cours par sens au moyen du service privé `deploy/netcup-rag/`. Symfony reste le seul composant qui vérifie publication et accès avant de retourner une citation.

## Mise en service

1. Sur Netcup, copier `deploy/netcup-rag/.env.example` vers `.env`, choisir un sous-domaine HTTPS, puis générer deux secrets distincts.
2. Démarrer la pile avec `docker compose up -d --build` depuis `deploy/netcup-rag/`.
3. Mettre `RAG_VECTOR_URL` et `RAG_VECTOR_TOKEN` dans l'environnement de production OVH.
4. Lancer `php bin/console app:rag:reindex` depuis le site pour remplir la collection.

Qdrant reste interne à la pile Docker. Le service RAG est le seul endpoint HTTPS, protégé par le jeton partagé avec Symfony.

## Exploitation

- Sauvegarder régulièrement le volume Docker `qdrant_storage` avant une mise à jour de Qdrant.
- Après une restauration ou un changement de modèle d'embeddings, lancer `app:rag:reindex`.
- Si le service RAG ne répond pas, `rechercher_cours` utilise automatiquement MySQL FULLTEXT ; les règles d'accès restent identiques.
- Une citation vectorielle contient seulement le texte pédagogique du passage, l'identifiant du cours, sa position et son checksum. Elle ne contient aucun e-mail, pseudo ou suivi apprenant.
