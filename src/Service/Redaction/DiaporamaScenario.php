<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Entity\PageContent;

/**
 * Scénario pédagogique d'un diaporama (DIA-11) : objectif, fil rouge, parties avec transitions, démonstrations,
 * vérifications, activité, durée, sources, visuels et scène proposés. Proposé par l'agent, corrigé par la personne
 * avant la création du brouillon (verifier_scenario_diaporama), puis gardé avec le diaporama. Fonctions pures.
 */
final class DiaporamaScenario
{
    public const PARTIES = [2, 8];
    private const IDENTIFIANT = '/^[a-z0-9_-]{1,30}$/';
    private const MAX_LISTE = 3;
    private const MAX_SOURCES = 8;
    private const MAX_VISUELS = 4;
    // Écart toléré entre la durée des parties et celle du brief
    private const TOLERANCE_DUREE = 0.2;

    /**
     * Garde la forme attendue ; un scénario mal formé est refusé sans rien enregistrer.
     *
     * @param list<string> $typesScenes
     * @return array{0: array<string, mixed>|null, 1: list<array{champ: string, message: string}>}
     */
    public static function normaliser(mixed $brut, array $typesScenes): array
    {
        if ($brut === null) {
            return [null, []];
        }
        if (!\is_array($brut) || array_is_list($brut)) {
            return [null, [['champ' => 'scenario', 'message' => 'Objet attendu : {objectifGeneral, filRouge, progression, parties}.']]];
        }
        $erreurs = [];
        $scenario = [
            'objectifGeneral' => DiaporamaBrief::texte($brut['objectifGeneral'] ?? null, 'scenario.objectifGeneral', 200, true, $erreurs),
            'filRouge' => DiaporamaBrief::texte($brut['filRouge'] ?? null, 'scenario.filRouge', 240, false, $erreurs),
            'progression' => DiaporamaBrief::texte($brut['progression'] ?? null, 'scenario.progression', 240, false, $erreurs),
            'parties' => [],
        ];
        $parties = $brut['parties'] ?? null;
        if (!\is_array($parties) || !array_is_list($parties) || \count($parties) < self::PARTIES[0] || \count($parties) > self::PARTIES[1]) {
            $erreurs[] = ['champ' => 'scenario.parties', 'message' => sprintf('Liste de %d à %d parties.', ...self::PARTIES)];
            $parties = [];
        }
        $ids = [];
        foreach ($parties as $i => $partie) {
            $c = "scenario.parties[$i]";
            if (!\is_array($partie) || array_is_list($partie)) {
                $erreurs[] = ['champ' => $c, 'message' => 'Objet attendu.'];
                continue;
            }
            $id = $partie['id'] ?? null;
            if (!\is_string($id) || preg_match(self::IDENTIFIANT, $id) !== 1) {
                $erreurs[] = ['champ' => "$c.id", 'message' => 'Identifiant : lettres minuscules, chiffres, - ou _, 1 à 30 caractères.'];
            } elseif (isset($ids[$id])) {
                $erreurs[] = ['champ' => "$c.id", 'message' => sprintf('Identifiant « %s » déjà utilisé.', $id)];
            }
            $ids[(string) $id] = true;
            $duree = $partie['dureeMinutes'] ?? null;
            if (!\is_int($duree) || $duree < 1 || $duree > 120) {
                $erreurs[] = ['champ' => "$c.dureeMinutes", 'message' => 'Nombre entier de minutes, de 1 à 120.'];
            }
            $normale = [
                'id' => $id,
                'titre' => DiaporamaBrief::texte($partie['titre'] ?? null, "$c.titre", 60, true, $erreurs),
                'intention' => DiaporamaBrief::texte($partie['intention'] ?? null, "$c.intention", 200, true, $erreurs),
                'transition' => DiaporamaBrief::texte($partie['transition'] ?? null, "$c.transition", 160, false, $erreurs),
                'dureeMinutes' => $duree,
                'coursSources' => self::entiers($partie['coursSources'] ?? [], "$c.coursSources", self::MAX_SOURCES, $erreurs),
                'demonstrations' => self::textes($partie['demonstrations'] ?? [], "$c.demonstrations", $erreurs),
                'verifications' => self::textes($partie['verifications'] ?? [], "$c.verifications", $erreurs),
                'activite' => null,
                'visuels' => [],
                'scene' => null,
            ];
            if (isset($partie['activite'])) {
                $a = $partie['activite'];
                $dureeActivite = \is_array($a) ? ($a['dureeMinutes'] ?? null) : null;
                if (!\is_int($dureeActivite) || $dureeActivite < 1 || $dureeActivite > 60) {
                    $erreurs[] = ['champ' => "$c.activite.dureeMinutes", 'message' => 'Nombre entier de minutes, de 1 à 60.'];
                }
                $normale['activite'] = [
                    'consigne' => DiaporamaBrief::texte(\is_array($a) ? ($a['consigne'] ?? null) : null, "$c.activite.consigne", 200, true, $erreurs),
                    'dureeMinutes' => $dureeActivite,
                ];
            }
            $visuels = $partie['visuels'] ?? [];
            if (!\is_array($visuels) || !array_is_list($visuels) || \count($visuels) > self::MAX_VISUELS) {
                $erreurs[] = ['champ' => "$c.visuels", 'message' => sprintf('Liste de %d visuels au plus : {captureId, raison}.', self::MAX_VISUELS)];
                $visuels = [];
            }
            foreach ($visuels as $j => $v) {
                $captureId = \is_array($v) ? ($v['captureId'] ?? null) : null;
                if (!\is_int($captureId) || $captureId < 1) {
                    $erreurs[] = ['champ' => "$c.visuels[$j].captureId", 'message' => 'Identifiant de capture (visuels de preparer_diaporama ou lister_captures).'];
                }
                $normale['visuels'][] = [
                    'captureId' => $captureId,
                    'raison' => DiaporamaBrief::texte(\is_array($v) ? ($v['raison'] ?? null) : null, "$c.visuels[$j].raison", 140, true, $erreurs),
                ];
            }
            if (isset($partie['scene'])) {
                $s = $partie['scene'];
                $type = \is_array($s) ? ($s['type'] ?? null) : null;
                if (!\in_array($type, $typesScenes, true)) {
                    $erreurs[] = ['champ' => "$c.scene.type", 'message' => 'Scène du catalogue : '.implode(', ', $typesScenes).'.'];
                }
                $normale['scene'] = [
                    'type' => $type,
                    'notion' => DiaporamaBrief::texte(\is_array($s) ? ($s['notion'] ?? null) : null, "$c.scene.notion", 80, true, $erreurs),
                    'justification' => DiaporamaBrief::texte(\is_array($s) ? ($s['justification'] ?? null) : null, "$c.scene.justification", 200, true, $erreurs),
                    'alternativeFixe' => DiaporamaBrief::texte(\is_array($s) ? ($s['alternativeFixe'] ?? null) : null, "$c.scene.alternativeFixe", 160, false, $erreurs),
                ];
            }
            $scenario['parties'][] = $normale;
        }

        return $erreurs === [] ? [$scenario, []] : [null, $erreurs];
    }

    /**
     * Contrôles de fond d'un scénario bien formé : sources et visuels existants, couverture réelle, durée.
     *
     * @param array<string, mixed> $scenario
     * @param list<array{id: int, titre: string, statut: string, exploite: bool, module: ?string}> $inventaire
     * @param callable(int): bool $captureExiste
     * @param array<string, mixed>|null $brief
     * @return array{controles: list<array{code: string, regle: ?string, niveau: string, message: string}>, couverture: array<string, mixed>}
     */
    public static function analyser(array $scenario, array $inventaire, callable $captureExiste, ?array $brief): array
    {
        $controles = [];
        $parId = [];
        foreach ($inventaire as $cours) {
            $parId[$cours['id']] = $cours;
        }
        $cites = [];
        $duree = 0;
        $verifications = 0;
        foreach ($scenario['parties'] as $partie) {
            $duree += (int) $partie['dureeMinutes'];
            $verifications += \count($partie['verifications']) + ($partie['activite'] !== null ? 1 : 0);
            if ($partie['coursSources'] === []) {
                $controles[] = self::controle('DIAPO_SCENARIO_SANS_SOURCE', 'DIA-11', DraftChecker::WARNING, sprintf('Partie « %s » : aucune source. Indiquez les cours dont elle s\'inspire (sauf ouverture ou clôture).', $partie['titre']));
            }
            foreach ($partie['coursSources'] as $id) {
                $cours = $parId[$id] ?? null;
                if ($cours === null) {
                    $controles[] = self::controle('DIAPO_SCENARIO_SOURCE', 'DIA-11', DraftChecker::BLOCKING, sprintf('Partie « %s » : le cours %d n\'appartient pas à la cible du diaporama.', $partie['titre'], $id));
                } elseif (!$cours['exploite'] || $cours['statut'] !== PageContent::STATUS_PUBLISHED) {
                    $controles[] = self::controle('DIAPO_SCENARIO_SOURCE', 'DIA-10', DraftChecker::BLOCKING, sprintf('Partie « %s » : le cours « %s » n\'est pas publié ou est réservé ; il ne peut pas servir de source.', $partie['titre'], $cours['titre']));
                } else {
                    $cites[$id] = true;
                }
            }
            foreach ($partie['visuels'] as $visuel) {
                if (!$captureExiste((int) $visuel['captureId'])) {
                    $controles[] = self::controle('DIAPO_SCENARIO_VISUEL', 'DIA-12', DraftChecker::BLOCKING, sprintf('Partie « %s » : la capture %d n\'existe pas. Choisissez un visuel existant, ou aucun.', $partie['titre'], $visuel['captureId']));
                }
            }
        }
        if ($verifications === 0) {
            $controles[] = self::controle('DIAPO_SCENARIO_SANS_VERIFICATION', 'POS-06', DraftChecker::WARNING, 'Le scénario ne prévoit aucun moment de vérification ni activité : ajoutez-en au moins un.');
        }
        $dureeBrief = \is_array($brief) ? (int) ($brief['dureeMinutes'] ?? 0) : 0;
        if ($dureeBrief > 0 && abs($duree - $dureeBrief) > $dureeBrief * self::TOLERANCE_DUREE) {
            $controles[] = self::controle('DIAPO_SCENARIO_DUREE', 'DIA-11', DraftChecker::WARNING, sprintf('Les parties durent %d minutes, le brief en prévoit %d : ajustez l\'un ou l\'autre.', $duree, $dureeBrief));
        }

        $exploites = array_values(array_filter($inventaire, static fn (array $c) => $c['exploite'] && $c['statut'] === PageContent::STATUS_PUBLISHED));
        $couverture = [
            'dureeTotaleMinutes' => $duree,
            'coursExploitables' => \count($exploites),
            'coursTotal' => \count($inventaire),
            'coursCites' => \count($cites),
            'coursNonCites' => array_values(array_map(static fn (array $c) => ['id' => $c['id'], 'titre' => $c['titre']], array_filter($exploites, static fn (array $c) => !isset($cites[$c['id']])))),
            'coursAbsents' => array_values(array_map(static fn (array $c) => ['id' => $c['id'], 'titre' => $c['titre'], 'statut' => $c['statut']], array_filter($inventaire, static fn (array $c) => !$c['exploite'] || $c['statut'] !== PageContent::STATUS_PUBLISHED))),
        ];

        return ['controles' => $controles, 'couverture' => $couverture];
    }

    /**
     * @return list<string>
     */
    public static function idsParties(?array $scenario): array
    {
        return array_values(array_map(static fn (array $p) => (string) $p['id'], \is_array($scenario['parties'] ?? null) ? $scenario['parties'] : []));
    }

    /**
     * @param list<array{champ: string, message: string}> $erreurs
     * @return list<int>
     */
    private static function entiers(mixed $valeur, string $champ, int $max, array &$erreurs): array
    {
        if (!\is_array($valeur) || !array_is_list($valeur) || \count($valeur) > $max || array_filter($valeur, static fn ($v) => !\is_int($v) || $v < 1) !== []) {
            $erreurs[] = ['champ' => $champ, 'message' => sprintf('Liste de %d identifiants de cours au plus.', $max)];

            return [];
        }

        return array_values(array_unique($valeur));
    }

    /**
     * @param list<array{champ: string, message: string}> $erreurs
     * @return list<string>
     */
    private static function textes(mixed $valeur, string $champ, array &$erreurs): array
    {
        if (!\is_array($valeur) || !array_is_list($valeur) || \count($valeur) > self::MAX_LISTE) {
            $erreurs[] = ['champ' => $champ, 'message' => sprintf('Liste de %d textes au plus.', self::MAX_LISTE)];

            return [];
        }
        $textes = [];
        foreach ($valeur as $i => $v) {
            $t = DiaporamaBrief::texte($v, "{$champ}[$i]", 120, true, $erreurs);
            if ($t !== null) {
                $textes[] = $t;
            }
        }

        return $textes;
    }

    /**
     * @return array{code: string, regle: ?string, niveau: string, message: string}
     */
    private static function controle(string $code, ?string $regle, string $niveau, string $message): array
    {
        return ['code' => $code, 'regle' => $regle, 'niveau' => $niveau, 'message' => $message];
    }
}
