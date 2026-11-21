<?php

declare(strict_types=1);

namespace App\Tests\Functional\Mcp;

use App\Entity\Category;
use App\Entity\CourseMedia;
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

    public function testBriefIsProposedCorrectedAndKeptForTheReviewer(): void
    {
        $source = $this->tool(self::CLAUDE, 'preparer_diaporama', ['coursId' => $this->cours->getId()]);
        $brief = $source['data']['briefPropose'];
        self::assertSame('propose', $brief['statut']);
        self::assertSame('apprendre', $brief['public']);
        self::assertSame('illustree', $brief['intention']);
        self::assertContains('dureeMinutes', array_column($brief['deductions'], 'champ'));
        self::assertArrayHasKey('demonstration', $source['data']['modeles']);
        self::assertStringContainsString('aucune animation PowerPoint native', $source['data']['modeles']['demonstration']['rendus']['pptx']);
        self::assertStringContainsString('Un mot du titre ne suffit pas', $source['data']['guideScenes']['regle']);

        // La personne corrige la durée et le contexte, puis confirme
        $corrige = ['dureeMinutes' => 30, 'contexte' => 'Équipe d\'accueil fictive', 'statut' => 'confirme'] + array_diff_key($brief, ['intentionsPossibles' => 1, 'themesPossibles' => 1]);
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId(), 'brief' => $corrige] + $this->demo());
        self::assertFalse($created['error'], $created['text']);
        self::assertSame(30, $created['data']['brief']['dureeMinutes']);
        self::assertSame('atelier_visuel', $created['data']['theme'], 'Le thème du brief devient celui du diaporama');
        self::assertNotContains('DIAPO_BRIEF_MANQUANT', array_column($created['data']['controles'], 'code'));
        self::assertContains('DIAPO_SCENARIO_MANQUANT', array_column($created['data']['controles'], 'code'));

        // Le relecteur (autre connecteur) lit le même brief ; une modification le garde
        $id = $created['data']['id'];
        self::assertSame('Équipe d\'accueil fictive', $this->tool(self::CHATGPT, 'voir_diaporama', ['id' => $id])['data']['brief']['contexte']);
        $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id, 'titre' => 'Une consigne claire']);
        self::assertSame(30, $this->tool(self::CHATGPT, 'voir_diaporama', ['id' => $id])['data']['brief']['dureeMinutes']);

        $invalide = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id, 'brief' => ['public' => 'tous', 'dureeMinutes' => 2, 'objectif' => 'x', 'intention' => 'spectacle']]);
        self::assertTrue($invalide['error']);
        self::assertStringContainsString('brief', $invalide['text']);
    }

    public function testScenarioIsCheckedThenReadByTheReviewer(): void
    {
        $brouillon = $this->course('cours-non-publie', PageContent::STATUS_DRAFT);
        $this->entityManager->flush();
        $scenario = $this->scenario([(int) $this->cours->getId()]);

        $verifie = $this->tool(self::CLAUDE, 'verifier_scenario_diaporama', ['coursId' => $this->cours->getId(), 'scenario' => $scenario, 'brief' => $this->brief()]);
        self::assertFalse($verifie['error'], $verifie['text']);
        self::assertTrue($verifie['data']['valide']);
        self::assertSame(1, $verifie['data']['couverture']['coursCites']);
        self::assertSame(0, $this->entityManager->getRepository(Diaporama::class)->count([]), 'La vérification n\'enregistre rien');

        // Une source hors cible ou non publiée bloque ; un visuel inventé aussi
        $mauvais = $this->scenario([(int) $brouillon->getId()]);
        $mauvais['parties'][1]['visuels'] = [['captureId' => 9999, 'raison' => 'Capture qui n\'existe pas']];
        $refuse = $this->tool(self::CLAUDE, 'verifier_scenario_diaporama', ['coursId' => $this->cours->getId(), 'scenario' => $mauvais]);
        self::assertFalse($refuse['data']['valide']);
        self::assertSame(['DIAPO_SCENARIO_SOURCE', 'DIAPO_SCENARIO_VISUEL'], array_values(array_unique(array_intersect(array_column($refuse['data']['controles'], 'code'), ['DIAPO_SCENARIO_SOURCE', 'DIAPO_SCENARIO_VISUEL']))));
        $sceneInconnue = $this->scenario([(int) $this->cours->getId()]);
        $sceneInconnue['parties'][0]['scene'] = ['type' => 'feu_artifice', 'notion' => 'n', 'justification' => 'j'];
        self::assertStringContainsString('scene/type', $this->tool(self::CLAUDE, 'verifier_scenario_diaporama', ['coursId' => $this->cours->getId(), 'scenario' => $sceneInconnue])['text']);

        // Création avec le scénario validé : chaque diapositive est reliée à sa partie
        $demo = $this->demo();
        foreach ($demo['diapositives'] as $i => $diapo) {
            $demo['diapositives'][$i]['scenarioPartie'] = $i < 5 ? 'comprendre' : 'pratiquer';
        }
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId(), 'brief' => $this->brief(), 'scenario' => $scenario] + $demo);
        self::assertFalse($created['error'], $created['text']);
        $codes = array_column($created['data']['controles'], 'code');
        self::assertNotContains('DIAPO_SCENARIO_MANQUANT', $codes);
        self::assertNotContains('DIAPO_SCENARIO_PARTIE_VIDE', $codes);

        $relu = $this->tool(self::CHATGPT, 'voir_diaporama', ['id' => $created['data']['id']]);
        self::assertSame('Une semaine fictive du service accueil', $relu['data']['scenario']['filRouge']);
        self::assertSame(['comprendre', 'pratiquer'], array_column($relu['data']['scenario']['parties'], 'id'));
        $verif = $this->tool(self::CHATGPT, 'verifier_diaporama', ['id' => $created['data']['id']]);
        self::assertSame('absent', $verif['data']['controlesNavigateur']['etat']);
        self::assertNotEmpty($verif['data']['aRelire']);

        // Une partie inconnue est refusée sans rien changer
        $demo['diapositives'][2]['scenarioPartie'] = 'inexistante';
        $refuse = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $created['data']['id'], 'diapositives' => $demo['diapositives']]);
        self::assertStringContainsString('DIAPO_SCENARIO_PARTIE_INCONNUE', $refuse['text']);
    }

    public function testVisualsComeOnlyFromTheBackOfficeWithTheirMetadata(): void
    {
        $simulee = (new CourseMedia())->setKind(CourseMedia::KIND_CAPTURE)->setCaption('Simulation fictive en trois écrans.')->setAltText('Trois écrans simulés')->setService('Outil');
        $illustration = (new CourseMedia())->setKind(CourseMedia::KIND_ILLUSTRATION)->setCaption('Schéma des rôles')->setAltText('Quatre rôles');
        $this->entityManager->persist($simulee);
        $this->entityManager->persist($illustration);
        $this->entityManager->flush();
        $this->cours->setCode(self::COURS.'<p>Avant la capture.</p><p>[capture:'.$simulee->getId().']</p><p>Après la capture. [capture:'.$illustration->getId().']</p>');
        $this->entityManager->flush();

        $visuels = array_column($this->tool(self::CLAUDE, 'preparer_diaporama', ['coursId' => $this->cours->getId()])['data']['visuels'], null, 'id');
        self::assertCount(2, $visuels);
        $v = $visuels[$simulee->getId()];
        self::assertSame('capture', $v['type']);
        self::assertTrue($v['interfaceSimulee']);
        self::assertNull($v['dateCapture'], 'Une date absente reste absente');
        self::assertSame($this->cours->getId(), $v['usages'][0]['coursId']);
        self::assertStringContainsString('Avant la capture. [visuel] Après la capture.', $v['usages'][0]['passage']);
        self::assertNull($visuels[$illustration->getId()]['interfaceSimulee']);

        $fiche = $this->tool(self::CLAUDE, 'voir_visuel', ['id' => $simulee->getId()]);
        self::assertFalse($fiche['error'], $fiche['text']);
        self::assertSame('Trois écrans simulés', $fiche['data']['texteAlternatif']);
        self::assertSame('Fichier image absent sur le serveur.', $fiche['data']['apercuIndisponible']);
        self::assertTrue($this->tool(self::CLAUDE, 'voir_visuel', ['id' => 99999])['error']);

        // « Aucun visuel adapté » est permis : une présentation illustrée sans capture n'est qu'un avertissement
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId(), 'brief' => $this->brief()] + $this->demo());
        self::assertFalse($created['error'], $created['text']);
        self::assertContains('DIAPO_SANS_VISUEL', array_column($created['data']['controles'], 'code'));
    }

    public function testCompositionsAreCheckedAndInspectedSlideBySlide(): void
    {
        $demo = $this->demo();
        $demo['diapositives'][3] = ['modele' => 'avant_apres', 'titre' => 'Une consigne précisée', 'avant' => ['texte' => 'Écris un mail.'], 'apres' => ['texte' => 'Rédige un mail court pour annoncer un atelier fictif.'], 'explication' => 'On précise le but et le format.', 'notes' => $demo['diapositives'][3]['notes']];
        $demo['diapositives'][4] = ['modele' => 'demonstration', 'titre' => 'Essayer dans l\'outil', 'etapes' => [['action' => 'Saisir la consigne', 'verification' => 'Rien de personnel'], ['action' => 'Lire la réponse']], 'notes' => $demo['diapositives'][4]['notes']];
        $created = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId()] + $demo);
        self::assertFalse($created['error'], $created['text']);
        $id = $created['data']['id'];

        $diapo = $this->tool(self::CHATGPT, 'voir_diaporama', ['id' => $id, 'diapositive' => 5]);
        self::assertSame('demonstration', $diapo['data']['diapositive']['modele']);
        self::assertStringContainsString('une diapositive fixe par étape', $diapo['data']['rendusPrevus']['pptx']);
        self::assertStringEndsWith('?diapositive=5', $diapo['data']['apercuUrl']);
        self::assertTrue($this->tool(self::CHATGPT, 'voir_diaporama', ['id' => $id, 'diapositive' => 40])['error']);

        // Texte trop long pour la mise en page, modèle inconnu : refusés sans rien changer
        // Avec une capture, l'exemple d'un exemple commenté a moins de place (100 caractères) que ce que permet le schéma
        $capture = (new CourseMedia())->setKind(CourseMedia::KIND_CAPTURE)->setCaption('Capture fictive')->setAltText('Capture fictive');
        $this->entityManager->persist($capture);
        $this->entityManager->flush();
        $trop = $demo;
        $trop['diapositives'][3] = ['modele' => 'exemple_commente', 'titre' => 'Un exemple', 'exemple' => str_repeat('Exemple trop long ', 8), 'capture' => $capture->getId(), 'commentaires' => ['Un commentaire'], 'notes' => $demo['diapositives'][3]['notes']];
        self::assertStringContainsString('DIAPO_MODELE_CHAMP_LONG', $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id] + $trop)['text']);
        $inconnu = $demo;
        $inconnu['diapositives'][3]['modele'] = 'carrousel';
        $refus = $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id] + $inconnu);
        self::assertTrue($refus['error']);
        self::assertSame('avant_apres', $this->tool(self::CLAUDE, 'voir_diaporama', ['id' => $id])['data']['diapositives'][3]['modele']);
    }

    public function testRenderReportFromThePreviewReachesTheConnector(): void
    {
        $id = $this->tool(self::CLAUDE, 'creer_diaporama', ['coursId' => $this->cours->getId(), 'theme' => 'atelier_visuel'] + $this->demo())['data']['id'];
        $rapport = ['formats' => ['large', 'etroit'], 'navigateur' => 'Chrome/140', 'problemes' => [
            ['diapositive' => 3, 'etape' => 1, 'format' => 'etroit', 'element' => ['role' => 'corps', 'extrait' => '<b>Point</b> long'], 'probleme' => 'debordement', 'mesure' => ['depassementPx' => 12.34, 'zone' => ['x' => 5, 'y' => 40, 'w' => 90, 'h' => 12]]],
            ['probleme' => 'inconnu'],
        ]];

        // Sans compte administrateur, ou sans jeton, le rapport est refusé
        $this->client->request('POST', '/api/apercu-diaporamas/'.$id.'/controle-rendu', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($rapport, \JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(401);
        $admin = (new User())->setUsername('editeur')->setRoles(['ROLE_ADMIN'])->setPassword('inutilise');
        $this->entityManager->persist($admin);
        $this->entityManager->flush();
        $this->client->loginUser($admin, 'main');
        $this->client->request('POST', '/api/apercu-diaporamas/'.$id.'/controle-rendu', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($rapport, \JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(403);

        $this->client->request('GET', '/api/apercu-diaporamas/'.$id);
        $jeton = json_decode((string) $this->client->getResponse()->getContent(), true)['jetonControleRendu'];
        $this->client->request('POST', '/api/apercu-diaporamas/'.$id.'/controle-rendu', [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_CSRF_TOKEN' => $jeton], json_encode($rapport, \JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
        self::assertStringContainsString('no-store', (string) $this->client->getResponse()->headers->get('Cache-Control'));
        $this->client->request('GET', '/logout');

        $verif = $this->tool(self::CLAUDE, 'verifier_diaporama', ['id' => $id]);
        $rendu = $verif['data']['controlesNavigateur'];
        self::assertSame('a_jour', $rendu['etat']);
        self::assertCount(1, $rendu['problemes'], 'Un problème inconnu est écarté');
        self::assertSame(['role' => 'corps', 'extrait' => 'Point long'], $rendu['problemes'][0]['element']);
        self::assertSame(12.3, $rendu['problemes'][0]['mesure']['depassementPx']);
        self::assertContains('DIAPO_RENDU_PROBLEME', array_column($verif['data']['controles'], 'code'));
        self::assertCount(1, $this->tool(self::CLAUDE, 'voir_diaporama', ['id' => $id, 'diapositive' => 3])['data']['controleRendu']['problemes']);

        // Après correction, le rapport est périmé jusqu'à une nouvelle mesure ; la relecture n'est pas en cause
        $this->tool(self::CLAUDE, 'modifier_diaporama', ['id' => $id, 'titre' => 'Version corrigée']);
        self::assertSame('perime', $this->tool(self::CLAUDE, 'verifier_diaporama', ['id' => $id])['data']['controlesNavigateur']['etat']);

        // Le brouillon, son brief et son rapport restent hors de l'API publique
        $this->client->request('GET', '/api/diaporamas/'.$id, [], [], ['HTTP_ACCEPT' => 'application/ld+json']);
        self::assertResponseStatusCodeSame(404);
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

    /**
     * @return array<string, mixed>
     */
    private function brief(): array
    {
        return ['public' => 'apprendre', 'dureeMinutes' => 30, 'objectif' => 'Écrire une consigne claire et vérifier la réponse.', 'contexte' => 'Service accueil fictif', 'theme' => 'atelier_visuel', 'intention' => 'illustree', 'statut' => 'confirme'];
    }

    /**
     * @param list<int> $sources
     * @return array<string, mixed>
     */
    private function scenario(array $sources): array
    {
        return [
            'objectifGeneral' => 'Passer d\'une consigne vague à une consigne claire.',
            'filRouge' => 'Une semaine fictive du service accueil',
            'parties' => [
                ['id' => 'comprendre', 'titre' => 'Comprendre', 'intention' => 'Voir ce qui rend une consigne claire.', 'dureeMinutes' => 15, 'coursSources' => $sources, 'verifications' => ['Question au groupe']],
                ['id' => 'pratiquer', 'titre' => 'Pratiquer', 'intention' => 'Réécrire une consigne.', 'dureeMinutes' => 15, 'coursSources' => $sources, 'activite' => ['consigne' => 'Réécrire une consigne fictive', 'dureeMinutes' => 10]],
            ],
        ];
    }
}
