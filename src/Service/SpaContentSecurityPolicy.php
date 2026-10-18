<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Politique de sécurité (CSP) des pages de l'application Vue.
 *
 * Elle limite les scripts au site et les connexions au site et aux fournisseurs d'IA du mode
 * « IA réelle » des laboratoires (LAB-08) : un script injecté ne pourrait pas envoyer la clé
 * de l'apprenant ailleurs. Les cours n'ont ni iframe ni script tiers (contenu nettoyé).
 */
final class SpaContentSecurityPolicy
{
    // Fournisseurs que le navigateur peut appeler directement (front/src/services/iaReelle)
    public const AI_PROVIDERS = ['https://api.anthropic.com'];

    public static function header(): string
    {
        $directives = [
            'default-src' => ["'self'"],
            'script-src' => ["'self'"],
            // Liaisons de style de Vue (attributs style) : styles en ligne nécessaires
            'style-src' => ["'self'", "'unsafe-inline'"],
            // Captures et illustrations : site, données encodées et images https
            'img-src' => ["'self'", 'data:', 'blob:', 'https:'],
            'font-src' => ["'self'", 'data:'],
            'connect-src' => ["'self'", ...self::AI_PROVIDERS],
            'worker-src' => ["'self'"],
            'manifest-src' => ["'self'"],
            'frame-src' => ["'none'"],
            'object-src' => ["'none'"],
            'base-uri' => ["'self'"],
            'form-action' => ["'self'"],
            'frame-ancestors' => ["'self'"],
        ];

        return implode('; ', array_map(
            static fn (string $name, array $sources) => $name.' '.implode(' ', $sources),
            array_keys($directives),
            $directives,
        ));
    }
}
