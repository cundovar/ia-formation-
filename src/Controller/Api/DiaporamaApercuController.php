<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\Redaction\DiaporamaService;
use App\Service\Redaction\RedactionError;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Aperçu d'un diaporama pour les administrateurs, quel que soit son statut (/spa/diaporamas/apercu/{id}) :
 * diapositives au format du site, statut, cible, couverture, contrôles et relecture. L'API publique
 * (/api/diaporamas) ne sert jamais un brouillon. Le rapport de rendu mesuré dans l'aperçu revient au serveur par
 * POST (jeton CSRF fourni par le GET) : le connecteur le relit avec verifier_diaporama (boucle de contrôle visuel).
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
            'aRelire' => $controles['aRelire'],
            'jetonControleRendu' => $this->container->get('security.csrf.token_manager')->getToken(self::jeton($id))->getValue(),
        ]);
        // Jamais mis en cache hors ligne ni par un intermédiaire : un brouillon reste privé
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    /**
     * Enregistre le contrôle de rendu mesuré par l'aperçu (débordements, sorties du cadre, recouvrements).
     */
    #[Route('/{id<\d+>}/controle-rendu', name: 'api_admin_diaporama_controle_rendu', methods: ['POST'])]
    public function controleRendu(int $id, Request $request): JsonResponse
    {
        if (!$this->isCsrfTokenValid(self::jeton($id), (string) $request->headers->get('X-CSRF-Token'))) {
            throw new AccessDeniedHttpException('Jeton de sécurité invalide : rechargez l\'aperçu.');
        }
        if (\strlen($request->getContent()) > 200_000) {
            throw new BadRequestHttpException('Rapport trop volumineux.');
        }
        try {
            $rapport = json_decode($request->getContent(), true, 16, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new BadRequestHttpException('Rapport JSON attendu.');
        }
        if (!\is_array($rapport)) {
            throw new BadRequestHttpException('Rapport JSON attendu.');
        }
        try {
            $etat = $this->diaporamas->recordRenderReport($id, $rapport);
        } catch (RedactionError) {
            throw new NotFoundHttpException('Diaporama introuvable.');
        }
        $response = $this->json($etat, Response::HTTP_OK);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private static function jeton(int $id): string
    {
        return 'diaporama-controle-rendu-'.$id;
    }
}
