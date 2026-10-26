# Guide d'édition du back-office

Le back-office est à l'adresse `/admin`. Le compte se crée avec `php bin/console app:create-admin <nom>`.

## Statut d'un cours

Menu **Cours**, champ **Statut** :

| Statut | Effet |
| --- | --- |
| Brouillon | En cours d'écriture. Invisible sur le site. |
| En revue | Prêt à relire. Invisible sur le site ; listé dans « Cours à relire » du tableau de bord. |
| Publié | Visible sur le site, dans l'API et dans le plan du site. |
| À réviser | Le service officiel a changé ou un usager a signalé un décalage. Le cours disparaît du site jusqu'à sa remise en « Publié ». |

L'API ne permet pas de publier : un statut change dans le back-office, ou par l'assistant de rédaction (`publier_cours`, après une relecture favorable d'un autre connecteur, voir `docs/CONNECTEUR.md`). Un brouillon préparé par l'assistant de rédaction porte « agent:… » dans **Préparé par** ; quand il est soumis, il arrive « En revue » après avoir passé les contrôles de `regles/controles.md`. La relecture vérifie le reste du référentiel `regles/`. Un administrateur connecté voit aussi les brouillons sur le site, avec un bandeau « Ce cours n'est pas publié ».

Pour un cours sur un service, remplir **Page officielle de référence** et **Vérifié le** après chaque comparaison avec le site officiel.

## Captures

Menu **Captures** :

1. **Créer** : déposer l'image (PNG, JPEG ou WebP, 5 Mo au plus) et choisir le type.
   - **Capture d'une page publique** : la page officielle et la date de capture sont obligatoires. Ne jamais capturer un écran connecté ni des données réelles.
   - **Illustration fictive** : pour montrer un écran de compte personnel. Le site la signale comme « Illustration pédagogique ».
2. Écrire la **légende** (ce qu'il faut repérer) et le **texte alternatif** (décrire l'image à quelqu'un qui ne la voit pas).
3. Fixer **À revérifier le** : à cette date, la capture apparaît dans « Captures à revérifier » du tableau de bord.
4. Copier le **marqueur** affiché dans la liste, par exemple `[capture:12]`, et le coller sur une ligne seule dans le contenu du cours.

Sur le site, le marqueur devient l'image, sa légende, « Capture du site ChatGPT, le 15/10/2026 », un lien vers la page officielle et un lien pour agrandir l'image.

**Remplacer une capture** : ouvrir la capture, déposer le nouveau fichier, mettre à jour la date. Tous les cours qui contiennent son marqueur affichent la nouvelle image sans être modifiés. La fiche de la capture indique les cours qui l'utilisent.

Le site n'affiche aucune autre image que les captures gérées ici. Une image collée directement dans le HTML d'un cours est retirée à l'affichage.

## Diaporamas

Menu **Diaporamas**. Un diaporama est la synthèse d'un cours ou d'un chapitre, téléchargeable en PowerPoint et en PDF sur la page publique. L'assistant de rédaction le rédige et le publie après la relecture d'un autre connecteur (voir `docs/CONNECTEUR.md`) ; le back-office ne crée ni ne publie de diaporama.

- **Relire** : la fiche montre l'aperçu de chaque diapositive avec ses notes de présentation, la relecture du connecteur et les contrôles de `regles/controles.md`.
- **Corriger** : le titre, le sous-titre et les diapositives se modifient en texte (format YAML : chaque diapositive commence par `- modele:`, chaque point par un tiret ; garder les espaces en début de ligne). Une correction qui ajoute un contrôle bloquant n'est pas enregistrée. Le statut et la relecture ne changent pas : un diaporama publié reste en ligne.
- **Retirer du site** : le diaporama repasse en brouillon et disparaît de la page. Pour le republier, l'assistant de rédaction doit obtenir une nouvelle relecture.
- **À mettre à jour** : quand le texte du cours (ou d'un cours du chapitre) change après la synthèse, la colonne **Suivi du cours** l'indique et le tableau de bord le liste. Après avoir corrigé le diaporama, ou vérifié qu'il reste juste, cliquer sur **Marquer comme à jour**. L'assistant de rédaction peut aussi le réécrire avec `modifier_diaporama`.
