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

    public function __construct(
        private EntityManagerInterface $entityManager,
        private DiaporamaChecker $checker,
        private CourseMediaRepositoryInterface $captures,
        private DiaporamaSource $source = new DiaporamaSource(),
        private ?SceneCatalogue $scenes = null,
    ) {
        $this->scenes ??= new SceneCatalogue(\dirname(__DIR__, 3).'/regles/scenes/catalogue.json');
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
            'modeles' => DiaporamaChecker::MODELES,
            'themes' => Diaporama::THEMES,
            'scenes' => array_map(static fn (array $s) => ['type' => $s['type'], 'usage' => $s['usage'], 'peutInduireEnErreur' => $s['peutInduireEnErreur']], $this->scenes()['scenes']),
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
    public function show(int $id): array
    {
        return $this->detail($this->diaporama($id));
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
     * @return array{sansControleBloquant: bool, publiable: bool, controles: list<array<string, mixed>>}
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
