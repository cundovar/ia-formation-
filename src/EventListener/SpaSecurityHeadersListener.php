<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Service\SpaContentSecurityPolicy;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Ajoute la CSP aux pages de l'application Vue (route `spa_app`), en production seulement :
 * en développement, Vite sert les scripts depuis une autre origine.
 */
#[AsEventListener(event: KernelEvents::RESPONSE)]
final class SpaSecurityHeadersListener
{
    public function __construct(#[Autowire('%kernel.environment%')] private string $environment) {}

    public function __invoke(ResponseEvent $event): void
    {
        if (!$event->isMainRequest() || $this->environment !== 'prod') {
            return;
        }
        if ($event->getRequest()->attributes->get('_route') !== 'spa_app') {
            return;
        }

        $headers = $event->getResponse()->headers;
        if (!$headers->has('Content-Security-Policy')) {
            $headers->set('Content-Security-Policy', SpaContentSecurityPolicy::header());
        }
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('X-Content-Type-Options', 'nosniff');
    }
}
