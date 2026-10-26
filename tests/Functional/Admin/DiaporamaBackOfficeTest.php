<?php

declare(strict_types=1);

namespace App\Tests\Functional\Admin;

use App\Entity\Category;
use App\Entity\Diaporama;
use App\Entity\Page;
use App\Entity\PageContent;
use App\Entity\User;
use App\Service\Redaction\DiaporamaSource;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * Le responsable éditorial relit un diaporama, corrige un point ou une note, le retire du site
 * et voit ceux dont le cours a changé (docs/PLAN_DIAPORAMAS.md, D7).
 */
final class DiaporamaBackOfficeTest extends WebTestCase
{
    private const DEMO = __DIR__.'/../../../front/tests/unit/diaporamas/demo.json';
    private const COURS = '<h2>Une consigne claire</h2><p>Une intelligence artificielle répond toujours à la question exacte que la personne lui a posée, sans deviner son intention.</p>';

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;
    private int $coursId;
    private int $id;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $schemaTool = new SchemaTool($this->entityManager);
        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        $admin = (new User())->setUsername('redaction')->setRoles(['ROLE_ADMIN'])->setPassword('inutilise');
        $parcours = (new Category())->setName('consignes')->setAudience(Category::AUDIENCE_APPRENDRE);
        $page = (new Page())->setSlug('/bien-ecrire-une-consigne');
        $cours = (new PageContent())->setTitle('Bien écrire une consigne')->setStatus(PageContent::STATUS_PUBLISHED)
            ->setPage($page)->setCategory($parcours)->setCode(self::COURS);

        // Diaporama de démonstration du front, sans sa capture (aucune capture dans ce test)
        $demo = json_decode((string) file_get_contents(self::DEMO), true, flags: \JSON_THROW_ON_ERROR);
        $demo['diapositives'][5] = ['modele' => 'notion', 'points' => ['La consigne est précise', 'La réponse suit le format']] + $demo['diapositives'][5];
        unset($demo['diapositives'][5]['capture']);
        $diaporama = (new Diaporama('connecteur:Claude#1'))
            ->setCible($cours, null)
            ->setTitre($demo['titre'])
            ->setSousTitre($demo['sousTitre'])
            ->setDiapositives($demo['diapositives'])
            ->recordReview(['avis' => 'favorable', 'resume' => 'Synthèse fidèle au cours.', 'points' => []], 'connecteur:ChatGPT#2')
            ->markPublished();
        $diaporama->setEmpreinteSource((new DiaporamaSource())->empreinte($diaporama));

        foreach ([$admin, $parcours, $page, $cours, $diaporama] as $entity) {
            $this->entityManager->persist($entity);
        }
        $this->entityManager->flush();
        $this->coursId = (int) $cours->getId();
        $this->id = (int) $diaporama->getId();
        $this->client->loginUser($admin, 'main');
    }

    public function testListAndDetailShowTheSlidesAndTheReview(): void
    {
        $this->client->request('GET', '/admin');
        $this->client->clickLink('Diaporamas');
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('body', 'Cours : Bien écrire une consigne');
        self::assertSelectorTextContains('body', 'À jour');

        $this->client->request('GET', '/admin/diaporama/'.$this->id);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('body', 'Une consigne en 4 temps');
        self::assertSelectorTextContains('body', 'Détaillez chaque temps avec le même fil rouge');
        self::assertSelectorTextContains('body', 'Synthèse fidèle au cours.');
        self::assertSelectorTextContains('body', 'Retirer du site');
    }

    public function testCorrectionKeepsStatusReviewAndFollowUp(): void
    {
        $crawler = $this->client->request('GET', '/admin/diaporama/'.$this->id.'/corriger');
        self::assertResponseIsSuccessful();
        $yaml = $crawler->filter('textarea')->text(null, false);
        self::assertStringContainsString('modele: etapes', $yaml);

        $this->client->submitForm('Enregistrer la correction', [
            'form[titre]' => 'Écrire une bonne consigne',
            'form[diapositives]' => str_replace('Le rôle : qui doit répondre', 'Le rôle : qui répond', $yaml),
        ]);
        self::assertResponseRedirects();
        $this->client->followRedirect();
        self::assertSelectorTextContains('body', 'Diaporama corrigé.');

        $diaporama = $this->diaporama();
        self::assertSame('Écrire une bonne consigne', $diaporama->getTitre());
        self::assertSame('Le rôle : qui répond', $diaporama->getDiapositives()[3]['points'][0]);
        self::assertTrue($diaporama->isPublished());
        self::assertNotNull($diaporama->getReviewReport());
        self::assertFalse((new DiaporamaSource())->estPerime($diaporama));
    }

    public function testInvalidOrBlockingCorrectionIsNotSaved(): void
    {
        $crawler = $this->client->request('GET', '/admin/diaporama/'.$this->id.'/corriger');
        $yaml = $crawler->filter('textarea')->text(null, false);

        $this->client->submitForm('Enregistrer la correction', ['form[diapositives]' => "- modele: notion\n  points: [\n"]);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.alert-danger', 'Diapositives illisibles');

        $slides = Yaml::parse($yaml);
        $slides[3]['notes'] = '';
        $this->client->submitForm('Enregistrer la correction', ['form[diapositives]' => Yaml::dump($slides, 4, 2)]);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.alert-danger', 'DIAPO_NOTES_MANQUANTES');

        self::assertStringStartsWith('Détaillez chaque temps', $this->diaporama()->getDiapositives()[3]['notes']);
    }

    public function testChangedCourseIsFlaggedUntilMarkedUpToDate(): void
    {
        $this->entityManager->find(PageContent::class, $this->coursId)?->setCode(self::COURS.'<p>Un nouveau paragraphe.</p>');
        $this->entityManager->flush();

        $this->client->request('GET', '/admin');
        self::assertSelectorTextContains('[data-testid="diaporamas-outdated"]', 'Bien écrire une consigne');
        $this->client->request('GET', '/admin/diaporama/'.$this->id);
        self::assertSelectorTextContains('body', 'À mettre à jour');
        self::assertSelectorTextContains('body', 'DIAPO_SOURCE_PERIMEE');

        $this->client->request('POST', '/admin/diaporama/'.$this->id.'/marquer-a-jour');
        self::assertResponseRedirects();
        $this->client->request('GET', '/admin');
        self::assertSelectorTextContains('[data-testid="diaporamas-outdated"]', 'Aucun diaporama à mettre à jour.');
    }

    public function testUnpublishedDiaporamaLeavesThePublicApi(): void
    {
        $this->client->request('POST', '/admin/diaporama/'.$this->id.'/retirer');
        self::assertResponseRedirects();

        $diaporama = $this->diaporama();
        self::assertSame(Diaporama::STATUS_DRAFT, $diaporama->getStatus());
        self::assertNull($diaporama->getReviewReport());

        $this->client->request('GET', '/api/diaporamas', ['cours' => $this->coursId], [], ['HTTP_ACCEPT' => 'application/ld+json']);
        self::assertSame([], json_decode((string) $this->client->getResponse()->getContent(), true)['member']);
    }

    private function diaporama(): Diaporama
    {
        $this->entityManager->clear();

        return $this->entityManager->find(Diaporama::class, $this->id) ?? throw new \LogicException('Diaporama absent.');
    }
}
