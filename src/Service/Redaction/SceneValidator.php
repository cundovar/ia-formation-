<?php

declare(strict_types=1);

namespace App\Service\Redaction;

/**
 * Validation d'une scène d'après le catalogue (regles/scenes/catalogue.json). Même logique que
 * front/src/diaporamas/scenes/valider.js ; les deux sont testés sur regles/scenes/exemples/.
 * Refuse les champs inconnus, le HTML, les liens javascript:/data:, les références cassées et les
 * dépassements de limites. Une scène est une donnée : aucun script ni code n'est accepté.
 */
final class SceneValidator
{
    private const HTML = '/<\s*\/?\s*[a-z!?]|javascript:|data:/i';
    private const IDENTIFIANT = '/^[a-z0-9_-]{1,30}$/';

    public function __construct(private SceneCatalogue $catalogue) {}

    public function catalogue(): SceneCatalogue
    {
        return $this->catalogue;
    }

    /**
     * @return list<array{code: string, champ: string, message: string}> liste vide si la scène est valide
     */
    public function valider(mixed $scene): array
    {
        if (!\is_array($scene) || array_is_list($scene) && $scene !== []) {
            return [self::erreur('SCENE_TYPE', 'scene', 'scene : objet attendu.')];
        }
        $modele = $this->catalogue->scene($scene['type'] ?? null);
        if ($modele === null) {
            return [self::erreur('SCENE_INCONNUE', 'scene.type', sprintf('scene.type : « %s » n\'est pas dans le catalogue (%s).', self::affiche($scene['type'] ?? null), implode(', ', $this->catalogue->types())))];
        }
        $erreurs = [];
        if (($scene['version'] ?? null) !== $modele['version']) {
            $erreurs[] = self::erreur('SCENE_INCONNUE', 'scene.version', sprintf('scene.version : version %d attendue pour %s.', $modele['version'], $modele['id']));
        }
        $this->verifierObjet($scene, [...$this->catalogue->champsCommuns(), ...$modele['champs']], 'scene', $erreurs);
        if ($erreurs === []) {
            $this->verifierReferences($scene, $modele['references'] ?? [], $erreurs);
        }

        return $erreurs;
    }

    /**
     * Textes projetés d'une scène (contrôle de copie, données personnelles).
     *
     * @return list<string>
     */
    public static function textes(mixed $scene): array
    {
        $textes = [];
        if (\is_array($scene)) {
            array_walk_recursive($scene, static function ($valeur, $cle) use (&$textes) {
                if (\is_string($valeur) && !\in_array($cle, ['type', 'id', 'decision', 'brancheSuivie', 'justification'], true)) {
                    $textes[] = $valeur;
                }
            });
        }

        return $textes;
    }

    /**
     * @param array<string, mixed> $regle
     * @param list<array{code: string, champ: string, message: string}> $erreurs
     */
    private function verifierValeur(mixed $valeur, array $regle, string $chemin, array &$erreurs): void
    {
        switch ($regle['type']) {
            case 'texte':
                if (!\is_string($valeur) || trim($valeur) === '') {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : texte attendu.');

                    return;
                }
                if (preg_match(self::HTML, $valeur) === 1) {
                    $erreurs[] = self::erreur('SCENE_HTML', $chemin, $chemin.' : ni balise HTML ni lien javascript: ou data:.');

                    return;
                }
                $n = mb_strlen(trim($valeur));
                if (isset($regle['max']) && $n > $regle['max']) {
                    $erreurs[] = self::erreur('SCENE_LIMITE', $chemin, sprintf('%s : %d caractères, %d au plus.', $chemin, $n, $regle['max']));
                }
                if (isset($regle['min']) && $n < $regle['min']) {
                    $erreurs[] = self::erreur('SCENE_LIMITE', $chemin, sprintf('%s : %d caractères, %d au moins.', $chemin, $n, $regle['min']));
                }

                return;
            case 'entier':
                if (!\is_int($valeur)) {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : nombre entier attendu.');

                    return;
                }
                if (isset($regle['min']) && $valeur < $regle['min']) {
                    $erreurs[] = self::erreur('SCENE_LIMITE', $chemin, sprintf('%s : %d au moins.', $chemin, $regle['min']));
                }
                if (isset($regle['max']) && $valeur > $regle['max']) {
                    $erreurs[] = self::erreur('SCENE_LIMITE', $chemin, sprintf('%s : %d au plus.', $chemin, $regle['max']));
                }

                return;
            case 'booleen':
                if (!\is_bool($valeur)) {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : true ou false attendu.');
                }

                return;
            case 'choix':
                if (!\in_array($valeur, $regle['valeurs'], true)) {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, sprintf('%s : une valeur parmi %s.', $chemin, implode(', ', $regle['valeurs'])));
                }

                return;
            case 'identifiant':
                if (!\is_string($valeur) || preg_match(self::IDENTIFIANT, $valeur) !== 1) {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : identifiant de 1 à 30 caractères (a-z, 0-9, - ou _).');
                }

                return;
            case 'liste':
                if (!\is_array($valeur) || !array_is_list($valeur)) {
                    $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : liste attendue.');

                    return;
                }
                if (\count($valeur) < $regle['min'] || \count($valeur) > $regle['max']) {
                    $erreurs[] = self::erreur('SCENE_LIMITE', $chemin, sprintf('%s : de %d à %d éléments (%d fournis).', $chemin, $regle['min'], $regle['max'], \count($valeur)));
                }
                foreach ($valeur as $i => $element) {
                    $this->verifierValeur($element, $regle['elements'], sprintf('%s[%d]', $chemin, $i), $erreurs);
                }

                return;
            case 'objet':
                $this->verifierObjet($valeur, $regle['champs'], $chemin, $erreurs);

                return;
            default:
                $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : type de champ inconnu.');
        }
    }

    /**
     * @param array<string, array<string, mixed>> $champs
     * @param list<array{code: string, champ: string, message: string}> $erreurs
     */
    private function verifierObjet(mixed $objet, array $champs, string $chemin, array &$erreurs): void
    {
        if (!\is_array($objet) || array_is_list($objet) && $objet !== []) {
            $erreurs[] = self::erreur('SCENE_TYPE', $chemin, $chemin.' : objet attendu.');

            return;
        }
        foreach (array_keys($objet) as $cle) {
            if (!\array_key_exists((string) $cle, $champs)) {
                $erreurs[] = self::erreur('SCENE_CHAMP_INCONNU', $chemin.'.'.$cle, sprintf('%s.%s : champ inconnu pour ce modèle de scène.', $chemin, $cle));
            }
        }
        foreach ($champs as $cle => $regle) {
            $valeur = $objet[$cle] ?? null;
            if ($valeur === null) {
                if ($regle['obligatoire'] ?? false) {
                    $erreurs[] = self::erreur('SCENE_CHAMP_MANQUANT', $chemin.'.'.$cle, sprintf('%s.%s : champ obligatoire.', $chemin, $cle));
                }
                continue;
            }
            $this->verifierValeur($valeur, $regle, $chemin.'.'.$cle, $erreurs);
        }
    }

    /**
     * Valeurs désignées par un chemin du catalogue : « blocs », « support.lignes », « branches[].id ».
     *
     * @param array<string, mixed> $scene
     */
    private static function valeursDe(array $scene, string $chemin): mixed
    {
        [$base, $sous] = array_pad(explode('[].', $chemin, 2), 2, null);
        $liste = $scene;
        foreach (explode('.', (string) $base) as $cle) {
            $liste = \is_array($liste) ? ($liste[$cle] ?? null) : null;
        }
        if ($sous === null) {
            return $liste;
        }

        return \is_array($liste) ? array_map(static fn ($e) => \is_array($e) ? ($e[$sous] ?? null) : null, array_values($liste)) : [];
    }

    /**
     * @param array<string, mixed> $scene
     * @param list<array<string, mixed>> $references
     * @param list<array{code: string, champ: string, message: string}> $erreurs
     */
    private function verifierReferences(array $scene, array $references, array &$erreurs): void
    {
        foreach ($references as $ref) {
            if (isset($ref['indiceDe'])) {
                $valeur = self::valeursDe($scene, $ref['champ']);
                $liste = self::valeursDe($scene, $ref['indiceDe']);
                if (\is_int($valeur) && \is_array($liste) && $valeur >= \count($liste)) {
                    $erreurs[] = self::erreur('SCENE_REFERENCE', $ref['champ'], sprintf('%s : désigne l\'élément %d de %s, qui n\'en a que %d (le premier est 0).', $ref['champ'], $valeur, $ref['indiceDe'], \count($liste)));
                }
            } elseif (isset($ref['parmi'])) {
                $valeur = self::valeursDe($scene, $ref['champ']);
                $possibles = self::valeursDe($scene, $ref['parmi']) ?? [];
                if ($valeur !== null && !\in_array($valeur, (array) $possibles, true)) {
                    $erreurs[] = self::erreur('SCENE_REFERENCE', $ref['champ'], sprintf('%s : « %s » ne fait pas partie de %s (%s).', $ref['champ'], self::affiche($valeur), $ref['parmi'], implode(', ', array_map(self::affiche(...), (array) $possibles))));
                }
            } elseif (isset($ref['unique'])) {
                $valeurs = (array) (self::valeursDe($scene, $ref['unique']) ?? []);
                if (\count(array_unique(array_map(self::affiche(...), $valeurs))) !== \count($valeurs)) {
                    $erreurs[] = self::erreur('SCENE_REFERENCE', $ref['unique'], $ref['unique'].' : chaque valeur doit être unique.');
                }
            } elseif (isset($ref['auMoinsUn'])) {
                $valeurs = (array) (self::valeursDe($scene, $ref['auMoinsUn']) ?? []);
                if (!\in_array($ref['valeur'], $valeurs, true)) {
                    $erreurs[] = self::erreur('SCENE_REFERENCE', $ref['auMoinsUn'], sprintf('%s : il faut au moins un élément avec la valeur %s.', $ref['auMoinsUn'], json_encode($ref['valeur'])));
                }
            }
        }
    }

    private static function affiche(mixed $valeur): string
    {
        return \is_scalar($valeur) ? (string) $valeur : (string) json_encode($valeur);
    }

    /**
     * @return array{code: string, champ: string, message: string}
     */
    private static function erreur(string $code, string $champ, string $message): array
    {
        return ['code' => $code, 'champ' => $champ, 'message' => $message];
    }
}
