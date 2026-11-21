<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Entity\Diaporama;
use App\Entity\PageContent;

/**
 * Brief d'un diaporama (DIA-11) : public, durée indicative, objectif, contexte professionnel, thème et intention.
 * L'agent peut le proposer à partir des cours (proposer()) ; la personne le corrige, puis il est gardé avec le
 * diaporama, affiché dans l'aperçu et lu par le relecteur. Fonctions pures, sans base de données.
 */
final class DiaporamaBrief
{
    public const INTENTIONS = [
        'explicative' => 'Faire comprendre une notion ou une démarche, surtout par la parole et des schémas.',
        'illustree' => 'Montrer les outils : captures et démonstrations au premier plan.',
        'atelier' => 'Faire pratiquer le groupe : exercices, études de cas et moments de vérification.',
    ];
    public const STATUTS = ['propose', 'confirme'];
    public const DUREE = [5, 240];
    public const MAX_OBJECTIF = 160;
    public const MAX_CONTEXTE = 240;
    private const MAX_DEDUCTIONS = 8;
    // Minutes par diapositive, pour proposer une durée indicative
    private const MINUTES_PAR_DIAPOSITIVE = 3;

    /**
     * Brief proposé par le serveur : chaque valeur est déduite et signalée comme telle ; l'agent la présente à la
     * personne, qui la corrige.
     *
     * @param list<PageContent> $cours
     * @param array{0: int, 1: int} $nombreAttendu
     * @return array<string, mixed>
     */
    public static function proposer(Diaporama $diaporama, array $cours, array $nombreAttendu, string $titreCible): array
    {
        $public = $diaporama->getAudience() ?? 'apprendre';
        $diapositives = intdiv($nombreAttendu[0] + $nombreAttendu[1], 2);
        $intention = $public === 'former' ? 'atelier' : 'illustree';
        $titres = array_slice(array_map(static fn (PageContent $c) => (string) $c->getTitle(), $cours), 0, 4);

        return [
            'public' => $public,
            'dureeMinutes' => max(self::DUREE[0], min(self::DUREE[1], $diapositives * self::MINUTES_PAR_DIAPOSITIVE)),
            'objectif' => mb_strimwidth(sprintf('À la fin, savoir utiliser ce que présente « %s » et vérifier le résultat.', $titreCible), 0, self::MAX_OBJECTIF, '…'),
            'contexte' => null,
            // Une présentation illustrée ou un atelier : le thème Atelier visuel (schéma au centre, encadrés)
            'theme' => 'atelier_visuel',
            'intention' => $intention,
            'statut' => 'propose',
            'deductions' => [
                ['champ' => 'public', 'origine' => 'Public du parcours de la cible.'],
                ['champ' => 'dureeMinutes', 'origine' => sprintf('Environ %d minutes par diapositive pour %d diapositives.', self::MINUTES_PAR_DIAPOSITIVE, $diapositives)],
                ['champ' => 'objectif', 'origine' => 'Titre de la cible ; à reformuler avec la personne.'],
                ['champ' => 'intention', 'origine' => $public === 'former' ? 'Public « former » : un atelier fait pratiquer.' : 'Public « apprendre » : des visuels des outils aident à s\'y retrouver.'],
                ['champ' => 'contexte', 'origine' => 'Inconnu : à demander (métier, situation fictive). Cours lus : '.mb_strimwidth(implode(' ; ', $titres), 0, 100, '…')],
            ],
            'intentionsPossibles' => self::INTENTIONS,
            'themesPossibles' => Diaporama::THEMES,
        ];
    }

    /**
     * Garde la forme attendue ; le brief est refusé, sans rien enregistrer, s'il est mal formé.
     *
     * @return array{0: array<string, mixed>|null, 1: list<array{champ: string, message: string}>}
     */
    public static function normaliser(mixed $brut): array
    {
        if ($brut === null) {
            return [null, []];
        }
        if (!\is_array($brut) || array_is_list($brut)) {
            return [null, [['champ' => 'brief', 'message' => 'Objet attendu : {public, dureeMinutes, objectif, contexte, theme, intention, statut}.']]];
        }
        $erreurs = [];
        $public = $brut['public'] ?? null;
        if (!\in_array($public, ['apprendre', 'former'], true)) {
            $erreurs[] = ['champ' => 'brief.public', 'message' => 'apprendre ou former.'];
        }
        $duree = $brut['dureeMinutes'] ?? null;
        if (!\is_int($duree) || $duree < self::DUREE[0] || $duree > self::DUREE[1]) {
            $erreurs[] = ['champ' => 'brief.dureeMinutes', 'message' => sprintf('Nombre entier de minutes, de %d à %d.', ...self::DUREE)];
        }
        $objectif = self::texte($brut['objectif'] ?? null, 'brief.objectif', self::MAX_OBJECTIF, true, $erreurs);
        $contexte = self::texte($brut['contexte'] ?? null, 'brief.contexte', self::MAX_CONTEXTE, false, $erreurs);
        $theme = $brut['theme'] ?? Diaporama::THEME_STANDARD;
        if (!\in_array($theme, Diaporama::THEMES, true)) {
            $erreurs[] = ['champ' => 'brief.theme', 'message' => 'Thème du site : '.implode(', ', Diaporama::THEMES).'.'];
        }
        $intention = $brut['intention'] ?? null;
        if (!\is_string($intention) || !isset(self::INTENTIONS[$intention])) {
            $erreurs[] = ['champ' => 'brief.intention', 'message' => 'Intention : '.implode(', ', array_keys(self::INTENTIONS)).'.'];
        }
        $statut = $brut['statut'] ?? 'propose';
        if (!\in_array($statut, self::STATUTS, true)) {
            $erreurs[] = ['champ' => 'brief.statut', 'message' => 'propose (valeurs déduites, pas encore confirmées par la personne) ou confirme.'];
        }
        $deductions = [];
        foreach (\is_array($brut['deductions'] ?? null) ? \array_slice(array_values($brut['deductions']), 0, self::MAX_DEDUCTIONS) : [] as $i => $d) {
            $champ = \is_array($d) ? self::texte($d['champ'] ?? null, "brief.deductions[$i].champ", 30, true, $erreurs) : null;
            $origine = \is_array($d) ? self::texte($d['origine'] ?? null, "brief.deductions[$i].origine", 160, true, $erreurs) : null;
            if ($champ !== null && $origine !== null) {
                $deductions[] = ['champ' => $champ, 'origine' => $origine];
            }
        }
        $inconnus = array_diff(array_keys($brut), ['public', 'dureeMinutes', 'objectif', 'contexte', 'theme', 'intention', 'statut', 'deductions', 'intentionsPossibles', 'themesPossibles']);
        if ($inconnus !== []) {
            $erreurs[] = ['champ' => 'brief', 'message' => 'Champs inconnus : '.implode(', ', $inconnus).'.'];
        }
        if ($erreurs !== []) {
            return [null, $erreurs];
        }

        return [[
            'public' => $public,
            'dureeMinutes' => $duree,
            'objectif' => $objectif,
            'contexte' => $contexte,
            'theme' => $theme,
            'intention' => $intention,
            'statut' => $statut,
            'deductions' => $deductions,
        ], []];
    }

    /**
     * @param list<array{champ: string, message: string}> $erreurs
     */
    public static function texte(mixed $valeur, string $champ, int $max, bool $obligatoire, array &$erreurs): ?string
    {
        if ($valeur === null || (\is_string($valeur) && trim($valeur) === '')) {
            if ($obligatoire) {
                $erreurs[] = ['champ' => $champ, 'message' => 'Texte obligatoire.'];
            }

            return null;
        }
        if (!\is_string($valeur)) {
            $erreurs[] = ['champ' => $champ, 'message' => 'Texte attendu.'];

            return null;
        }
        $texte = trim($valeur);
        if (mb_strlen($texte) > $max) {
            $erreurs[] = ['champ' => $champ, 'message' => sprintf('%d caractères au plus.', $max)];
        }
        if (preg_match('/<\s*\/?\s*[a-z!?]|javascript:|data:/i', $texte) === 1) {
            $erreurs[] = ['champ' => $champ, 'message' => 'Texte simple, sans HTML ni lien javascript: ou data:.'];
        }

        return $texte;
    }
}
