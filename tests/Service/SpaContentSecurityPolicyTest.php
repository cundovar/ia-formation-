<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\EventListener\SpaSecurityHeadersListener;
use App\Service\SpaContentSecurityPolicy;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

final class SpaContentSecurityPolicyTest extends TestCase
{
    public function testScriptsAndConnectionsAreLimited(): void
    {
        $policy = SpaContentSecurityPolicy::header();

        self::assertStringContainsString("script-src 'self';", $policy);
        self::assertStringContainsString("connect-src 'self' https://api.anthropic.com;", $policy);
        self::assertStringContainsString("object-src 'none'", $policy);
        self::assertStringContainsString("frame-src 'none'", $policy);
        self::assertStringNotContainsString('unsafe-eval', $policy);
        self::assertStringNotContainsString("script-src 'self' 'unsafe-inline'", $policy);
    }

    public function testHeaderOnlyOnSpaPagesInProduction(): void
    {
        self::assertTrue($this->headers('prod', 'spa_app')->has('Content-Security-Policy'));
        self::assertFalse($this->headers('prod', 'oauth_authorize')->has('Content-Security-Policy'));
        self::assertFalse($this->headers('dev', 'spa_app')->has('Content-Security-Policy'));
    }

    private function headers(string $environment, string $route): \Symfony\Component\HttpFoundation\ResponseHeaderBag
    {
        $request = new Request();
        $request->attributes->set('_route', $route);
        $kernel = $this->createMock(HttpKernelInterface::class);
        $event = new ResponseEvent($kernel, $request, HttpKernelInterface::MAIN_REQUEST, new Response());
        (new SpaSecurityHeadersListener($environment))($event);

        return $event->getResponse()->headers;
    }
}
