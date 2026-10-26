# Contrôles automatiques

Le serveur les applique quand un brouillon est vérifié ou soumis à la relecture par l'API de rédaction (`src/Service/Redaction/DraftChecker.php`). Un contrôle **bloquant** empêche le passage « En revue » ; un **avertissement** est signalé au rédacteur et au relecteur.

Les règles qui demandent du jugement (posture, pertinence d'un texte alternatif, clarté d'une explication) ne sont pas vérifiables ainsi : elles relèvent de la relecture humaine et, à l'étape 3, d'un agent relecteur.

| Code | Règle | Niveau | Ce qui est vérifié |
| --- | --- | --- | --- |
| `TITRE_MANQUANT` | — | bloquant | Le cours a un titre. |
| `PARCOURS_SANS_PUBLIC` | — | bloquant | Le cours appartient à un parcours qui a un public (« apprendre » ou « former »), sinon il n'apparaîtrait nulle part. |
| `CAPTURE_INCONNUE` | `CAP-02` | bloquant | Chaque marqueur `[capture:ID]` désigne une capture existante. |
| `IMAGE_DIRECTE` | `CAP-02`, `ACC-01` | bloquant | Aucune balise `<img>` dans le contenu : les images passent par les captures. |
| `SOURCE_MANQUANTE` | `CAP-04` | bloquant | Un cours qui montre une capture réelle a une page officielle de référence (celle de l'outil). |
| `LIEN_OFFICIEL_MANQUANT` | `CAP-04`, `LIM-06` | bloquant | Un cours qui a une page officielle de référence contient un lien vers ce site. |
| `NUMERO_SECURITE_SOCIALE` | `DON-04` | bloquant | Aucun numéro au format du numéro de sécurité sociale. |
| `IBAN` | `DON-04` | bloquant | Aucun IBAN. |
| `TELEPHONE` | `DON-04` | bloquant | Aucun numéro de téléphone français ; écrire un exemple avec des X (06 XX XX XX XX). |
| `CLE_API` | `DON-04`, `DON-05` | bloquant | Aucune chaîne qui ressemble à une clé d'API (`sk-…`, `sk-ant-…`, `AIza…`) ; écrire un exemple comme sk-XXXX. |
| `COURRIEL_REEL` | `DON-04` | bloquant | Aucune adresse de courriel, sauf sur les domaines réservés aux exemples (`example.com`, `example.org`, `example.net`, `.example`). |
| `RELECTURE_MANQUANTE` | `RED-02` | bloquant (à la soumission) | Un autre agent (autre connecteur) a enregistré une relecture depuis la dernière modification. |
| `RELECTURE_DEFAVORABLE` | `RED-02` | bloquant (à la soumission) | La relecture n'est pas défavorable. |
| `PHRASE_LONGUE` | `RED-01` | avertissement | Phrases de plus de 25 mots. |
| `SANS_EXERCICE` | `POS-06`, `RED-03` | avertissement | Un cours « apprendre » contient une partie « À vous ». |
| `SANS_ORIENTATION` | `LIM-05` | avertissement | Un cours « former » contient « Points de vigilance » ; une fiche d'outil, « Si ça ne marche pas » ou « Où se faire aider ». |

## Contrôles d'un QCM

Le serveur les applique à chaque création ou modification d'un brouillon de QCM, à sa vérification et à sa publication (`src/Service/Redaction/QcmDraftChecker.php`). Un brouillon qui a un contrôle **bloquant** n'est pas enregistré : rien de ce qui est refusé n'est gardé, pas même une donnée personnelle.

| Code | Règle | Niveau | Ce qui est vérifié |
| --- | --- | --- | --- |
| `QUESTION_MANQUANTE` | `QCM-01` | bloquant | Le QCM a une question. |
| `QUESTION_TROP_LONGUE`, `REPONSE_TROP_LONGUE` | `QCM-03` | bloquant | La question et chaque réponse tiennent en 255 caractères. |
| `EXPLICATION_MANQUANTE` | `QCM-04` | bloquant | Une explication générale est affichée après la réponse. |
| `THEME_MANQUANT`, `NIVEAU_MANQUANT` | — | bloquant | Le QCM a un thème et un niveau du catalogue QCM, sans quoi aucune série publique ne le propose. |
| `NOMBRE_REPONSES` | `QCM-01` | bloquant | De 2 à 6 réponses. |
| `BONNE_REPONSE_UNIQUE` | `QCM-01` | bloquant | Exactement une réponse correcte. |
| `REPONSE_VIDE` | `QCM-01` | bloquant | Aucune réponse vide. |
| `REPONSES_IDENTIQUES` | `QCM-02` | bloquant | Deux réponses n'ont pas le même texte. |
| `NUMERO_SECURITE_SOCIALE`, `IBAN`, `TELEPHONE`, `CLE_API`, `COURRIEL_REEL` | `DON-04` | bloquant | Mêmes contrôles que pour un cours, sur la question, les réponses et les explications. |
| `RELECTURE_MANQUANTE`, `RELECTURE_AVEC_RESERVES`, `RELECTURE_DEFAVORABLE` | `RED-02` | bloquant (à la publication) | Un autre agent a relu le QCM depuis sa dernière modification, avec un avis favorable. |
| `QUESTION_LONGUE` | `RED-01` | avertissement | Question de plus de 25 mots. |
| `REPONSE_PIEGE` | `QCM-02` | avertissement | Réponse du type « toutes les réponses » ou « aucune des réponses ». |
| `EXPLICATION_REPONSE_MANQUANTE` | `QCM-04` | avertissement | Chaque réponse fausse a son explication. |

La plausibilité des réponses fausses, la justesse de la bonne réponse et le ton de la correction ne se vérifient pas automatiquement : ils relèvent de la relecture (`relire_qcm`).

## Contrôles d'un diaporama

Le serveur les applique à un diaporama (`src/Service/Redaction/DiaporamaChecker.php`) ; le connecteur les utilisera à chaque création, modification, vérification et publication (étape D4 de `docs/PLAN_DIAPORAMAS.md`). Les champs de chaque modèle sont listés dans `DiaporamaChecker::MODELES`.

| Code | Règle | Niveau | Ce qui est vérifié |
| --- | --- | --- | --- |
| `DIAPO_CIBLE` | — | bloquant | Le diaporama vise un cours ou un chapitre, et un seul. |
| `DIAPO_MODELE_INCONNU` | — | bloquant | Chaque diapositive a un modèle connu. |
| `DIAPO_CHAMP_MANQUANT` | — | bloquant | Les champs du modèle sont remplis : nombre minimal de points ou de réponses, consigne, question, deux colonnes avec un titre, identifiant de capture. |
| `DIAPO_NOMBRE` | `DIA-01` | bloquant | De 6 à 12 diapositives pour un cours, de 10 à 20 pour un chapitre. |
| `DIAPO_TITRE_MANQUANT`, `DIAPO_TITRE_LONG` | `DIA-01`, `DIA-05` | bloquant | Chaque diapositive a un titre de 60 caractères au plus. |
| `DIAPO_TROP_DE_POINTS` | `DIA-01` | bloquant | 5 points au plus par diapositive, et le maximum du modèle (4 pour une notion, 4 réponses…). |
| `DIAPO_COPIE` | `DIA-02` | bloquant | Aucun passage de plus de 8 mots identiques au cours (ou aux cours du chapitre), sans tenir compte de la casse ni de la ponctuation. Les notes ne sont pas comparées. |
| `CAPTURE_INCONNUE` | `CAP-02`, `DIA-05` | bloquant | Chaque capture citée existe dans le back-office et a un texte alternatif. |
| `DIAPO_CHAPITRE_INCOMPLET` | — | bloquant | Tous les cours du chapitre sont publiés avant son diaporama. |
| `NUMERO_SECURITE_SOCIALE`, `IBAN`, `TELEPHONE`, `CLE_API`, `COURRIEL_REEL` | `DON-04` | bloquant | Mêmes contrôles que pour un cours, sur les diapositives et les notes. |
| `RELECTURE_MANQUANTE`, `RELECTURE_AVEC_RESERVES`, `RELECTURE_DEFAVORABLE` | `RED-02` | bloquant (à la publication) | Un autre agent a relu le diaporama depuis sa dernière modification, avec un avis favorable. |
| `DIAPO_NOTES_MANQUANTES` | `DIA-03` | bloquant | Chaque diapositive, sauf la première et la dernière, a des notes de présentation. |
| `DIAPO_POINT_LONG` | `DIA-01` | avertissement | Point de plus de 12 mots. |
| `DIAPO_NOTES_LONGUEUR` | `DIA-03` | avertissement | Notes de 300 à 900 caractères. |
| `DIAPO_SANS_PRATIQUE` | `DIA-04` | avertissement | Un diaporama de cours « apprendre » a une diapositive d'exercice ou de question. |
| `DIAPO_SOURCE_PERIMEE` | — | avertissement | Le cours a changé depuis le diaporama (empreinte de la source différente). |

La qualité de la synthèse, le choix des idées et la clarté des notes ne se vérifient pas automatiquement : ils relèvent de la relecture.
