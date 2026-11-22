<?php

declare(strict_types=1);

namespace App\Service\Redaction;

/**
 * Contrat éditorial Atelier visuel v3. Les propriétés décrivent le contenu que le site met en forme.
 */
final class DiaporamaV3
{
    public const MAX_PARTIES = 4;
    public const MODELE_CHIFFRES = 'chiffres_cles';
    private const MAX_MOT_CLE = 3;
    private const MAX_TITRE_POINT = 4;
    private const MAX_LISTE = 3;
    private const FORMAT_VALEUR = '[+-]?[0-9]+(?:[.,][0-9]+)?';
    private const TEXTES_POINT = ['texte' => 90, 'aVerifier' => 60, 'action' => 40];
    private const MAX_ITEM = 40;
    private const TEXTES_DIAPO = ['centre' => 40, 'conclusion' => 100];
    private const TEXTES_CHIFFRES = ['valeur' => 20, 'unite' => 20, 'libelle' => 60, 'texte' => 100];
    private const MAX_PASSAGE = 300;

    /**
     * @return array{version: int, icones: array<string, array{sens: string}>}
     */
    public static function icones(): array
    {
        static $resultat = null;
        if ($resultat !== null) {
            return $resultat;
        }

        $json = file_get_contents(\dirname(__DIR__, 3).'/regles/diaporamas/icones.json');
        $catalogue = $json === false ? null : json_decode($json, true, 64, \JSON_THROW_ON_ERROR);
        if (!\is_array($catalogue) || !\is_int($catalogue['version'] ?? null) || !\is_array($catalogue['icones'] ?? null)) {
            throw new \RuntimeException('Catalogue des icônes de diaporama illisible.');
        }

        return $resultat = ['version' => $catalogue['version'], 'icones' => $catalogue['icones']];
    }

    /**
     * @return array<string, mixed>
     */
    public static function contrat(): array
    {
        return [
            'partiesMax' => self::MAX_PARTIES,
            'separateurs' => 'Le site insère un séparateur à la première diapositive de contenu d’une partie utilisée. Les séparateurs déjà rédigés sont conservés.',
            'scenarioPartie' => 'Obligatoire sur chaque diapositive, dans l’ordre des parties du scénario.',
            'champsDiapositive' => self::champsDiapositive(),
            'pointStructure' => self::pointStructure(),
            'icones' => self::icones()['icones'],
            'compositions' => [
                'convergence' => ['modeles' => ['notion', 'objectifs'], 'pointsStructures' => 4, 'relation' => 'Quatre éléments complémentaires convergent vers une idée centrale.'],
                'circuit' => ['modeles' => ['etapes', 'notion'], 'pointsStructures' => 3, 'relation' => 'Trois étapes ordonnées, par exemple demande, réponse de l’IA, contrôle humain.'],
            ],
            'rendusCompositions' => [
                'web' => 'Révélation progressive par clic ou au clavier en projection, avec vue fixe disponible.',
                'pdf' => 'Vue fixe puis étapes légendées.',
                'pptx' => 'Vue fixe avec formes et textes modifiables et étapes dans les notes.',
            ],
            'motCleRendu' => 'Le site surligne le mot-clé dans le titre, sur le web, en PDF et dans le .pptx.',
            'visuels' => 'Consultez la rubrique visuels et voir_visuel. Pour la démonstration, utilisez etapes[].capture et justifiez le choix dans le scénario. Les deux compositions v3 utilisent les icônes du catalogue.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function modeleChiffres(): array
    {
        $champs = [...array_keys(self::TEXTES_CHIFFRES), 'nature', 'proportion', 'source'];

        return [
            'usage' => 'Atelier visuel v3 : un repère pédagogique chiffré ou une statistique étayée par un cours utilisé.',
            'champs' => ['titre', ...$champs],
            'contrat' => array_intersect_key(self::champsDiapositive(), array_flip($champs)),
            'ordreLecture' => ['titre', 'valeur', 'unite', 'libelle', 'texte'],
            'rendus' => [
                'web' => 'Diapositive fixe : nature, valeur et unité, libellé, jauge si proportion, texte et passage source. En lecture étroite, une notion en phrases.',
                'pdf' => 'Même vue fixe que le web.',
                'pptx' => 'Même vue fixe, formes et textes modifiables.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function champsDiapositive(): array
    {
        return array_map(self::schemaTexte(...), self::TEXTES_DIAPO) + [
            'motCle' => self::schemaTexte(DiaporamaChecker::MAX_TITLE_LENGTH) + ['description' => sprintf('V3 : jusqu’à %d mots reproduits tels quels dans le titre.', self::MAX_MOT_CLE)],
            'miseEnAvant' => ['type' => 'integer', 'minimum' => 0, 'description' => 'V3 : index du point prioritaire (à partir de 0, premier point par défaut).'],
            'valeur' => self::schemaTexte(self::TEXTES_CHIFFRES['valeur']) + ['pattern' => '^'.self::FORMAT_VALEUR.'$'],
            'unite' => self::schemaTexte(self::TEXTES_CHIFFRES['unite']),
            'libelle' => self::schemaTexte(self::TEXTES_CHIFFRES['libelle']),
            'texte' => self::schemaTexte(self::TEXTES_CHIFFRES['texte']),
            'nature' => ['type' => 'string', 'enum' => ['repere', 'statistique'], 'description' => 'chiffres_cles : règle pédagogique (repere) ou mesure (statistique).'],
            'proportion' => ['type' => 'number', 'minimum' => 0, 'maximum' => 1, 'description' => 'chiffres_cles : proportion facultative, entre 0 et 1.'],
            'source' => [
                'type' => 'object',
                'properties' => ['coursId' => ['type' => 'integer', 'minimum' => 1], 'passage' => self::schemaTexte(self::MAX_PASSAGE)],
                'required' => ['coursId', 'passage'],
                'additionalProperties' => false,
                'description' => 'chiffres_cles : obligatoire pour une statistique. Passage exact du texte d’un cours utilisé, contenant la valeur et son unité.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function pointStructure(): array
    {
        return [
            'type' => 'object',
            'properties' => array_map(self::schemaTexte(...), self::TEXTES_POINT) + [
                'titre' => self::schemaTexte(self::TEXTES_POINT['texte']) + ['description' => sprintf('%d mots au plus.', self::MAX_TITRE_POINT)],
                'icone' => ['type' => 'string', 'enum' => array_keys(self::icones()['icones'])],
                'liste' => ['type' => 'array', 'minItems' => 1, 'maxItems' => self::MAX_LISTE, 'items' => self::schemaTexte(self::MAX_ITEM)],
            ],
            'required' => ['titre'],
            'anyOf' => [['required' => ['texte']], ['required' => ['liste']]],
            'additionalProperties' => false,
            'description' => 'Point structuré réservé à Atelier visuel v3. Donnez un texte ou une liste de contrôles.',
        ];
    }

    /**
     * @param array<string, mixed> $diapo
     * @param array<int, string> $cours
     * @return array<string, string> erreurs par champ
     */
    public static function verifier(array $diapo, array $cours): array
    {
        $erreurs = [];
        if (\array_key_exists('motCle', $diapo)) {
            $mot = $diapo['motCle'];
            $titre = $diapo['titre'] ?? '';
            if (!self::texteValide($mot, DiaporamaChecker::MAX_TITLE_LENGTH) || self::mots($mot) > self::MAX_MOT_CLE
                || !\is_string($titre) || preg_match('/(?<![\p{L}\p{N}])'.preg_quote($mot, '/').'(?![\p{L}\p{N}])/u', $titre) !== 1) {
                $erreurs['motCle'] = 'reprenez jusqu’à trois mots du titre, à l’identique.';
            }
        }
        foreach (self::TEXTES_DIAPO as $champ => $max) {
            self::verifierTexte($diapo, $champ, $max, false, '', $erreurs);
        }

        $points = \array_key_exists('points', $diapo) ? $diapo['points'] : [];
        if (!\is_array($points) || !array_is_list($points)) {
            $erreurs['points'] = 'liste de phrases ou de points structurés attendue.';
            $points = [];
        }
        if (\array_key_exists('miseEnAvant', $diapo)) {
            $index = $diapo['miseEnAvant'];
            if (!\is_int($index) || !isset($points[$index])) {
                $erreurs['miseEnAvant'] = 'indiquez l’index d’un point existant, à partir de zéro.';
            }
        }
        $icones = self::icones()['icones'];
        foreach ($points as $i => $point) {
            if (self::texteValide($point, 120)) {
                continue;
            }
            $prefixe = sprintf('points[%d]', $i);
            if (!\is_array($point) || array_is_list($point)) {
                $erreurs[$prefixe] = 'phrase ou point structuré attendu.';
                continue;
            }
            self::verifierPoint($point, $prefixe, $icones, $erreurs);
        }
        if (($diapo['modele'] ?? null) === self::MODELE_CHIFFRES) {
            self::verifierChiffres($diapo, $cours, $erreurs);
        }

        return $erreurs;
    }

    /**
     * @param array<string, mixed> $point
     * @param array<string, array{sens: string}> $icones
     * @param array<string, string> $erreurs
     */
    private static function verifierPoint(array $point, string $prefixe, array $icones, array &$erreurs): void
    {
        foreach (array_diff(array_keys($point), ['titre', 'icone', 'liste', ...array_keys(self::TEXTES_POINT)]) as $champ) {
            $erreurs["$prefixe.$champ"] = 'champ inconnu.';
        }
        $titre = $point['titre'] ?? null;
        if (!self::texteValide($titre, self::TEXTES_POINT['texte']) || self::mots($titre) > self::MAX_TITRE_POINT) {
            $erreurs["$prefixe.titre"] = 'indiquez un titre de quatre mots au plus.';
        }
        foreach (self::TEXTES_POINT as $champ => $max) {
            self::verifierTexte($point, $champ, $max, $champ === 'texte' && !isset($point['liste']), "$prefixe.", $erreurs);
        }
        if (\array_key_exists('icone', $point) && (!\is_string($point['icone']) || !isset($icones[$point['icone']]))) {
            $erreurs["$prefixe.icone"] = 'choisissez un identifiant de lister_icones.';
        }
        if (\array_key_exists('liste', $point)) {
            $liste = $point['liste'];
            if (!\is_array($liste) || !array_is_list($liste) || $liste === [] || \count($liste) > self::MAX_LISTE) {
                $erreurs["$prefixe.liste"] = sprintf('liste de 1 à %d contrôles attendue.', self::MAX_LISTE);
            } else {
                foreach ($liste as $i => $item) {
                    if (!self::texteValide($item, self::MAX_ITEM)) {
                        $erreurs["$prefixe.liste[$i]"] = sprintf('texte simple de %d caractères au plus attendu.', self::MAX_ITEM);
                    }
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $diapo
     * @param array<int, string> $cours
     * @param array<string, string> $erreurs
     */
    private static function verifierChiffres(array $diapo, array $cours, array &$erreurs): void
    {
        foreach (self::TEXTES_CHIFFRES as $champ => $max) {
            self::verifierTexte($diapo, $champ, $max, \in_array($champ, ['valeur', 'libelle'], true), '', $erreurs);
        }
        $valeur = $diapo['valeur'] ?? null;
        if (!\is_string($valeur) || preg_match('/^'.self::FORMAT_VALEUR.'$/D', $valeur) !== 1) {
            $erreurs['valeur'] = 'indiquez le nombre seul, en texte, et placez l’unité dans unite.';
        }
        $proportion = $diapo['proportion'] ?? null;
        if (\array_key_exists('proportion', $diapo) && ((!\is_int($proportion) && !\is_float($proportion)) || !is_finite($proportion) || $proportion < 0 || $proportion > 1)) {
            $erreurs['proportion'] = 'nombre compris entre 0 et 1 attendu.';
        }
        $nature = $diapo['nature'] ?? null;
        if (!\in_array($nature, ['repere', 'statistique'], true)) {
            $erreurs['nature'] = 'indiquez repere ou statistique.';
        }
        if ($nature !== 'statistique' && !\array_key_exists('source', $diapo)) {
            return;
        }

        $source = $diapo['source'] ?? null;
        $id = \is_array($source) ? ($source['coursId'] ?? null) : null;
        $passage = \is_array($source) ? ($source['passage'] ?? null) : null;
        if (!\is_int($id) || !isset($cours[$id]) || !self::texteValide($passage, self::MAX_PASSAGE)
            || array_diff(array_keys($source), ['coursId', 'passage']) !== []) {
            $erreurs['source'] = 'donnez le coursId d’un cours exploité et le passage exact du cours.';

            return;
        }

        $passage = preg_replace('/\s+/u', ' ', trim($passage)) ?? '';
        if (!str_contains($cours[$id], $passage)) {
            $erreurs['source.passage'] = 'le passage doit apparaître à l’identique dans le texte du cours indiqué.';

            return;
        }

        $unite = $diapo['unite'] ?? '';
        if (\is_string($valeur) && \is_string($unite) && !isset($erreurs['valeur']) && !isset($erreurs['unite'])) {
            $nombre = '(?<![\p{L}\p{N}+\-])(?<![0-9][.,])'.preg_quote($valeur, '/').'(?![.,][0-9])';
            $suffixe = $unite === '' ? '' : ' *'.preg_quote($unite, '/');
            if (preg_match('/'.$nombre.$suffixe.'(?![\p{L}\p{N}])/u', $passage) !== 1) {
                $erreurs['source.passage'] = 'le passage doit contenir la valeur exacte et son unité.';
            }
        }
    }

    /**
     * @param array<string, mixed> $objet
     * @param array<string, string> $erreurs
     */
    private static function verifierTexte(array $objet, string $champ, int $max, bool $obligatoire, string $prefixe, array &$erreurs): void
    {
        if (($obligatoire || \array_key_exists($champ, $objet)) && !self::texteValide($objet[$champ] ?? null, $max)) {
            $erreurs[$prefixe.$champ] = sprintf('texte simple de %d caractères au plus attendu.', $max);
        }
    }

    /** @phpstan-assert-if-true string $valeur */
    private static function texteValide(mixed $valeur, int $max): bool
    {
        return \is_string($valeur) && trim($valeur) !== '' && mb_strlen($valeur) <= $max && preg_match('/<\s*\/?\s*[a-z!?]/i', $valeur) !== 1;
    }

    private static function mots(string $texte): int
    {
        return \count(preg_split('/\s+/u', $texte, -1, \PREG_SPLIT_NO_EMPTY) ?: []);
    }

    /** @return array{type: string, minLength: int, maxLength: int} */
    private static function schemaTexte(int $max): array
    {
        return ['type' => 'string', 'minLength' => 1, 'maxLength' => $max];
    }
}
