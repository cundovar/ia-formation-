---
objective: "Replace the learner MCP keyword retrieval with a self-hosted semantic vector search that returns only cited courses accessible to the OAuth learner."
status: implemented
---

# Plan: RAG vectoriel apprenant

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Ajouter une recherche sémantique vectorielle au connecteur apprenant, sans transmettre les cours à un fournisseur tiers. |
| **Source** | Demande utilisateur du 18 octobre 2026 : « passer au RAG vectoriel », Qdrant auto-hébergé sur Netcup validé. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Service vectoriel privé sur Netcup | [`phase-1.md`](./phase-1.md) |
| 2 | Indexation et recherche Symfony | [`phase-2.md`](./phase-2.md) |
| 3 | Recherche MCP citée et contrôlée | [`phase-3.md`](./phase-3.md) |
| 4 | Bascule, mesures et exploitation | [`phase-4.md`](./phase-4.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://qdrant.tech/documentation/quickstart/ | Qdrant stocke les vecteurs dans une collection et expose une API HTTP ; un volume persistant est nécessaire. |
| https://qdrant.tech/documentation/tutorials/operations/secure-qdrant/ | Une instance auto-hébergée doit être protégée par une clé API et ne pas exposer son API publiquement. |
| https://api.qdrant.tech/ | Les points portent un vecteur et un payload ; les citations peuvent donc conserver l'identifiant du cours et la position du passage. |

## Decisions

| Decision | Why |
| --- | --- |
| Héberger Qdrant et le service d'embeddings sur Netcup, derrière le réseau Docker existant. | Les textes des cours et leurs vecteurs ne quittent pas l'infrastructure choisie. |
| Garder Symfony comme unique filtre d'accès. | Une recherche vectorielle ne doit jamais décider quels contenus un apprenant peut lire. |
| Conserver MySQL FULLTEXT comme repli pendant la transition. | La recherche reste disponible si le nouveau service est indisponible ou pendant la réindexation. |
| Indexer uniquement du texte pédagogique, sans e-mail, pseudo ni identifiant apprenant. | L'index ne doit pas contenir de données personnelles. |
