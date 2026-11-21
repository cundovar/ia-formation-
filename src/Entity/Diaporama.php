<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName;

/**
 * Diaporama d'un cours, d'un chapitre ou d'un parcours entier (docs/PLAN_DIAPORAMAS.md) : une synthèse
 * structurée, rédigée par l'assistant de rédaction, relue par un autre connecteur, puis publiée. Le site lui
 * applique un de ses thèmes (choisi par identifiant) et construit le .pptx et la version PDF dans le navigateur.
 *
 * Il vise exactement un cours, un chapitre ou un parcours. Les diapositives sont gardées en JSON : liste
 * d'objets {modele, titre, points, notes, scene?…} décrits dans front/src/diaporamas/modeles.js ; une scène
 * animée suit le catalogue regles/scenes/catalogue.json. `coursSources` garde les cours exploités, calculés
 * par le serveur (statut au moment de la synthèse).
 *
 * API publique en lecture seule : GET /api/diaporamas?cours=ID, ?chapitre[]=ID ou ?parcours=ID.
 * PublishedContentExtension ne sert que les diaporamas publiés dont la cible est publiée et accessible.
 */
#[ORM\Entity]
#[ORM\Table(name: 'diaporama')]
#[ApiResource(
    operations: [new GetCollection(), new Get()],
    normalizationContext: ['groups' => ['diaporama:read']],
    paginationItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: ['cours' => 'exact', 'chapitre' => 'exact', 'parcours' => 'exact'])]
class Diaporama
{
    public const STATUS_DRAFT = 'brouillon';
    public const STATUS_TO_FIX = 'a_corriger';
    public const STATUS_PUBLISHED = 'publie';

    public const STATUS_LABELS = [
        'Brouillon' => self::STATUS_DRAFT,
        'À corriger' => self::STATUS_TO_FIX,
        'Publié' => self::STATUS_PUBLISHED,
    ];

    public const TARGET_COURSE = 'cours';
    public const TARGET_CHAPTER = 'chapitre';
    public const TARGET_PATH = 'parcours';

    // Thèmes du site (front/src/diaporamas/themes) : l'agent choisit seulement l'identifiant (DIA-05)
    public const THEME_STANDARD = 'standard';
    public const THEMES = [self::THEME_STANDARD, 'atelier_visuel'];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['diaporama:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'cours_id', onDelete: 'CASCADE')]
    private ?PageContent $cours = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'chapitre_id', onDelete: 'CASCADE')]
    private ?Menus $chapitre = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'parcours_id', onDelete: 'CASCADE')]
    private ?Category $parcours = null;

    #[ORM\Column(length: 30, options: ['default' => self::THEME_STANDARD])]
    #[Groups(['diaporama:read'])]
    private string $theme = self::THEME_STANDARD;

    // Ce que la présentation doit permettre (affiché sur l'ouverture et dans l'aperçu)
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['diaporama:read'])]
    private ?string $objectif = null;

    /** @var list<array{id: int, titre: string, statut: string, exploite: bool, module: ?string}>|null */
    #[ORM\Column(name: 'cours_sources', type: Types::JSON, nullable: true)]
    private ?array $coursSources = null;

    // Brief et scénario pédagogique (DIA-11) : outils éditoriaux, jamais servis par l'API publique
    /** @var array<string, mixed>|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $brief = null;

    /** @var array<string, mixed>|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $scenario = null;

    // Dernier contrôle de rendu mesuré dans le navigateur d'un administrateur (aperçu), avec l'empreinte du contenu contrôlé
    /** @var array<string, mixed>|null */
    #[ORM\Column(name: 'controle_rendu', type: Types::JSON, nullable: true)]
    private ?array $controleRendu = null;

    #[ORM\Column(length: 255)]
    #[Groups(['diaporama:read'])]
    private string $titre = '';

    #[ORM\Column(name: 'sous_titre', length: 255)]
    #[Groups(['diaporama:read'])]
    private string $sousTitre = '';

    // JSON fourni par l'agent : sa forme est vérifiée par DiaporamaChecker
    /** @var list<mixed> */
    #[ORM\Column(type: Types::JSON)]
    #[Groups(['diaporama:read'])]
    private array $diapositives = [];

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_DRAFT;

    #[ORM\Column(length: 100)]
    private string $author = '';

    // Empreinte du texte du cours ou du chapitre au moment de la synthèse : signale un diaporama à mettre à jour
    #[ORM\Column(name: 'empreinte_source', length: 64, nullable: true)]
    private ?string $empreinteSource = null;

    /** @var array{avis: string, resume: string, points: list<array{regle: ?string, constat: string, suggestion: ?string}>}|null */
    #[ORM\Column(name: 'review_report', type: Types::JSON, nullable: true)]
    private ?array $reviewReport = null;

    #[ORM\Column(name: 'reviewed_by', length: 100, nullable: true)]
    private ?string $reviewedBy = null;

    #[ORM\Column(name: 'reviewed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\Column(name: 'published_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $author)
    {
        $this->author = $author;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCours(): ?PageContent
    {
        return $this->cours;
    }

    public function getChapitre(): ?Menus
    {
        return $this->chapitre;
    }

    public function getParcours(): ?Category
    {
        return $this->parcours;
    }

    /**
     * Un diaporama vise un cours, un chapitre ou un parcours : une seule cible.
     */
    public function setCible(?PageContent $cours, ?Menus $chapitre, ?Category $parcours = null): static
    {
        $this->cours = $cours;
        $this->chapitre = $chapitre;
        $this->parcours = $parcours;

        return $this;
    }

    /**
     * @return self::TARGET_COURSE|self::TARGET_CHAPTER|self::TARGET_PATH|null null si la cible est absente ou multiple
     */
    public function getTypeCible(): ?string
    {
        $cibles = array_filter([
            self::TARGET_COURSE => $this->cours,
            self::TARGET_CHAPTER => $this->chapitre,
            self::TARGET_PATH => $this->parcours,
        ], static fn (?object $cible) => $cible !== null);

        return \count($cibles) === 1 ? (string) array_key_first($cibles) : null;
    }

    /**
     * Libellé de la cible pour le back-office.
     */
    public function getLibelleCible(): string
    {
        return match (true) {
            $this->cours !== null => 'Cours : '.$this->cours->getTitle(),
            $this->parcours !== null => 'Parcours : '.$this->parcours->getName(),
            default => 'Chapitre : '.$this->chapitre?->getLabel(),
        };
    }

    /**
     * Parcours auquel appartient la cible (pour l'audience, l'accès réservé et l'adresse publique).
     */
    public function getParcoursDeLaCible(): ?Category
    {
        return $this->parcours ?? $this->cours?->getCategory() ?? $this->chapitre?->getCategory();
    }

    #[Groups(['diaporama:read'])]
    #[SerializedName('cours')]
    public function getCoursId(): ?int
    {
        return $this->cours?->getId();
    }

    #[Groups(['diaporama:read'])]
    #[SerializedName('chapitre')]
    public function getChapitreId(): ?int
    {
        return $this->chapitre?->getId();
    }

    #[Groups(['diaporama:read'])]
    #[SerializedName('parcours')]
    public function getParcoursId(): ?int
    {
        return $this->parcours?->getId();
    }

    /**
     * Public du parcours (apprendre ou former) : couleur du thème du diaporama.
     */
    #[Groups(['diaporama:read'])]
    public function getAudience(): ?string
    {
        return $this->getParcoursDeLaCible()?->getAudience();
    }

    public function getTheme(): string
    {
        return $this->theme;
    }

    public function setTheme(string $theme): static
    {
        $this->theme = $theme;

        return $this;
    }

    public function getObjectif(): ?string
    {
        return $this->objectif;
    }

    public function setObjectif(?string $objectif): static
    {
        $this->objectif = $objectif === null || trim($objectif) === '' ? null : trim($objectif);

        return $this;
    }

    /**
     * @return list<array{id: int, titre: string, statut: string, exploite: bool, module: ?string}>
     */
    public function getCoursSources(): array
    {
        return $this->coursSources ?? [];
    }

    /**
     * @param list<array{id: int, titre: string, statut: string, exploite: bool, module: ?string}> $coursSources
     */
    public function setCoursSources(array $coursSources): static
    {
        $this->coursSources = $coursSources;

        return $this;
    }

    /**
     * Couverture d'un diaporama de parcours : cours publiés exploités sur l'ensemble des cours (DIA-10).
     *
     * @return array{exploites: int, total: int}|null
     */
    #[Groups(['diaporama:read'])]
    public function getCouverture(): ?array
    {
        if ($this->parcours === null || $this->coursSources === null) {
            return null;
        }

        return [
            'exploites' => \count(array_filter($this->coursSources, static fn (array $c) => $c['exploite'])),
            'total' => \count($this->coursSources),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getBrief(): ?array
    {
        return $this->brief;
    }

    /**
     * @param array<string, mixed>|null $brief
     */
    public function setBrief(?array $brief): static
    {
        $this->brief = $brief;

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getScenario(): ?array
    {
        return $this->scenario;
    }

    /**
     * @param array<string, mixed>|null $scenario
     */
    public function setScenario(?array $scenario): static
    {
        $this->scenario = $scenario;

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getControleRendu(): ?array
    {
        return $this->controleRendu;
    }

    /**
     * @param array<string, mixed>|null $controleRendu
     */
    public function setControleRendu(?array $controleRendu): static
    {
        $this->controleRendu = $controleRendu;

        return $this;
    }

    /**
     * Empreinte de ce que le rendu dépend : diapositives, titre, sous-titre et thème. Un rapport de rendu
     * mesuré sur une autre empreinte est périmé.
     */
    public function getEmpreinteRendu(): string
    {
        return hash('sha256', json_encode([$this->titre, $this->sousTitre, $this->theme, $this->objectif, $this->diapositives], \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR));
    }

    public function getTitre(): string
    {
        return $this->titre;
    }

    public function setTitre(string $titre): static
    {
        $this->titre = $titre;

        return $this;
    }

    public function getSousTitre(): string
    {
        return $this->sousTitre;
    }

    public function setSousTitre(string $sousTitre): static
    {
        $this->sousTitre = $sousTitre;

        return $this;
    }

    /**
     * @return list<mixed>
     */
    public function getDiapositives(): array
    {
        return $this->diapositives;
    }

    /**
     * @param list<mixed> $diapositives
     */
    public function setDiapositives(array $diapositives): static
    {
        $this->diapositives = $diapositives;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    public function getAuthor(): string
    {
        return $this->author;
    }

    public function getEmpreinteSource(): ?string
    {
        return $this->empreinteSource;
    }

    public function setEmpreinteSource(?string $empreinteSource): static
    {
        $this->empreinteSource = $empreinteSource;

        return $this;
    }

    /**
     * @param array{avis: string, resume: string, points: list<array{regle: ?string, constat: string, suggestion: ?string}>} $report
     */
    public function recordReview(array $report, string $reviewer): static
    {
        $this->reviewReport = $report;
        $this->reviewedBy = $reviewer;
        $this->reviewedAt = new \DateTimeImmutable();

        return $this;
    }

    public function clearReview(): static
    {
        $this->reviewReport = null;
        $this->reviewedBy = null;
        $this->reviewedAt = null;

        return $this;
    }

    /**
     * @return array{avis: string, resume: string, points: list<array{regle: ?string, constat: string, suggestion: ?string}>}|null
     */
    public function getReviewReport(): ?array
    {
        return $this->reviewReport;
    }

    public function getReviewedBy(): ?string
    {
        return $this->reviewedBy;
    }

    public function getReviewedAt(): ?\DateTimeImmutable
    {
        return $this->reviewedAt;
    }

    public function markPublished(): static
    {
        $this->status = self::STATUS_PUBLISHED;
        $this->publishedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function touch(): static
    {
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }
}
