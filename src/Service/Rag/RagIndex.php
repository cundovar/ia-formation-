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

    public function __construct(private EntityManagerInterface $entityManager) {}

    /** Synchronise le petit catalogue courant avant une recherche, sans réseau ni modèle externe. */
    public function refresh(): void
    {
        foreach ($this->entityManager->getRepository(PageContent::class)->findAll() as $course) {
            $this->sync($course);
        }
        $this->entityManager->flush();
    }

    private function sync(PageContent $course): void
    {
        $existing = $this->entityManager->getRepository(RagPassage::class)->findBy(['course' => $course], ['position' => 'ASC']);
        $text = self::text($course->getContent());
        $checksum = hash('sha256', $course->getStatus().'\0'.$text);
        if ($course->isPublished() && $existing !== [] && $existing[0]->getChecksum() === $checksum) {
            return;
        }
        if (!$course->isPublished() || $text === '') {
            foreach ($existing as $passage) {
                $this->entityManager->remove($passage);
            }
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
