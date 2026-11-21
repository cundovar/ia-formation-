<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\Redaction\SceneCatalogue;
use App\Service\Redaction\SceneValidator;
use PHPUnit\Framework\TestCase;

/**
 * Validation des scènes côté connecteur : même catalogue et même jeu d'exemples que le site
 * (front/tests/unit/diaporamas/scenes.spec.js).
 */
final class SceneValidatorTest extends TestCase
{
    private const REGLES = __DIR__.'/../../regles/scenes';

    private static function validateur(): SceneValidator
    {
        return new SceneValidator(new SceneCatalogue(self::REGLES.'/catalogue.json'));
    }

    /**
     * @return array<string, mixed>
     */
    private static function json(string $fichier): array
    {
        return json_decode((string) file_get_contents($fichier), true, 64, \JSON_THROW_ON_ERROR);
    }

    public function testCatalogueCompletAvecSixScenes(): void
    {
        $catalogue = new SceneCatalogue(self::REGLES.'/catalogue.json');

        self::assertSame(['escalier', 'chaine_traitement', 'aiguillage', 'entonnoir', 'loupe', 'sas_validation'], $catalogue->types());
        self::assertSame($catalogue->types(), $catalogue->champsCommuns()['type']['valeurs']);
        foreach ($catalogue->resume() as $scene) {
            self::assertNotEmpty($scene['peutInduireEnErreur'], $scene['type']);
            self::assertContains($scene['rendus']['pptx'], ['fixe', 'etapes']);
        }
    }

    public function testAccepteLesExemplesDuCatalogue(): void
    {
        foreach ((new SceneCatalogue(self::REGLES.'/catalogue.json'))->resume() as $scene) {
            self::assertSame([], self::validateur()->valider($scene['exemple']), $scene['type']);
        }
    }

    /**
     * @return iterable<string, array{mixed}>
     */
    public static function valides(): iterable
    {
        foreach (self::json(self::REGLES.'/exemples/valides.json')['cas'] as $cas) {
            yield $cas['cas'] => [$cas['scene']];
        }
        // Scènes du pilote et de la galerie, gardées en brouillon côté site
        $front = __DIR__.'/../../front/src/diaporamas/pilote';
        foreach (['automatiser.json', 'scenes.json'] as $fichier) {
            foreach (self::json($front.'/'.$fichier)['diapositives'] as $i => $diapo) {
                if (isset($diapo['scene'])) {
                    yield $fichier.' #'.$i => [$diapo['scene']];
                }
            }
        }
    }

    /**
     * @dataProvider valides
     */
    public function testAccepteUneSceneValide(mixed $scene): void
    {
        self::assertSame([], self::validateur()->valider($scene));
    }

    /**
     * @return iterable<string, array{mixed, string}>
     */
    public static function invalides(): iterable
    {
        foreach (self::json(self::REGLES.'/exemples/invalides.json')['cas'] as $cas) {
            yield $cas['cas'] => [$cas['scene'], $cas['attendu']];
        }
    }

    /**
     * @dataProvider invalides
     */
    public function testRefuseUneSceneInvalide(mixed $scene, string $code): void
    {
        self::assertContains($code, array_column(self::validateur()->valider($scene), 'code'));
    }

    public function testTextesProjetesSansIdentifiantsNiJustification(): void
    {
        $textes = SceneValidator::textes([
            'type' => 'aiguillage', 'condition' => 'Reste-t-il une place ?', 'brancheSuivie' => 'oui',
            'branches' => [['id' => 'oui', 'libelle' => 'Inscrire']], 'justification' => 'Pourquoi',
        ]);

        self::assertSame(['Reste-t-il une place ?', 'Inscrire'], $textes);
    }
}
