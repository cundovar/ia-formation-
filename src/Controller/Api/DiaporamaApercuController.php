<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\Redaction\DiaporamaService;
use App\Service\Redaction\RedactionError;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Aperçu d'un diaporama pour les administrateurs, quel que soit son statut (/spa/diaporamas/apercu/{id}) :
 * diapositives au format du site, statut, cible, couverture, contrôles et relecture. L'API publique
 * (/api/diaporamas) ne sert jamais un brouillon.
 */
#[Route('/api/apercu-diaporamas')]
#[IsGranted('ROLE_ADMIN')]
final class DiaporamaApercuController extends AbstractController
{
    public function __construct(private DiaporamaService $diaporamas) {}

    #[Route('/{id<\d+>}', name: 'api_admin_diaporama_apercu', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        try {
            $detail = $this->diaporamas->show($id);
            $controles = $this->diaporamas->check($id);
        } catch (RedactionError) {
            throw new NotFoundHttpException('Diaporama introuvable.');
        }
        $cible = $detail['cible'];

        $response = $this->json($detail + [
            'audience' => $detail['public'],
            'cours' => $cible['type'] === 'cours' ? $cible['id'] : null,
            'chapitre' => $cible['type'] === 'chapitre' ? $cible['id'] : null,
            'parcours' => $cible['type'] === 'parcours' ? $cible['id'] : null,
            'controles' => $controles['controles'],
            'publiable' => $controles['publiable'],
        ]);
        // Jamais mis en cache hors ligne ni par un intermédiaire : un brouillon reste privé
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
