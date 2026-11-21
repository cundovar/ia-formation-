<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Entity\CourseMedia;

/**
 * Fiche d'une capture ou d'une illustration telle que le connecteur la donne à l'agent : seules les métadonnées
 * enregistrées dans le back-office, sans rien compléter (une date ou une source absente reste nulle).
 */
final class CaptureSummary
{
    /**
     * @return array<string, mixed>
     */
    public static function of(CourseMedia $media): array
    {
        return [
            'id' => $media->getId(),
            'marqueur' => $media->getMarker(),
            'type' => $media->getKind(),
            'service' => $media->getService(),
            'pageSource' => $media->getSourceUrl(),
            'dateCapture' => $media->getCapturedAt()?->format('Y-m-d'),
            'legende' => $media->getCaption(),
            'texteAlternatif' => $media->getAltText(),
            'aRevoirLe' => $media->getNextReviewAt()?->format('Y-m-d'),
            'url' => $media->getUrl(),
            'largeur' => $media->getWidth(),
            'hauteur' => $media->getHeight(),
            'auteur' => $media->getAuthor(),
        ];
    }
}
