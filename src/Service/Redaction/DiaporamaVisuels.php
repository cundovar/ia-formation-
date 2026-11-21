<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Domain\CourseMedia\Repository\CourseMediaRepositoryInterface;
use App\Entity\CourseMedia;
use App\Entity\PageContent;
use App\Service\CaptureFileManager;

/**
 * Visuels qu'un diaporama peut reprendre (DIA-12) : les captures et illustrations des cours exploités, avec leurs
 * métadonnées du back-office, le cours et le passage où elles apparaissent, et un indice « interface simulée »
 * tiré seulement de leur légende. Rien n'est inventé : un champ absent reste nul.
 */
final class DiaporamaVisuels
{
    // Dimension maximale de l'aperçu renvoyé à l'agent
    public const APERCU_MAX = 1024;
    // Au-delà, sans bibliothèque d'images pour réduire, l'aperçu n'est pas envoyé (seulement l'adresse)
    private const APERCU_OCTETS_MAX = 1_500_000;
    private const PASSAGE = 220;

    private const INDICES_SIMULE = ['simulation', 'simulé', 'simulée', 'simulés', 'simulées', 'interface fictive', 'interfaces fictives', 'commandes indicatives', 'interface indicative', 'positions des commandes sont indicatives'];
    private const INDICES_REEL = ['capture réelle', 'réellement générée', 'réellement produite', 'échec réel', 'page officielle'];

    public function __construct(
        private CourseMediaRepositoryInterface $captures,
        private ?CaptureFileManager $fichiers = null,
    ) {}

    /**
     * @param list<PageContent> $cours cours exploités par la synthèse (mêmes droits que le texte source)
     * @return list<array<string, mixed>>
     */
    public function inventaire(array $cours): array
    {
        $visuels = [];
        foreach ($cours as $c) {
            $html = (string) ($c->getCode() ?: $c->getContent());
            if (preg_match_all('/\[capture:(\d+)\]/', $html, $marqueurs, \PREG_OFFSET_CAPTURE) === 0) {
                continue;
            }
            foreach ($marqueurs[0] as $i => [$marqueur, $position]) {
                $id = (int) $marqueurs[1][$i][0];
                $usage = ['coursId' => $c->getId(), 'cours' => $c->getTitle(), 'passage' => self::passage($html, (int) $position, \strlen($marqueur))];
                if (isset($visuels[$id])) {
                    $visuels[$id]['usages'][] = $usage;
                    continue;
                }
                $media = $this->captures->findById($id);
                if ($media === null) {
                    continue;
                }
                $visuels[$id] = $this->fiche($media) + ['usages' => [$usage]];
            }
        }

        return array_values($visuels);
    }

    /**
     * @return array<string, mixed>
     */
    public function fiche(CourseMedia $media): array
    {
        $fiche = CaptureSummary::of($media);
        [$simulee, $indice] = self::interfaceSimulee($media->getCaption().' '.$media->getAltText());

        return $fiche + [
            'interfaceSimulee' => $simulee,
            'indiceSimulation' => $indice,
            'apercu' => 'voir_visuel avec id '.$media->getId(),
        ];
    }

    /**
     * Aperçu de l'image pour l'agent : réduite à APERCU_MAX pixels si la bibliothèque GD est disponible.
     *
     * @return array{fiche: array<string, mixed>, image: ?array{data: string, mimeType: string}, raison: ?string}
     */
    public function apercu(int $id): array
    {
        $media = $this->captures->findById($id) ?? throw new RedactionError('Visuel introuvable (voir visuels de preparer_diaporama ou lister_captures).', RedactionError::NOT_FOUND);
        $fiche = $this->fiche($media);
        $chemin = $media->getFilename() === null || $this->fichiers === null ? null : $this->fichiers->path($media->getFilename());
        if ($chemin === null || !is_file($chemin)) {
            return ['fiche' => $fiche, 'image' => null, 'raison' => 'Fichier image absent sur le serveur.'];
        }
        $reduite = self::reduire($chemin);
        if ($reduite !== null) {
            return ['fiche' => $fiche, 'image' => ['data' => base64_encode($reduite), 'mimeType' => 'image/jpeg'], 'raison' => null];
        }
        $taille = (int) filesize($chemin);
        if ($taille > self::APERCU_OCTETS_MAX) {
            return ['fiche' => $fiche, 'image' => null, 'raison' => sprintf('Image de %d Ko, trop lourde pour un aperçu : ouvrez l\'adresse url.', intdiv($taille, 1024))];
        }

        return ['fiche' => $fiche, 'image' => ['data' => base64_encode((string) file_get_contents($chemin)), 'mimeType' => (string) ($media->getMimeType() ?? 'image/png')], 'raison' => null];
    }

    /**
     * Indice tiré de la légende et du texte alternatif : true si l'image se dit simulée, false si elle se dit réelle,
     * null si rien ne l'indique.
     *
     * @return array{0: ?bool, 1: ?string}
     */
    public static function interfaceSimulee(string $texte): array
    {
        $texte = mb_strtolower($texte);
        foreach (self::INDICES_SIMULE as $indice) {
            if (str_contains($texte, $indice)) {
                return [true, sprintf('La légende ou l\'alternative indique « %s ».', $indice)];
            }
        }
        foreach (self::INDICES_REEL as $indice) {
            if (str_contains($texte, $indice)) {
                return [false, sprintf('La légende ou l\'alternative indique « %s ».', $indice)];
            }
        }

        return [null, null];
    }

    private static function passage(string $html, int $position, int $longueur): string
    {
        $avant = substr($html, max(0, $position - 600), min(600, $position));
        $apres = substr($html, $position + $longueur, 600);
        // Les balises deviennent des espaces : deux paragraphes ne se collent pas
        $nettoyer = static fn (string $t) => trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags(preg_replace(['/\[capture:\d+\]/', '/<[^>]*>/', '/<[^>]*$/', '/^[^<]*>/'], ' ', $t) ?? $t), \ENT_QUOTES | \ENT_HTML5, 'UTF-8')) ?? '');
        $texte = mb_substr($nettoyer($avant), -intdiv(self::PASSAGE, 2)).' [visuel] '.mb_substr($nettoyer($apres), 0, intdiv(self::PASSAGE, 2));

        return trim(mb_convert_encoding($texte, 'UTF-8', 'UTF-8'));
    }

    private static function reduire(string $chemin): ?string
    {
        if (!\function_exists('imagecreatefromstring')) {
            return null;
        }
        $source = @imagecreatefromstring((string) file_get_contents($chemin));
        if ($source === false) {
            return null;
        }
        $largeur = imagesx($source);
        $hauteur = imagesy($source);
        $echelle = min(1, self::APERCU_MAX / max($largeur, $hauteur, 1));
        $w = max(1, (int) round($largeur * $echelle));
        $h = max(1, (int) round($hauteur * $echelle));
        $cible = imagecreatetruecolor($w, $h);
        imagefill($cible, 0, 0, (int) imagecolorallocate($cible, 255, 255, 255));
        imagecopyresampled($cible, $source, 0, 0, 0, 0, $w, $h, $largeur, $hauteur);
        ob_start();
        imagejpeg($cible, null, 80);

        return (string) ob_get_clean();
    }
}
