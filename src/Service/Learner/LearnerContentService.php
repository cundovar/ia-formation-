<?php

declare(strict_types=1);

namespace App\Service\Learner;

use App\Entity\Category;
use App\Entity\PageContent;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Vue de lecture dédiée au connecteur apprenant. Elle ne réutilise pas l'API publique : chaque
 * résultat est filtré avec l'apprenant OAuth avant sa sérialisation, donc n'expose ni brouillon ni
 * contenu attribué à quelqu'un d'autre.
 */
final class LearnerContentService
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    /** @return list<array<string, mixed>> */
    public function parcours(User $learner, ?string $audience = null): array
    {
        $categories = $this->entityManager->getRepository(Category::class)->findBy(['visible' => true], ['ordre' => 'ASC', 'name' => 'ASC']);
        $result = [];
        foreach ($categories as $category) {
            if (!$category instanceof Category || !$category->isAccessibleTo($learner) || ($audience !== null && $category->getAudience() !== $audience)) {
                continue;
            }
            $result[] = [
                'id' => $category->getId(),
                'titre' => $category->getName(),
                'public' => $category->getAudience(),
                'description' => self::text($category->getDescription()),
            ];
        }

        return $result;
    }

    /** @return list<array<string, mixed>> */
    public function rechercher(User $learner, string $query): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }
        $pages = $this->entityManager->getRepository(PageContent::class)->findBy(['status' => PageContent::STATUS_PUBLISHED], ['id' => 'DESC']);
        $result = [];
        foreach ($pages as $page) {
            if (!$page instanceof PageContent || !$this->canRead($page, $learner)) {
                continue;
            }
            $haystack = self::text(($page->getTitle() ?? '').' '.($page->getContent() ?? ''));
            if (mb_stripos($haystack, $query) === false) {
                continue;
            }
            $result[] = $this->summary($page);
            if (count($result) === 10) {
                break;
            }
        }

        return $result;
    }

    /** @return array<string, mixed>|null */
    public function course(User $learner, int $id): ?array
    {
        $page = $this->entityManager->getRepository(PageContent::class)->find($id);
        if (!$page instanceof PageContent || !$this->canRead($page, $learner)) {
            return null;
        }

        return $this->summary($page) + ['contenu' => self::text($page->getContent())];
    }

    private function canRead(PageContent $page, User $learner): bool
    {
        return $page->isPublished()
            && $page->isAccessibleTo($learner)
            && ($page->getCategory() === null || $page->getCategory()->isAccessibleTo($learner));
    }

    /** @return array<string, mixed> */
    private function summary(PageContent $page): array
    {
        return [
            'id' => $page->getId(),
            'titre' => $page->getTitle(),
            'parcours' => $page->getCategory()?->getName(),
            'module' => $page->getMenu()?->getLabel(),
            'duree' => $page->getDuration(),
            'extrait' => mb_substr(self::text($page->getContent()), 0, 500),
            'sourceOfficielle' => $page->getSourceUrl(),
            'adresse' => $page->getPage()?->getSlug() === null ? null : '/spa/'.$page->getPage()->getSlug(),
        ];
    }

    private static function text(?string $html): string
    {
        return trim(preg_replace('/\s+/u', ' ', strip_tags($html ?? '')) ?? '');
    }
}
