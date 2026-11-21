<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Entity\Diaporama;
use App\Entity\PageContent;

/**
 * Texte source d'un diaporama : le cours, tous les cours du chapitre, ou les cours publiés du parcours,
 * dans l'ordre du parcours. Sert au contrôle de copie (DIA-02), à l'empreinte qui signale un diaporama à
 * mettre à jour, à la règle « un chapitre attend que tous ses cours soient publiés » et à la couverture
 * d'un diaporama de parcours (DIA-10 : seuls les cours publiés sont exploités).
 */
final class DiaporamaSource
{
    /**
     * @return list<PageContent>
     */
    public function cours(Diaporama $diaporama): array
    {
        if ($diaporama->getCours() !== null) {
            return [$diaporama->getCours()];
        }
        if ($diaporama->getParcours() !== null) {
            // Modules dans l'ordre de création, puis cours dans l'ordre du module ; les cours hors module à la fin
            $cours = $diaporama->getParcours()->getPageContents()->toArray();
            usort($cours, static fn (PageContent $a, PageContent $b) => [$a->getMenu()?->getId() ?? \PHP_INT_MAX, $a->getOrdre() ?? \PHP_INT_MAX, $a->getId()]
                <=> [$b->getMenu()?->getId() ?? \PHP_INT_MAX, $b->getOrdre() ?? \PHP_INT_MAX, $b->getId()]);

            return $cours;
        }
        $cours = $diaporama->getChapitre()?->getPageContents()->toArray() ?? [];
        usort($cours, static fn (PageContent $a, PageContent $b) => [$a->getOrdre() ?? \PHP_INT_MAX, $a->getId()] <=> [$b->getOrdre() ?? \PHP_INT_MAX, $b->getId()]);

        return $cours;
    }

    /**
     * Cours dont la synthèse peut s'inspirer : tous pour un cours ou un chapitre, les seuls cours publiés et
     * ouverts à tous pour un parcours (DIA-10).
     *
     * @return list<PageContent>
     */
    public function coursExploites(Diaporama $diaporama): array
    {
        $cours = $this->cours($diaporama);

        // Un cours réservé à certains apprenants n'entre pas dans la synthèse d'un parcours : elle serait visible de tous
        return $diaporama->getParcours() === null ? $cours : array_values(array_filter($cours, static fn (PageContent $c) => $c->isPublished() && !$c->isReserve()));
    }

    /**
     * Inventaire des cours de la cible, avec leur statut au moment de la synthèse (gardé dans le diaporama).
     *
     * @return list<array{id: int, titre: string, statut: string, exploite: bool, module: ?string}>
     */
    public function inventaire(Diaporama $diaporama): array
    {
        $exploites = array_map(static fn (PageContent $c) => spl_object_id($c), $this->coursExploites($diaporama));

        return array_map(static fn (PageContent $c) => [
            'id' => (int) $c->getId(),
            'titre' => (string) $c->getTitle(),
            'statut' => $c->getStatus(),
            'exploite' => \in_array(spl_object_id($c), $exploites, true),
            'module' => $c->getMenu()?->getLabel(),
        ], $this->cours($diaporama));
    }

    public function texte(Diaporama $diaporama): string
    {
        return implode("\n\n", array_map(self::texteDuCours(...), $this->coursExploites($diaporama)));
    }

    public function empreinte(Diaporama $diaporama): string
    {
        return hash('sha256', $this->texte($diaporama));
    }

    /**
     * Le cours a changé depuis la synthèse : le diaporama est à mettre à jour.
     */
    public function estPerime(Diaporama $diaporama): bool
    {
        return $diaporama->getTypeCible() !== null && $diaporama->getEmpreinteSource() !== null
            && $diaporama->getEmpreinteSource() !== $this->empreinte($diaporama);
    }

    /**
     * Titres des cours du chapitre qui ne sont pas encore publiés.
     *
     * @return list<string>
     */
    public function coursNonPublies(Diaporama $diaporama): array
    {
        if ($diaporama->getChapitre() === null) {
            return [];
        }

        return array_values(array_map(
            static fn (PageContent $cours) => (string) $cours->getTitle(),
            array_filter($this->cours($diaporama), static fn (PageContent $cours) => !$cours->isPublished()),
        ));
    }

    public static function texteDuCours(PageContent $cours): string
    {
        $html = (string) ($cours->getCode() ?: $cours->getContent());
        $texte = html_entity_decode(strip_tags(preg_replace('/\[capture:\d+\]/', ' ', $html) ?? $html), \ENT_QUOTES | \ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', (string) $cours->getTitle().' '.$texte) ?? '');
    }
}
