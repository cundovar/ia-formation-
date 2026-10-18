<?php

declare(strict_types=1);

namespace App\Service\Rag;

use App\Entity\PageContent;
use App\Entity\RagPassage;
use Doctrine\ORM\EntityManagerInterface;

/** Construit localement les passages recherchables des cours publiés. */
final class RagIndex
{
    private const PASSAGE_LENGTH = 900;

    public function __construct(private EntityManagerInterface $entityManager, private VectorStore $vectors) {}

    /** Synchronise le petit catalogue courant avant une recherche, sans réseau ni modèle externe. */
    public function refresh(): void
    {
        foreach ($this->entityManager->getRepository(PageContent::class)->findAll() as $course) {
            $this->sync($course);
        }
        $this->entityManager->flush();
    }

    public function rebuildVectors(): int
    {
        $count = 0;
        foreach ($this->entityManager->getRepository(PageContent::class)->findAll() as $course) {
            $text = self::text($course->getContent());
            if (!$course->isPublished() || $text === '') { $this->vectors->deleteCourse((int) $course->getId()); continue; }
            $checksum = hash('sha256', $course->getStatus().'\0'.$text);
            $this->indexVectors($course, self::split($text), $checksum);
            ++$count;
        }
        return $count;
    }

    private function sync(PageContent $course): void
    {
        $existing = $this->entityManager->getRepository(RagPassage::class)->findBy(['course' => $course], ['position' => 'ASC']);
        // Le texte d'un cours rédigé par le connecteur est dans `code` ; `content` sert aux anciens cours.
        $text = self::text(($course->getCode() ?: null) ?? $course->getContent());
        $checksum = hash('sha256', $course->getStatus().'\0'.$text);
        if ($course->isPublished() && $existing !== [] && $existing[0]->getChecksum() === $checksum) {
            return;
        }
        if (!$course->isPublished() || $text === '') {
            foreach ($existing as $passage) {
                $this->entityManager->remove($passage);
            }
            $this->vectors->deleteCourse((int) $course->getId());
            return;
        }
        $chunks = self::split($text);
        foreach ($chunks as $position => $content) {
            if (isset($existing[$position])) {
                $existing[$position]->replace($content, $checksum);
                continue;
            }
            $this->entityManager->persist(new RagPassage($course, $position + 1, $content, $checksum));
        }
        foreach (array_slice($existing, count($chunks)) as $passage) {
            $this->entityManager->remove($passage);
        }
        $this->indexVectors($course, $chunks, $checksum);
    }

    /** @param list<string> $chunks */
    private function indexVectors(PageContent $course, array $chunks, string $checksum): void
    {
        $id = (int) $course->getId();
        $this->vectors->index(array_map(static fn (string $text, int $offset) => ['id' => $id.'-'.($offset + 1), 'text' => $text, 'course_id' => $id, 'position' => $offset + 1, 'checksum' => $checksum], $chunks, array_keys($chunks)));
    }

    /** @return list<string> */
    private static function split(string $text): array
    {
        $chunks = [];
        while (mb_strlen($text) > self::PASSAGE_LENGTH) {
            $cut = mb_strrpos(mb_substr($text, 0, self::PASSAGE_LENGTH), ' ');
            $cut = $cut === false ? self::PASSAGE_LENGTH : $cut;
            $chunks[] = trim(mb_substr($text, 0, $cut));
            $text = trim(mb_substr($text, $cut));
        }
        if ($text !== '') {
            $chunks[] = $text;
        }

        return $chunks;
    }

    private static function text(?string $html): string
    {
        return trim(preg_replace('/\s+/u', ' ', strip_tags($html ?? '')) ?? '');
    }
}
