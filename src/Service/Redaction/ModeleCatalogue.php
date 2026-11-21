<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Catalogue des modèles de diapositive (regles/diaporamas/modeles.json), lu aussi par le site
 * (front/src/diaporamas/modeles.js) : champs, limites, ordre de lecture et rendus restent identiques
 * pour le connecteur, les contrôles et la mise en page.
 */
final class ModeleCatalogue
{
    /** @var array<string, mixed>|null */
    private ?array $donnees = null;

    public function __construct(#[Autowire('%kernel.project_dir%/regles/diaporamas/modeles.json')] private string $fichier) {}

    public static function parDefaut(): self
    {
        return new self(\dirname(__DIR__, 3).'/regles/diaporamas/modeles.json');
    }

    /**
     * @return array<string, mixed>
     */
    public function tout(): array
    {
        if ($this->donnees === null) {
            $json = is_file($this->fichier) ? file_get_contents($this->fichier) : false;
            $donnees = $json === false ? null : json_decode($json, true, 64, \JSON_THROW_ON_ERROR);
            if (!\is_array($donnees) || !\is_array($donnees['modeles'] ?? null)) {
                throw new \RuntimeException(sprintf('Catalogue des modèles illisible : %s', $this->fichier));
            }
            $this->donnees = $donnees;
        }

        return $this->donnees;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function modeles(): array
    {
        return $this->tout()['modeles'];
    }

    /**
     * @return list<string>
     */
    public function ids(): array
    {
        return array_keys($this->modeles());
    }

    /**
     * @return array<string, mixed>|null
     */
    public function modele(mixed $id): ?array
    {
        return \is_string($id) ? ($this->modeles()[$id] ?? null) : null;
    }

    /**
     * Rendus web, .pptx et PDF d'un modèle (ceux du catalogue, sinon les rendus par défaut).
     *
     * @return array{web: string, pptx: string, pdf: string}
     */
    public function rendus(string $id): array
    {
        return ($this->modele($id)['rendus'] ?? []) + $this->tout()['rendusParDefaut'];
    }

    /**
     * Résumé pour l'agent : usage, champs, limites, ordre de lecture et rendus de chaque modèle.
     *
     * @return array<string, array<string, mixed>>
     */
    public function resume(): array
    {
        $resume = [];
        foreach ($this->modeles() as $id => $spec) {
            $resume[$id] = array_diff_key($spec, ['rendus' => true]) + ['rendus' => $this->rendus($id)];
        }

        return $resume;
    }
}
