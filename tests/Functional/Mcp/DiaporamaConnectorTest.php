<?php

declare(strict_types=1);

namespace App\Tests\Functional\Mcp;

use App\Entity\Category;
use App\Entity\Diaporama;
use App\Entity\Menus;
use App\Entity\Page;
use App\Entity\PageContent;
use App\Entity\User;

/**
 * Le connecteur rédige le diaporama d'un cours, d'un chapitre ou d'un parcours, un autre connecteur le relit, puis il est publié
 * (docs/PLAN_DIAPORAMAS.md). Avant la publication, rien n'apparaît dans l'API publique.
 */
final class DiaporamaConnectorTest extends McpTestCase
{
    private const DEMO = __DIR__.'/../../../front/tests/unit/diaporamas/demo.json';
    private const COURS = '<h2>Une consigne claire</h2><p>Une intelligence artificielle répond toujours à la question exacte que la personne lui a posée, sans deviner son intention.</p>';

    private Category $parcours;
    private PageContent $cours;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parcours = (new Category())->setName('consignes')->setAudience(Category::AUDIENCE_APPRENDRE);
        $this->entityManager->persist($this->parcours);
        $this->cours = $this->course('bien-ecrire-une-consigne');
        $this->entityManager->flush();
    }

    public function testToolsAndPromptsGuideBothConnectors(): void
    {
        $tools = array_column($this->rpc(self::CHATGPT, 'tools/list')['result']['tools'], null, 'name');
        self::assertTrue($tools['preparer_diaporama']['annotations']['readOnlyHint']);
        self::assertFalse($tools['creer_diaporama']['annotations']['readOnlyHint']);
        self::assertSame(5, $tools['creer_diaporama']['inputSchema']['properties']['diapositives']['items']['properties']['points']['maxItems']);
        self::assertStringContainsString('autre connecteur', $tools['publier_diaporama']['description']);

        $writing = $this->rpc(self::CLAUDE, 'prompts/get', ['name' => 'rediger_diaporama', 'arguments' => ['cible' => 'module', 'id' => '4']]);
        $text = $writing['result']['messages'][0]['content']['text'];
        self::assertStringContainsString('preparer_diaporama avec moduleId 4', $text);
        self::assertStringContainsString('10 à 20 diapositives', $text);
        self::assertLessThan(strpos($text, 'publier_diaporama'), strpos($text, 'relire_diaporama'));

        $review = $this->rpc(self::CHATGPT, 'prompts/get', ['name' => 'relire_diaporama', 'arguments' => ['id' => '7']]);
        self::assertStringContainsString('voir_diaporama 7', $review['result']['messages'][0]['content']['text']);

        self::assertStringContainsString('## DIA-02 — Synthétiser, pas copier', $this->tool(self::CLAUDE, 'lire_regles', ['identifiants' => ['DIA-02']])['text']);
    }

    public function testSourceGivesTheCourseTextAndTheExpectedFormat(): void
    {
        $source = $this->tool(self::CLAUDE, 'preparer_diaporama', ['coursId' => $this->cours->getId()]);

        self::assertFalse($source['error'], $source['text']);
        self::assertSame(['type' => 'cours', 'id' => $this->cours->getId(), 'titre' => 'bien-ecrire-une-consigne'], $source['data']['cible']);
        self::assertSame('apprendre', $source['data']['public']);
        self::assertSame([6, 12], $source['data']['diapositivesAttendues']);
        self::assertStringContainsString('sans deviner son intention', $source['data']['cours'][0]['texte']);
        self::assertNull($source['data']['diaporamaExistant']);

        $both = $this->tool(self::CLAUDE, 'preparer_diaporama', ['coursId' => $this->cours->getId(), 'moduleId' => 1]);
        self::assertTrue($both['error']);
        self::assertStringContainsString('une seule cible', $both['text']);
    }

    public function testDiaporamaIsWrittenReviewedByAnotherConnectorThenPublished(): void
    {
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId()] + $this->demo());
        self::assertFalse($created['error'], $created['text']);
        $id = $created['data']['id'];
        self::assertSame(Diaporama::STATUS_DRAFT, $created['data']['statut']);
        self::assertSame([], $this->publicDiaporamas());

        $self = $this->tool(self::CLAUDE, 'enregistrer_relecture_diaporama', $this->review($id, 'favorable'));
        self::assertStringContainsString("d'un autre agent", $self['text']);

        $reserves = $this->tool(self::CHATGPT, 'enregistrer_relecture_diaporama', $this->review($id, 'reserves'));
        self::assertSame(Diaporama::STATUS_TO_FIX, $reserves['data']['statut']);
        self::assertStringContainsString('RELECTURE_AVEC_RESERVES', $this->tool(self::CLAUDE, 'publier_diaporama', ['id' => $id])['text']);

        $this->tool(self::CHATGPT, 'enregistrer_relecture_diaporama', $this->review($id, 'favorable'));
        $published = $this->tool(self::CLAUDE, 'publier_diaporama', ['id' => $id]);
        self::assertFalse($published['error'], $published['text']);
        self::assertSame(Diaporama::STATUS_PUBLISHED, $published['data']['statut']);
        self::assertStringEndsWith('/spa/pages/bien-ecrire-une-consigne', $published['data']['adressePublique']);

        $public = $this->publicDiaporamas();
        self::assertCount(1, $public);
        self::assertSame('Bien écrire une consigne', $public[0]['titre']);
        self::assertSame('apprendre', $public[0]['audience']);
        self::assertCount(10, $public[0]['diapositives']);

        // Une cible n'a qu'un diaporama ; un diaporama publié se corrige et reste visible, sans relecture
        self::assertStringContainsString('déjà le diaporama', $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId()] + $this->demo())['text']);
        $updated = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id, 'titre' => 'Écrire une bonne consigne']);
        self::assertFalse($updated['error'], $updated['text']);
        self::assertNull($updated['data']['relecture']);
        self::assertSame(Diaporama::STATUS_PUBLISHED, $updated['data']['statut']);
        self::assertSame('Écrire une bonne consigne', $this->publicDiaporamas()[0]['titre']);
    }

    public function testCopiedOrInvalidDiaporamaIsRefusedWithoutBeingSaved(): void
    {
        $demo = $this->demo();
        $demo['diapositives'][2]['points'] = ['Répond toujours à la question exacte que la personne lui a posée', 'Le contexte compte'];
        $copied = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId()] + $demo);
        self::assertTrue($copied['error']);
        self::assertStringContainsString('DIAPO_COPIE', $copied['text']);

        $demo = $this->demo();
        $demo['diapositives'][3]['notes'] = str_pad('Appelez le 06 12 34 56 78.', 320, ' Notes.');
        self::assertStringContainsString('TELEPHONE', $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId()] + $demo)['text']);

        self::assertSame(0, $this->entityManager->getRepository(Diaporama::class)->count([]));
    }

    public function testChapterWaitsForAllItsCourses(): void
    {
        $chapitre = (new Menus())->setLabel('Chapitre 1')->setCategory($this->parcours);
        $this->entityManager->persist($chapitre);
        $chapitre->addPageContent($this->entityManager->find(PageContent::class, $this->cours->getId()));
        $chapitre->addPageContent($this->course('cours-en-cours', PageContent::STATUS_DRAFT));
        $this->entityManager->flush();

        $source = $this->tool(self::CLAUDE, 'preparer_diaporama', ['moduleId' => $chapitre->getId()]);
        self::assertSame(['cours-en-cours'], $source['data']['coursNonPublies']);

        $refused = $this->tool(self::CLAUDE, 'creer_diaporama', ['moduleId' => $chapitre->getId()] + $this->demo());
        self::assertTrue($refused['error']);
        self::assertStringContainsString('DIAPO_CHAPITRE_INCOMPLET', $refused['text']);
    }

    public function testSceneCatalogueAndThemesAreExposedToTheAgent(): void
    {
        $tools = array_column($this->rpc(self::CLAUDE, 'tools/list')['result']['tools'], null, 'name');
        $schema = $tools['creer_diaporama']['inputSchema'];
        self::assertSame(['standard', 'atelier_visuel'], $schema['properties']['theme']['enum']);
        self::assertArrayHasKey('parcoursId', $schema['properties']);
        self::assertArrayHasKey('parcoursId', $tools['preparer_diaporama']['inputSchema']['properties']);
        self::assertSame(26, $schema['properties']['diapositives']['maxItems']);
        $scene = $schema['properties']['diapositives']['items']['properties']['scene'];
        self::assertSame(['escalier', 'chaine_traitement', 'aiguillage', 'entonnoir', 'loupe', 'sas_validation'], $scene['properties']['type']['enum']);
        self::assertSame(['type', 'version', 'description'], $scene['required']);
        self::assertTrue($tools['lister_scenes']['annotations']['readOnlyHint']);

        $scenes = $this->tool(self::CHATGPT, 'lister_scenes', []);
        self::assertFalse($scenes['error'], $scenes['text']);
        self::assertCount(6, $scenes['data']['scenes']);
        self::assertSame(['notion', 'etapes', 'exercice'], $scenes['data']['modelesAutorises']);
        self::assertNotEmpty($scenes['data']['scenes'][0]['peutInduireEnErreur']);

        $catalogue = $this->rpc(self::CLAUDE, 'resources/read', ['uri' => 'scenes:///catalogue.json']);
        self::assertStringContainsString('"sas_validation"', $catalogue['result']['contents'][0]['text']);

        $writing = $this->rpc(self::CLAUDE, 'prompts/get', ['name' => 'rediger_diaporama', 'arguments' => ['cible' => 'parcours', 'id' => '9']]);
        $text = $writing['result']['messages'][0]['content']['text'];
        self::assertStringContainsString('preparer_diaporama avec parcoursId 9', $text);
        self::assertStringContainsString('12 à 26 diapositives', $text);
        self::assertStringContainsString('niveau de stock', $text);
        self::assertStringContainsString('DIA-07', $this->rpc(self::CHATGPT, 'prompts/get', ['name' => 'relire_diaporama', 'arguments' => ['id' => '7']])['result']['messages'][0]['content']['text']);
    }

    public function testDiaporamaWithASceneIsSavedAndAnInvalidSceneIsRefused(): void
    {
        $demo = $this->demo();
        $demo['diapositives'][2]['scene'] = $this->exemple('aiguillage');
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId(), 'theme' => 'atelier_visuel', 'objectif' => 'Écrire une consigne claire'] + $demo);
        self::assertFalse($created['error'], $created['text']);
        self::assertSame('atelier_visuel', $created['data']['theme']);
        self::assertSame(1, $created['data']['nombreDeScenes']);
        self::assertSame('/spa/diaporamas/apercu/'.$created['data']['id'], $created['data']['apercuUrl']);
        self::assertSame(Diaporama::STATUS_DRAFT, $created['data']['statut']);

        $invalides = [
            'DIAPO_SCENE_CHAMP' => ['condition' => '<script>alert(1)</script>'] + $this->exemple('aiguillage'),
            'DIAPO_SCENE_REFERENCE' => ['brancheSuivie' => 'ailleurs'] + $this->exemple('aiguillage'),
        ];
        foreach ($invalides as $code => $scene) {
            $demo = $this->demo();
            $demo['diapositives'][2]['scene'] = $scene;
            $refused = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $created['data']['id'], 'diapositives' => $demo['diapositives']]);
            self::assertTrue($refused['error'], $code);
            self::assertStringContainsString($code, $refused['text']);
        }
        $champInconnu = $this->demo();
        $champInconnu['diapositives'][2]['scene'] = $this->exemple('loupe') + ['couleur' => 'rouge'];
        self::assertStringContainsString('DIAPO_SCENE_CHAMP', $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $created['data']['id'], 'diapositives' => $champInconnu['diapositives']])['text']);
        // Un thème hors liste est refusé dès le schéma de l'outil (et par DIAPO_THEME_INCONNU côté serveur)
        $theme = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $created['data']['id'], 'theme' => 'sombre']);
        self::assertTrue($theme['error']);
        self::assertStringContainsString('theme', $theme['text']);

        // Le diaporama enregistré n'a pas changé
        $saved = $this->tool(self::CLAUDE, 'voir_diaporama', ['id' => $created['data']['id']]);
        self::assertSame($this->exemple('aiguillage'), $saved['data']['diapositives'][2]['scene']);
        self::assertSame('atelier_visuel', $saved['data']['theme']);
    }

    public function testPathDiaporamaUsesOnlyPublishedCoursesAndFollowsAccessRules(): void
    {
        $this->course('module-a-venir', PageContent::STATUS_DRAFT)->setCode('<p>Texte encore privé du brouillon.</p>');
        $this->entityManager->flush();

        $source = $this->tool(self::CLAUDE, 'preparer_diaporama', ['parcoursId' => $this->parcours->getId()]);
        self::assertFalse($source['error'], $source['text']);
        self::assertSame(['type' => 'parcours', 'id' => $this->parcours->getId(), 'titre' => 'consignes'], $source['data']['cible']);
        self::assertSame([12, 26], $source['data']['diapositivesAttendues']);
        self::assertSame(1, $source['data']['couverture']['exploites']);
        self::assertSame(2, $source['data']['couverture']['total']);
        self::assertCount(1, $source['data']['cours']);
        self::assertStringNotContainsString('encore privé', json_encode($source['data']['cours'], \JSON_THROW_ON_ERROR));

        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['parcoursId' => $this->parcours->getId(), 'theme' => 'atelier_visuel'] + $this->longDemo());
        self::assertFalse($created['error'], $created['text']);
        $id = $created['data']['id'];
        self::assertContains('DIAPO_COUVERTURE_PARTIELLE', array_column($created['data']['controles'], 'code'));
        self::assertSame(['exploites' => 1, 'total' => 2], $created['data']['couverture']);
        self::assertSame([], $this->publicPathDiaporamas());

        // Brouillon : visible seulement dans l'aperçu administrateur
        $this->client->request('GET', '/api/apercu-diaporamas/'.$id);
        self::assertResponseStatusCodeSame(401);
        $admin = (new User())->setUsername('editeur')->setRoles(['ROLE_ADMIN'])->setPassword('inutilise');
        $apprenant = (new User())->setUsername('apprenant')->setPassword('inutilise');
        $this->entityManager->persist($admin);
        $this->entityManager->persist($apprenant);
        $this->entityManager->flush();
        $this->client->loginUser($apprenant, 'main');
        $this->client->request('GET', '/api/apercu-diaporamas/'.$id);
        self::assertResponseStatusCodeSame(403);
        $this->client->loginUser($admin, 'main');
        $this->client->request('GET', '/api/apercu-diaporamas/'.$id);
        self::assertResponseIsSuccessful();
        $apercu = json_decode((string) $this->client->getResponse()->getContent(), true);
        self::assertSame('brouillon', $apercu['statut']);
        self::assertSame($this->parcours->getId(), $apercu['parcours']);
        self::assertSame('atelier_visuel', $apercu['theme']);
        self::assertContains('RELECTURE_MANQUANTE', array_column($apercu['controles'], 'code'));
        self::assertStringContainsString('no-store', (string) $this->client->getResponse()->headers->get('Cache-Control'));
        $this->client->request('GET', '/logout');

        $this->tool(self::CHATGPT, 'enregistrer_relecture_diaporama', $this->review($id, 'favorable'));
        $published = $this->tool(self::CLAUDE, 'publier_diaporama', ['id' => $id]);
        self::assertFalse($published['error'], $published['text']);
        self::assertStringEndsWith('/spa/category/consignes', $published['data']['adressePublique']);

        $public = $this->publicPathDiaporamas();
        self::assertCount(1, $public);
        self::assertSame('atelier_visuel', $public[0]['theme']);
        self::assertSame(['exploites' => 1, 'total' => 2], $public[0]['couverture']);

        // Un parcours réservé garde son diaporama pour ses seuls destinataires
        $parcours = $this->entityManager->find(Category::class, $this->parcours->getId());
        $parcours?->setReserve(true);
        $this->entityManager->flush();
        self::assertSame([], $this->publicPathDiaporamas());
    }

    /**
     * @return array<string, mixed>
     */
    private function exemple(string $type): array
    {
        $catalogue = json_decode((string) file_get_contents(__DIR__.'/../../../regles/scenes/catalogue.json'), true, flags: \JSON_THROW_ON_ERROR);

        return array_values(array_filter($catalogue['scenes'], static fn (array $s) => $s['id'] === $type))[0]['exemple'];
    }

    /**
     * Diaporama de parcours : 14 diapositives tirées de la démonstration.
     *
     * @return array{titre: string, sousTitre: string, diapositives: list<array<string, mixed>>}
     */
    private function longDemo(): array
    {
        $demo = $this->demo();
        $d = $demo['diapositives'];
        $demo['diapositives'] = [...\array_slice($d, 0, -1), ...\array_slice($d, 1, 4), end($d)];

        return $demo;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function publicPathDiaporamas(): array
    {
        $this->client->request('GET', '/api/diaporamas', ['parcours' => $this->parcours->getId()], [], ['HTTP_ACCEPT' => 'application/ld+json']);
        self::assertResponseIsSuccessful();

        return json_decode((string) $this->client->getResponse()->getContent(), true)['member'];
    }

    private function course(string $slug, string $status = PageContent::STATUS_PUBLISHED): PageContent
    {
        $page = (new Page())->setSlug('/'.$slug);
        $course = (new PageContent())->setTitle($slug)->setStatus($status)->setPage($page)->setCategory($this->parcours)->setCode(self::COURS);
        $this->entityManager->persist($page);
        $this->entityManager->persist($course);

        return $course;
    }

    /**
     * Diaporama de démonstration du front, sans sa capture (aucune capture dans ce test).
     *
     * @return array{titre: string, sousTitre: string, diapositives: list<array<string, mixed>>}
     */
    private function demo(): array
    {
        $demo = json_decode((string) file_get_contents(self::DEMO), true, flags: \JSON_THROW_ON_ERROR);
        $demo['diapositives'][5] = ['modele' => 'notion', 'points' => ['La consigne est précise', 'La réponse suit le format']] + $demo['diapositives'][5];
        unset($demo['diapositives'][5]['capture'], $demo['audience']);

        return $demo;
    }

    /**
     * @return array<string, mixed>
     */
    private function review(int $id, string $opinion): array
    {
        return ['id' => $id, 'avis' => $opinion, 'resume' => 'Relecture du diaporama.', 'points' => $opinion === 'favorable' ? [] : [['regle' => 'DIA-03', 'constat' => 'Les notes de la diapositive 4 sont trop vagues.']]];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function publicDiaporamas(): array
    {
        $this->client->request('GET', '/api/diaporamas', ['cours' => $this->cours->getId()], [], ['HTTP_ACCEPT' => 'application/ld+json']);
        self::assertResponseIsSuccessful();

        return json_decode((string) $this->client->getResponse()->getContent(), true)['member'];
    }
}
