<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Domain\CourseMedia\Repository\CourseMediaRepositoryInterface;
use App\Entity\Category;
use App\Entity\Diaporama;
use App\Entity\Menus;
use App\Entity\PageContent;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Diaporamas préparés par l'assistant de rédaction (docs/PLAN_DIAPORAMAS.md) : même circuit que les QCM.
 * L'agent rédige une synthèse structurée, un autre connecteur la relit, puis elle est publiée.
 * Un diaporama publié reste modifiable : la modification efface la relecture et se voit tout de suite.
 *
 * `$agent` est l'identité du connecteur, enregistrée comme auteur ou relecteur.
 */
final class DiaporamaService
{
    // Garde-fou de forme ; le nombre attendu par cible est dans DiaporamaChecker::NOMBRE (parcours : 26 au plus)
    private const MAX_SLIDES = 30;
    private const MAX_NOTES_LENGTH = 2000;
    private const MAX_TEXT_LENGTH = 300;
    public const A_RELIRE = [
        'Lisibilité de loin : une idée par diapositive, texte projeté court, captures lisibles.',
        'Variété des compositions et rythme (alternance explication, démonstration, pratique).',
        'Fidélité aux sources : rien d\'affirmé qui ne soit dans les cours exploités ; couverture annoncée.',
        'Pertinence pédagogique : le scénario suit le brief, les scènes servent une notion, les visuels sont justifiés et signalés comme simulés si besoin.',
    ];

    public function __construct(
        private EntityManagerInterface $entityManager,
        private DiaporamaChecker $checker,
        private CourseMediaRepositoryInterface $captures,
        private DiaporamaSource $source = new DiaporamaSource(),
        private ?SceneCatalogue $scenes = null,
        private ?DiaporamaVisuels $visuels = null,
    ) {
        $this->scenes ??= new SceneCatalogue(\dirname(__DIR__, 3).'/regles/scenes/catalogue.json');
        $this->visuels ??= new DiaporamaVisuels($captures);
    }

    /**
     * Thèmes et scènes que l'agent peut choisir (par identifiant) : le site garde seul le design.
     *
     * @return array<string, mixed>
     */
    public function scenes(): array
    {
        \assert($this->scenes !== null);

        return [
            'version' => $this->scenes->version(),
            'themes' => Diaporama::THEMES,
            'modelesAutorises' => $this->scenes->modelesAutorises(),
            'limitesDiapositive' => $this->scenes->limitesDiapositive(),
            'champsCommuns' => $this->scenes->champsCommuns(),
            'scenes' => $this->scenes->resume(),
        ];
    }

    /**
     * Ce que l'agent doit lire avant d'écrire : le texte du cours, des cours du chapitre ou des cours publiés
     * du parcours, le public, la couverture, les captures déjà utilisées, les thèmes et scènes possibles
     * et le diaporama existant éventuel.
     *
     * @return array<string, mixed>
     */
    public function source(?int $coursId, ?int $moduleId, ?int $parcoursId = null): array
    {
        $diaporama = (new Diaporama('lecture'))->setCible(...$this->target($coursId, $moduleId, $parcoursId));
        $cours = $this->source->coursExploites($diaporama);
        $existant = $this->existing($diaporama);
        $inventaire = $this->source->inventaire($diaporama);
        preg_match_all('/\[capture:(\d+)\]/', implode(' ', array_map(static fn (PageContent $c) => (string) ($c->getCode() ?: $c->getContent()), $cours)), $markers);

        return [
            'cible' => $this->targetSummary($diaporama),
            'public' => $this->audience($diaporama),
            'diapositivesAttendues' => DiaporamaChecker::NOMBRE[(string) $diaporama->getTypeCible()],
            'briefPropose' => DiaporamaBrief::proposer($diaporama, $cours, DiaporamaChecker::NOMBRE[(string) $diaporama->getTypeCible()], (string) $this->targetSummary($diaporama)['titre']),
            'demarche' => 'Présentez le brief proposé à la personne et faites-le corriger ; proposez ensuite un scénario (verifier_scenario_diaporama) et faites-le valider avant de créer le diaporama (DIA-11).',
            'modeles' => $this->checker->modeles()->resume(),
            'themes' => Diaporama::THEMES,
            'scenes' => array_map(static fn (array $s) => ['type' => $s['type'], 'usage' => $s['usage'], 'peutInduireEnErreur' => $s['peutInduireEnErreur']], $this->scenes()['scenes']),
            'guideScenes' => $this->guideScenes(),
            'couverture' => [
                'exploites' => \count($cours),
                'total' => \count($inventaire),
                'inventaire' => $inventaire,
                'consigne' => \count($cours) < \count($inventaire)
                    ? sprintf('Seuls %d cours sur %d sont publiés : la synthèse s\'appuie sur eux seuls et annonce cette couverture (DIA-10).', \count($cours), \count($inventaire))
                    : 'Tous les cours de la cible sont exploités.',
            ],
            'cours' => array_map(static fn (PageContent $c) => [
                'id' => $c->getId(),
                'titre' => $c->getTitle(),
                'module' => $c->getMenu()?->getLabel(),
                'publie' => $c->isPublished(),
                'texte' => DiaporamaSource::texteDuCours($c),
            ], $cours),
            'captures' => array_values(array_filter(array_map(function (int $id) {
                $capture = $this->captures->findById($id);

                return $capture === null ? null : ['id' => $id, 'legende' => $capture->getCaption(), 'texteAlternatif' => $capture->getAltText()];
            }, array_values(array_unique(array_map('intval', $markers[1])))))),
            // DIA-12 : fiche complète de chaque visuel des cours exploités ; aucun visuel n'est inventé
            'visuels' => $this->visuels()->inventaire($cours),
            'consigneVisuels' => 'Proposez les visuels qui servent une partie du scénario et dites en une phrase pourquoi (voir_visuel pour les examiner). Signalez une interface simulée. Si aucun ne convient, dites-le : n\'inventez ni capture ni métadonnée.',
            'coursNonPublies' => $this->source->coursNonPublies($diaporama),
            'diaporamaExistant' => $existant === null ? null : $this->summary($existant),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(): array
    {
        $diaporamas = $this->entityManager->getRepository(Diaporama::class)->findBy([], ['id' => 'DESC'], 200);

        return array_map(fn (Diaporama $d) => $this->summary($d), $diaporamas);
    }

    /**
     * @return array<string, mixed>
     */
    public function show(int $id, ?int $numeroDiapositive = null): array
    {
        $diaporama = $this->diaporama($id);
        if ($numeroDiapositive === null) {
            return $this->detail($diaporama);
        }

        return $this->slideDetail($diaporama, $numeroDiapositive);
    }

    /**
     * Inspection d'une diapositive : contenu, partie du scénario, rendus prévus et problèmes de rendu mesurés.
     *
     * @return array<string, mixed>
     */
    private function slideDetail(Diaporama $diaporama, int $numero): array
    {
        $diapositives = $diaporama->getDiapositives();
        if ($numero < 1 || $numero > \count($diapositives)) {
            throw new RedactionError(sprintf('Diapositive %d introuvable : le diaporama en compte %d.', $numero, \count($diapositives)), RedactionError::NOT_FOUND);
        }
        $diapo = $diapositives[$numero - 1];
        $partieId = \is_array($diapo) ? ($diapo['scenarioPartie'] ?? null) : null;
        $partie = null;
        foreach ($diaporama->getScenario()['parties'] ?? [] as $p) {
            if ($p['id'] === $partieId) {
                $partie = $p;
            }
        }
        $rendu = DiaporamaChecker::etatRendu($diaporama);
        $modele = \is_array($diapo) && \is_string($diapo['modele'] ?? null) ? $diapo['modele'] : null;

        return [
            'diaporamaId' => $diaporama->getId(),
            'numero' => $numero,
            'nombreDeDiapositives' => \count($diapositives),
            'diapositive' => $diapo,
            'partieDuScenario' => $partie,
            'rendusPrevus' => $modele !== null && $this->checker->modeles()->modele($modele) !== null ? $this->checker->modeles()->rendus($modele) : null,
            'controleRendu' => ['etat' => $rendu['etat'], 'le' => $rendu['le'], 'problemes' => array_values(array_filter($rendu['problemes'], static fn (array $p) => ($p['diapositive'] ?? null) === $numero))],
            'controles' => array_values(array_filter($this->checker->check($diaporama), static fn (array $c) => str_starts_with($c['message'], sprintf('Diapositive %d ', $numero)) || str_starts_with($c['message'], sprintf('Diapositive %d :', $numero)))),
            'apercuUrl' => '/spa/diaporamas/apercu/'.$diaporama->getId().'?diapositive='.$numero,
        ];
    }

    /**
     * Vérifie un brief et un scénario avant la création du brouillon (rien n'est enregistré) : forme, sources, visuels,
     * couverture réelle et durée. L'agent présente le résultat à la personne, qui corrige le scénario.
     *
     * @param array<string, mixed> $data coursId | moduleId | parcoursId, brief, scenario
     * @return array<string, mixed>
     */
    public function checkScenario(array $data): array
    {
        $diaporama = (new Diaporama('lecture'))->setCible(...$this->target(
            isset($data['coursId']) ? (int) $data['coursId'] : null,
            isset($data['moduleId']) ? (int) $data['moduleId'] : null,
            isset($data['parcoursId']) ? (int) $data['parcoursId'] : null,
        ));
        [$brief, $erreursBrief] = DiaporamaBrief::normaliser($data['brief'] ?? null);
        [$scenario, $erreursScenario] = DiaporamaScenario::normaliser($data['scenario'] ?? null, $this->sceneCatalogue()->types());
        if ($scenario === null && $erreursScenario === []) {
            $erreursScenario[] = ['champ' => 'scenario', 'message' => 'Scénario attendu.'];
        }
        if ($erreursBrief !== [] || $erreursScenario !== []) {
            throw RedactionError::invalid([...$erreursBrief, ...$erreursScenario]);
        }
        $analyse = DiaporamaScenario::analyser($scenario, $this->source->inventaire($diaporama), fn (int $id) => $this->captures->findById($id) !== null, $brief);

        return [
            'cible' => $this->targetSummary($diaporama),
            'valide' => !DraftChecker::hasBlockingIssue($analyse['controles']),
            'brief' => $brief,
            'scenario' => $scenario,
            'couverture' => $analyse['couverture'],
            'controles' => $analyse['controles'],
            'suite' => 'Présentez le scénario et sa couverture à la personne ; après sa validation, passez brief et scenario à creer_diaporama (ou modifier_diaporama), et reliez chaque diapositive à sa partie (scenarioPartie).',
        ];
    }

    /**
     * Aperçu d'un visuel pour l'agent (image réduite et fiche), sans chemin libre : seulement un visuel du back-office.
     *
     * @return array{fiche: array<string, mixed>, image: ?array{data: string, mimeType: string}, raison: ?string}
     */
    public function visuel(int $id): array
    {
        return $this->visuels()->apercu($id);
    }

    /**
     * Rapport du contrôle de rendu mesuré dans l'aperçu d'un administrateur. Le serveur ne garde que la forme
     * attendue et calcule lui-même l'empreinte du contenu contrôlé ; la relecture n'est pas touchée.
     *
     * @param array<string, mixed> $rapport {formats, navigateur, problemes}
     * @return array<string, mixed> état du rendu enregistré
     */
    public function recordRenderReport(int $id, array $rapport): array
    {
        $diaporama = $this->diaporama($id);
        $problemes = [];
        foreach (\array_slice(\is_array($rapport['problemes'] ?? null) ? array_values($rapport['problemes']) : [], 0, 200) as $p) {
            if (!\is_array($p) || !\in_array($p['probleme'] ?? null, ['debordement', 'sortie', 'recouvrement', 'texte_petit'], true)) {
                continue;
            }
            $zone = \is_array($p['mesure']['zone'] ?? null) ? $p['mesure']['zone'] : [];
            $problemes[] = [
                'diapositive' => max(1, (int) ($p['diapositive'] ?? 1)),
                'etape' => max(1, (int) ($p['etape'] ?? 1)),
                'format' => ($p['format'] ?? null) === 'etroit' ? 'etroit' : 'large',
                'element' => [
                    'role' => mb_substr((string) ($p['element']['role'] ?? ''), 0, 30),
                    'extrait' => mb_substr(strip_tags((string) ($p['element']['extrait'] ?? '')), 0, 60),
                ],
                'probleme' => $p['probleme'],
                'mesure' => [
                    'depassementPx' => round((float) ($p['mesure']['depassementPx'] ?? 0), 1),
                    'zone' => array_map(static fn ($v) => round(max(-50, min(150, (float) $v)), 1), array_intersect_key($zone + ['x' => 0, 'y' => 0, 'w' => 0, 'h' => 0], ['x' => 1, 'y' => 1, 'w' => 1, 'h' => 1])),
                ],
            ];
        }
        $formats = array_values(array_intersect(['large', 'etroit'], \is_array($rapport['formats'] ?? null) ? $rapport['formats'] : []));
        $diaporama->setControleRendu([
            'empreinte' => $diaporama->getEmpreinteRendu(),
            'le' => (new \DateTimeImmutable())->format(\DATE_ATOM),
            'formats' => $formats === [] ? ['large'] : $formats,
            'navigateur' => mb_substr(strip_tags((string) ($rapport['navigateur'] ?? '')), 0, 80) ?: null,
            'problemes' => $problemes,
        ]);
        $this->entityManager->flush();

        return DiaporamaChecker::etatRendu($diaporama);
    }

    /**
     * Enregistre le diaporama s'il ne déclenche aucun contrôle bloquant ; sinon rien n'est enregistré.
     * Une cible n'a qu'un diaporama : pour le changer, modifier_diaporama.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function create(array $data, string $agent): array
    {
        $diaporama = (new Diaporama($agent))->setCible(...$this->target(
            isset($data['coursId']) ? (int) $data['coursId'] : null,
            isset($data['moduleId']) ? (int) $data['moduleId'] : null,
            isset($data['parcoursId']) ? (int) $data['parcoursId'] : null,
        ));
        $existant = $this->existing($diaporama);
        if ($existant !== null) {
            throw new RedactionError(sprintf('Cette cible a déjà le diaporama %d : modifiez-le avec modifier_diaporama.', $existant->getId()), RedactionError::CONFLICT);
        }
        $this->apply($diaporama, $data, true);
        $issues = $this->blockUnlessValid($diaporama);

        $this->entityManager->persist($diaporama);
        $this->entityManager->flush();

        return $this->detail($diaporama) + ['controles' => $issues];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function update(int $id, array $data): array
    {
        $diaporama = $this->diaporama($id);

        try {
            $this->apply($diaporama, $data, false);
            $issues = $this->blockUnlessValid($diaporama);
        } catch (RedactionError $error) {
            // Le diaporama enregistré reste tel quel
            $this->entityManager->refresh($diaporama);
            throw $error;
        }

        // Le contenu a changé : la relecture précédente ne vaut plus
        $diaporama->clearReview()->touch();
        if (!$diaporama->isPublished()) {
            $diaporama->setStatus(Diaporama::STATUS_DRAFT);
        }
        $this->entityManager->flush();

        return $this->detail($diaporama) + ['controles' => $issues];
    }

    /**
     * Correction par le responsable éditorial dans le back-office, avec les mêmes contrôles bloquants que l'agent.
     * Le statut et la relecture sont gardés, l'empreinte aussi : corriger une coquille ne dit pas que le
     * diaporama suit le cours modifié (voir markUpToDate).
     *
     * @param array<string, mixed> $data titre, sousTitre, diapositives
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}> avertissements restants
     */
    public function correct(Diaporama $diaporama, array $data): array
    {
        try {
            $this->apply($diaporama, $data, false, keepFingerprint: true);
            $issues = $this->blockUnlessValid($diaporama);
        } catch (RedactionError $error) {
            $this->entityManager->refresh($diaporama);
            throw $error;
        }
        $diaporama->touch();
        $this->entityManager->flush();

        return $issues;
    }

    /**
     * Retrait de la publication depuis le back-office : il faudra une nouvelle relecture pour republier.
     */
    public function unpublish(Diaporama $diaporama): void
    {
        $diaporama->setStatus(Diaporama::STATUS_DRAFT)->clearReview()->touch();
        $this->entityManager->flush();
    }

    /**
     * Le responsable éditorial a vérifié que le diaporama suit toujours le cours : la mention « à mettre à jour » disparaît.
     */
    public function markUpToDate(Diaporama $diaporama): void
    {
        $diaporama->setEmpreinteSource($this->source->empreinte($diaporama))
            ->setCoursSources($this->source->inventaire($diaporama))
            ->touch();
        $this->entityManager->flush();
    }

    /**
     * Diaporamas dont le cours a changé depuis la synthèse.
     *
     * @return list<Diaporama>
     */
    public function outdated(): array
    {
        return array_values(array_filter(
            $this->entityManager->getRepository(Diaporama::class)->findBy([], ['updatedAt' => 'DESC']),
            $this->source->estPerime(...),
        ));
    }

    /**
     * @return array{sansControleBloquant: bool, publiable: bool, controles: list<array<string, mixed>>, controlesNavigateur: array<string, mixed>, aRelire: list<string>, apercuUrl: ?string}
     */
    public function check(int $id): array
    {
        $diaporama = $this->diaporama($id);
        $issues = $this->checker->check($diaporama);
        $all = [...$issues, ...$this->reviewIssues($diaporama)];

        return [
            'sansControleBloquant' => !DraftChecker::hasBlockingIssue($issues),
            'publiable' => !$diaporama->isPublished() && !DraftChecker::hasBlockingIssue($all),
            'controles' => $all,
            // Contrôles mesurés dans un navigateur (aperçu) : dépendent des polices et du rendu
            'controlesNavigateur' => DiaporamaChecker::etatRendu($diaporama),
            // Ce qu'aucun contrôle automatique ne juge : à vérifier par le relecteur (autre connecteur)
            'aRelire' => self::A_RELIRE,
            'apercuUrl' => $diaporama->getId() === null ? null : '/spa/diaporamas/apercu/'.$diaporama->getId(),
        ];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function review(int $id, array $data, string $agent): array
    {
        $diaporama = $this->diaporama($id);
        if ($diaporama->getAuthor() === $agent) {
            throw new RedactionError("La relecture doit venir d'un autre agent que celui qui a rédigé le diaporama : utilisez l'autre connecteur (par exemple ChatGPT si le diaporama vient de Claude).", RedactionError::CONFLICT);
        }

        [$report, $errors] = ReviewReport::parse($data);
        if ($errors !== []) {
            throw RedactionError::invalid($errors);
        }
        $diaporama->recordReview($report, $agent);
        if (!$diaporama->isPublished()) {
            $diaporama->setStatus($report['avis'] === ReviewReport::FAVORABLE ? Diaporama::STATUS_DRAFT : Diaporama::STATUS_TO_FIX);
        }
        $this->entityManager->flush();

        return $this->detail($diaporama);
    }

    /**
     * Publie le diaporama si aucun contrôle ne bloque et si un autre agent l'a relu avec un avis favorable.
     *
     * @return array<string, mixed>
     */
    public function publish(int $id): array
    {
        $diaporama = $this->diaporama($id);
        if ($diaporama->isPublished()) {
            throw new RedactionError('Ce diaporama est déjà publié : ses modifications sont visibles tout de suite.', RedactionError::CONFLICT);
        }
        $issues = [...$this->checker->check($diaporama), ...$this->reviewIssues($diaporama)];
        if (DraftChecker::hasBlockingIssue($issues)) {
            throw new RedactionError('Des contrôles bloquants empêchent la publication.', RedactionError::BLOCKED, $issues);
        }

        $diaporama->markPublished();
        $this->entityManager->flush();

        return $this->detail($diaporama) + ['controles' => $issues];
    }

    /**
     * Adresse de la page où le diaporama se télécharge, relative à la racine du site.
     */
    public function publicPath(int $id): ?string
    {
        $diaporama = $this->diaporama($id);
        if ($diaporama->getCours() !== null) {
            $slug = $diaporama->getCours()->getPage()?->getSlug();

            return $slug === null ? null : '/spa/pages/'.ltrim($slug, '/');
        }
        $parcours = $diaporama->getParcoursDeLaCible()?->getName();

        return $parcours === null ? null : '/spa/category/'.rawurlencode($parcours);
    }

    /**
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function reviewIssues(Diaporama $diaporama): array
    {
        $review = $diaporama->getReviewReport();
        if ($review === null) {
            return [['code' => 'RELECTURE_MANQUANTE', 'regle' => 'RED-02', 'niveau' => DraftChecker::BLOCKING, 'message' => 'Faites relire le diaporama par un autre agent (relire_diaporama, puis enregistrer_relecture_diaporama) avant la publication.']];
        }

        return match ($review['avis']) {
            ReviewReport::FAVORABLE => [],
            ReviewReport::UNFAVORABLE => [['code' => 'RELECTURE_DEFAVORABLE', 'regle' => 'RED-02', 'niveau' => DraftChecker::BLOCKING, 'message' => 'La relecture est défavorable : corrigez le diaporama, puis faites-le relire de nouveau.']],
            default => [['code' => 'RELECTURE_AVEC_RESERVES', 'regle' => 'RED-02', 'niveau' => DraftChecker::BLOCKING, 'message' => 'La relecture émet des réserves : corrigez le diaporama, puis faites-le relire de nouveau pour obtenir un avis favorable.']],
        };
    }

    /**
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}> avertissements restants
     */
    private function blockUnlessValid(Diaporama $diaporama): array
    {
        $issues = $this->checker->check($diaporama);
        if (DraftChecker::hasBlockingIssue($issues)) {
            throw new RedactionError('Le diaporama ne peut pas être enregistré : corrigez les contrôles bloquants.', RedactionError::BLOCKED, $issues);
        }

        return $issues;
    }

    /**
     * @return array{0: ?PageContent, 1: ?Menus, 2: ?Category}
     */
    private function target(?int $coursId, ?int $moduleId, ?int $parcoursId = null): array
    {
        if (\count(array_filter([$coursId, $moduleId, $parcoursId], static fn (?int $id) => $id !== null)) !== 1) {
            throw RedactionError::invalid([['champ' => 'coursId', 'message' => 'Indiquez une seule cible : coursId (un cours), moduleId (un chapitre) ou parcoursId (un parcours entier).']]);
        }
        if ($coursId !== null) {
            return [$this->entityManager->find(PageContent::class, $coursId) ?? throw new RedactionError('Cours introuvable (voir lister_cours_publies).', RedactionError::NOT_FOUND), null, null];
        }
        if ($parcoursId !== null) {
            return [null, null, $this->entityManager->find(Category::class, $parcoursId) ?? throw new RedactionError('Parcours introuvable (voir lister_catalogue).', RedactionError::NOT_FOUND)];
        }

        return [null, $this->entityManager->find(Menus::class, (int) $moduleId) ?? throw new RedactionError('Module introuvable (voir lister_catalogue).', RedactionError::NOT_FOUND), null];
    }

    private function existing(Diaporama $diaporama): ?Diaporama
    {
        $criteria = match ($diaporama->getTypeCible()) {
            Diaporama::TARGET_COURSE => ['cours' => $diaporama->getCours()],
            Diaporama::TARGET_PATH => ['parcours' => $diaporama->getParcours()],
            default => ['chapitre' => $diaporama->getChapitre()],
        };

        return $this->entityManager->getRepository(Diaporama::class)->findOneBy($criteria);
    }

    private function diaporama(int $id): Diaporama
    {
        return $this->entityManager->find(Diaporama::class, $id) ?? throw new RedactionError('Diaporama introuvable (voir lister_diaporamas).', RedactionError::NOT_FOUND);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function apply(Diaporama $diaporama, array $data, bool $creating, bool $keepFingerprint = false): void
    {
        $errors = [];

        foreach (['titre' => 'setTitre', 'sousTitre' => 'setSousTitre'] as $champ => $setter) {
            if ($creating || \array_key_exists($champ, $data)) {
                $texte = trim((string) ($data[$champ] ?? ''));
                if (mb_strlen($texte) > 255) {
                    $errors[] = ['champ' => $champ, 'message' => '255 caractères au plus.'];
                }
                $diaporama->{$setter}($texte);
            }
        }
        if ($creating || \array_key_exists('diapositives', $data)) {
            $diaporama->setDiapositives($this->slides($data['diapositives'] ?? null, $errors));
        }
        // Thème choisi par identifiant (DIA-05) : le contrôle DIAPO_THEME_INCONNU refuse une autre valeur
        if (\array_key_exists('theme', $data)) {
            $diaporama->setTheme(\is_string($data['theme']) ? $data['theme'] : '');
        }
        if (\array_key_exists('objectif', $data)) {
            $diaporama->setObjectif(\is_string($data['objectif']) ? $data['objectif'] : null);
        }
        if (\array_key_exists('brief', $data)) {
            [$brief, $erreursBrief] = DiaporamaBrief::normaliser($data['brief']);
            array_push($errors, ...$erreursBrief);
            $diaporama->setBrief($brief);
            // Le thème du brief sert de thème au diaporama s'il n'est pas donné à part
            if ($brief !== null && !\array_key_exists('theme', $data)) {
                $diaporama->setTheme($brief['theme']);
            }
            if ($brief !== null && !\array_key_exists('objectif', $data) && $diaporama->getObjectif() === null) {
                $diaporama->setObjectif($brief['objectif']);
            }
        }
        if (\array_key_exists('scenario', $data)) {
            [$scenario, $erreursScenario] = DiaporamaScenario::normaliser($data['scenario'], $this->sceneCatalogue()->types());
            array_push($errors, ...$erreursScenario);
            $diaporama->setScenario($scenario);
        }
        if ($errors !== []) {
            throw RedactionError::invalid($errors);
        }

        // Le texte source au moment de la synthèse : un changement du cours signale le diaporama à mettre à jour
        if (!$keepFingerprint) {
            $diaporama->setEmpreinteSource($this->source->empreinte($diaporama))
                ->setCoursSources($this->source->inventaire($diaporama));
        }
    }

    /**
     * Garde la forme JSON attendue par le front ; le fond est jugé par DiaporamaChecker.
     *
     * @param list<array{champ: string, message: string}> $errors
     * @return list<mixed>
     */
    private function slides(mixed $raw, array &$errors): array
    {
        if (!\is_array($raw) || !array_is_list($raw) || \count($raw) > self::MAX_SLIDES) {
            $errors[] = ['champ' => 'diapositives', 'message' => sprintf('Liste de %d diapositives au plus attendue.', self::MAX_SLIDES)];

            return [];
        }
        foreach ($raw as $index => $slide) {
            if (!\is_array($slide) || array_is_list($slide)) {
                $errors[] = ['champ' => "diapositives[$index]", 'message' => 'Objet attendu : {modele, titre, points, notes…}.'];
                continue;
            }
            if (\is_string($slide['notes'] ?? null) && mb_strlen($slide['notes']) > self::MAX_NOTES_LENGTH) {
                $errors[] = ['champ' => "diapositives[$index].notes", 'message' => sprintf('Notes trop longues (%d caractères au plus).', self::MAX_NOTES_LENGTH)];
            }
            array_walk_recursive($slide, static function ($value, $key) use (&$errors, $index) {
                if (\is_string($value) && $key !== 'notes' && mb_strlen($value) > self::MAX_TEXT_LENGTH) {
                    $errors[] = ['champ' => "diapositives[$index].$key", 'message' => sprintf('Texte trop long (%d caractères au plus) : le détail va dans les notes.', self::MAX_TEXT_LENGTH)];
                }
            });
        }

        return $raw;
    }

    private function visuels(): DiaporamaVisuels
    {
        \assert($this->visuels !== null);

        return $this->visuels;
    }

    private function sceneCatalogue(): SceneCatalogue
    {
        \assert($this->scenes !== null);

        return $this->scenes;
    }

    /**
     * Pour chaque scène : la notion qu'elle aide à comprendre, les cas trompeurs, les paramètres, les rendus web,
     * .pptx et PDF, et l'alternative fixe. Un mot-clé seul ne justifie jamais une scène (DIA-07).
     *
     * @return array<string, mixed>
     */
    private function guideScenes(): array
    {
        $scenes = [];
        foreach ($this->sceneCatalogue()->resume() as $scene) {
            $rendus = \is_array($scene['rendus']) ? $scene['rendus'] : [];
            $scenes[] = [
                'type' => $scene['type'],
                'notion' => $scene['usage'],
                'convient' => $scene['convient'],
                'peutInduireEnErreur' => $scene['peutInduireEnErreur'],
                'parametres' => $scene['champs'],
                'rendus' => [
                    'web' => 'Animation par étapes (rejouable), vue fixe légendée et lecture sans mouvement.',
                    'pptx' => ($rendus['pptx'] ?? null) === 'etapes'
                        ? 'Une diapositive fixe par étape (« Étape n/N » dans les notes) : ce ne sont pas des animations PowerPoint.'
                        : 'La vue fixe sur une diapositive (formes modifiables), sans animation.',
                    'pdf' => 'La vue fixe, puis les étapes numérotées avec leurs légendes.',
                    'catalogue' => $rendus,
                ],
                'alternativeFixe' => 'Sans scène, utilisez la même diapositive (notion, etapes ou exercice) avec ses points : la description de la scène doit suffire à comprendre.',
            ];
        }

        return [
            'regle' => 'Proposez une scène seulement quand l\'ordre, le trajet, le tri ou la décision se comprend mieux en le voyant se dérouler (DIA-07). Pour chaque scène proposée : notion, justification courte, paramètres, alternative fixe. Un mot du titre ne suffit pas.',
            'champNotion' => 'scene.notion (facultatif, 80 caractères) : la notion que la scène aide à comprendre.',
            'scenes' => $scenes,
        ];
    }

    private function audience(Diaporama $diaporama): ?string
    {
        return $diaporama->getAudience();
    }

    /**
     * @return array<string, mixed>
     */
    private function targetSummary(Diaporama $diaporama): array
    {
        return match (true) {
            $diaporama->getCours() !== null => ['type' => Diaporama::TARGET_COURSE, 'id' => $diaporama->getCours()->getId(), 'titre' => $diaporama->getCours()->getTitle()],
            $diaporama->getParcours() !== null => ['type' => Diaporama::TARGET_PATH, 'id' => $diaporama->getParcours()->getId(), 'titre' => $diaporama->getParcours()->getName()],
            default => ['type' => Diaporama::TARGET_CHAPTER, 'id' => $diaporama->getChapitre()?->getId(), 'titre' => $diaporama->getChapitre()?->getLabel()],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Diaporama $diaporama): array
    {
        return [
            'id' => $diaporama->getId(),
            'titre' => $diaporama->getTitre(),
            'cible' => $this->targetSummary($diaporama),
            'statut' => $diaporama->getStatus(),
            'auteur' => $diaporama->getAuthor(),
            'theme' => $diaporama->getTheme(),
            'nombreDeDiapositives' => \count($diaporama->getDiapositives()),
            'nombreDeScenes' => \count(array_filter($diaporama->getDiapositives(), static fn ($d) => \is_array($d) && isset($d['scene']))),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Diaporama $diaporama): array
    {
        return $this->summary($diaporama) + [
            'sousTitre' => $diaporama->getSousTitre(),
            'objectif' => $diaporama->getObjectif(),
            'public' => $this->audience($diaporama),
            'couverture' => $diaporama->getCouverture(),
            'coursSources' => $diaporama->getCoursSources(),
            'brief' => $diaporama->getBrief(),
            'scenario' => $diaporama->getScenario(),
            'controleRendu' => DiaporamaChecker::etatRendu($diaporama),
            // Aperçu réservé aux administrateurs : projection, vue fixe et contrôles de rendu dans le navigateur
            'apercuUrl' => $diaporama->getId() === null ? null : '/spa/diaporamas/apercu/'.$diaporama->getId(),
            'diapositives' => $diaporama->getDiapositives(),
            'creeLe' => $diaporama->getCreatedAt()->format(\DATE_ATOM),
            'modifieLe' => $diaporama->getUpdatedAt()->format(\DATE_ATOM),
            'publieLe' => $diaporama->getPublishedAt()?->format(\DATE_ATOM),
            'relecture' => $diaporama->getReviewReport() === null ? null : $diaporama->getReviewReport() + [
                'par' => $diaporama->getReviewedBy(),
                'le' => $diaporama->getReviewedAt()?->format(\DATE_ATOM),
            ],
        ];
    }
}
