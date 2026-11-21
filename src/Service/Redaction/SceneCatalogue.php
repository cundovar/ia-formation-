<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Catalogue versionné des scènes animées des diaporamas (regles/scenes/catalogue.json).
 * Le même fichier est lu par le site (front/src/diaporamas/scenes/valider.js) : modèles, champs,
 * limites, usages et exemples restent ainsi identiques pour le connecteur et pour le rendu.
 */
final class SceneCatalogue
{
    /** @var array<string, mixed>|null */
    private ?array $donnees = null;

    public function __construct(#[Autowire('%kernel.project_dir%/regles/scenes/catalogue.json')] private string $fichier) {}

    /**
     * @return array<string, mixed>
     */
    public function tout(): array
    {
        if ($this->donnees === null) {
            $json = is_file($this->fichier) ? file_get_contents($this->fichier) : false;
            $donnees = $json === false ? null : json_decode($json, true, 64, \JSON_THROW_ON_ERROR);
            if (!\is_array($donnees) || !\is_array($donnees['scenes'] ?? null)) {
                throw new \RuntimeException(sprintf('Catalogue des scènes illisible : %s', $this->fichier));
            }
            $this->donnees = $donnees;
        }

        return $this->donnees;
    }

    public function version(): int
    {
        return (int) $this->tout()['version'];
    }

    /**
     * @return list<string>
     */
    public function types(): array
    {
        return array_values(array_map(static fn (array $s) => (string) $s['id'], $this->tout()['scenes']));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function scene(mixed $type): ?array
    {
        foreach ($this->tout()['scenes'] as $scene) {
            if ($scene['id'] === $type) {
                return $scene;
            }
        }

        return null;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function champsCommuns(): array
    {
        return $this->tout()['champsCommuns'];
    }

    /**
     * @return list<string>
     */
    public function modelesAutorises(): array
    {
        return $this->tout()['modelesAutorises'];
    }

    /**
     * @return array{pointsMax: int, longueurPointMax: int}
     */
    public function limitesDiapositive(): array
    {
        return $this->tout()['limitesDiapositive'];
    }

    /**
     * Résumé pour l'agent : à quoi sert chaque scène, quand elle peut induire en erreur, ses champs et un exemple.
     *
     * @return list<array<string, mixed>>
     */
    public function resume(): array
    {
        return array_values(array_map(static fn (array $s) => [
            'type' => $s['id'],
            'version' => $s['version'],
            'libelle' => $s['libelle'],
            'usage' => $s['usage'],
            'convient' => $s['convient'],
            'peutInduireEnErreur' => $s['peutInduireEnErreur'],
            'champs' => $s['champs'],
            'etapes' => $s['etapes'],
            'rendus' => $s['rendus'],
            'exemple' => $s['exemple'],
        ], $this->tout()['scenes']));
    }
}
