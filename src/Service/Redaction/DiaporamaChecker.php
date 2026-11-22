<?php

declare(strict_types=1);

namespace App\Service\Redaction;

use App\Domain\CourseMedia\Repository\CourseMediaRepositoryInterface;
use App\Entity\Diaporama;

/**
 * Contrôles automatiques d'un diaporama (regles/controles.md, regles/08-diaporamas.md).
 * Ils couvrent la structure, le thème, les scènes (catalogue regles/scenes/catalogue.json), la couverture
 * d'un parcours, la copie du cours et les données personnelles. Ils tournent à l'enregistrement, sans
 * navigateur ; les débordements réels se vérifient dans l'aperçu (« Vérifier toutes les diapositives »).
 * La qualité de la synthèse et la pertinence d'une scène relèvent de la relecture par un autre connecteur.
 */
final class DiaporamaChecker
{
    // Nombre de diapositives par cible (DIA-01)
    public const NOMBRE = [Diaporama::TARGET_COURSE => [6, 12], Diaporama::TARGET_CHAPTER => [10, 20], Diaporama::TARGET_PATH => [12, 26]];
    public const MAX_TITLE_LENGTH = 60;
    public const MAX_OBJECTIF_LENGTH = 160;
    public const MAX_PARTIE_LENGTH = 48;
    // DIA-07 : une scène par tranche de trois diapositives au plus
    public const DIAPOSITIVES_PAR_SCENE = 3;
    public const MAX_POINTS = 5;
    public const MAX_POINT_WORDS = 12;
    public const NOTES_LENGTH = [300, 900];
    // DIA-02 : aucun passage de plus de 8 mots repris à l'identique
    public const COPY_WORDS = 9;

    // DIA-13 : au-delà, la suite de diapositives paraît répétitive
    public const MEME_MODELE_CONSECUTIF = 3;
    public const PART_MAX_MODELE = 0.5;
    // Modèles qui ne portent pas de contenu (ouverture, clôture, séparation) : hors du calcul de variété
    private const HORS_VARIETE = ['titre', 'fin', 'separateur'];
    private const PRATIQUE = ['exercice', 'question'];

    public function __construct(
        private CourseMediaRepositoryInterface $captures,
        private DiaporamaSource $source = new DiaporamaSource(),
        private PersonalDataChecker $personalData = new PersonalDataChecker(),
        private ?SceneValidator $scenes = null,
        private ?ModeleCatalogue $modeles = null,
    ) {
        $this->scenes ??= new SceneValidator(new SceneCatalogue(\dirname(__DIR__, 3).'/regles/scenes/catalogue.json'));
        $this->modeles ??= ModeleCatalogue::parDefaut();
    }

    public function modeles(): ModeleCatalogue
    {
        \assert($this->modeles !== null);

        return $this->modeles;
    }

    /**
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    public function check(Diaporama $diaporama): array
    {
        $issues = [];
        $cible = $diaporama->getTypeCible();
        $diapositives = $diaporama->getDiapositives();

        if ($cible === null) {
            $issues[] = $this->issue('DIAPO_CIBLE', null, DraftChecker::BLOCKING, 'Le diaporama vise un cours, un chapitre ou un parcours, et un seul.');
        }
        if (!\in_array($diaporama->getTheme(), Diaporama::THEMES, true)) {
            $issues[] = $this->issue('DIAPO_THEME_INCONNU', 'DIA-05', DraftChecker::BLOCKING, sprintf('Thème inconnu « %s ». Thèmes du site : %s.', $diaporama->getTheme(), implode(', ', Diaporama::THEMES)));
        }
        if (mb_strlen((string) $diaporama->getObjectif()) > self::MAX_OBJECTIF_LENGTH) {
            $issues[] = $this->issue('DIAPO_OBJECTIF_LONG', 'DIA-01', DraftChecker::BLOCKING, sprintf('L\'objectif dépasse %d caractères.', self::MAX_OBJECTIF_LENGTH));
        }
        if ($cible === Diaporama::TARGET_PATH) {
            $inventaire = $this->source->inventaire($diaporama);
            $exploites = \count(array_filter($inventaire, static fn (array $c) => $c['exploite']));
            if ($exploites === 0) {
                $issues[] = $this->issue('DIAPO_PARCOURS_VIDE', 'DIA-10', DraftChecker::BLOCKING, 'Le parcours n\'a encore aucun cours publié : il n\'y a rien à synthétiser.');
            } elseif ($exploites < \count($inventaire)) {
                $issues[] = $this->issue('DIAPO_COUVERTURE_PARTIELLE', 'DIA-10', DraftChecker::WARNING, sprintf('Le diaporama s\'appuie sur %d cours publiés sur %d : annoncez cette couverture sur l\'ouverture ou la fin, sans présenter les cours non rédigés comme acquis.', $exploites, \count($inventaire)));
            }
        }
        if (trim($diaporama->getTitre()) === '') {
            $issues[] = $this->issue('DIAPO_TITRE_MANQUANT', 'DIA-05', DraftChecker::BLOCKING, 'Le diaporama n\'a pas de titre.');
        }
        if ($cible !== null) {
            [$min, $max] = self::NOMBRE[$cible];
            if (\count($diapositives) < $min || \count($diapositives) > $max) {
                $issues[] = $this->issue('DIAPO_NOMBRE', 'DIA-01', DraftChecker::BLOCKING, sprintf('Un diaporama de %s compte de %d à %d diapositives (%d actuellement).', $cible, $min, $max, \count($diapositives)));
            }
        }
        $nonPublies = $this->source->coursNonPublies($diaporama);
        if ($nonPublies !== []) {
            $issues[] = $this->issue('DIAPO_CHAPITRE_INCOMPLET', null, DraftChecker::BLOCKING, sprintf('Le diaporama d\'un chapitre attend que tous ses cours soient publiés. Pas encore publiés : %s.', implode(', ', $nonPublies)));
        }

        $v3 = $diaporama->getTheme() === Diaporama::THEME_ATELIER_VISUEL_V3;
        $parties = $v3 ? DiaporamaScenario::idsParties($diaporama->getScenario()) : [];
        if (\count($parties) > DiaporamaV3::MAX_PARTIES) {
            $issues[] = $this->issue('DIAPO_V3_PARTIES', 'DIA-15', DraftChecker::BLOCKING, sprintf('Atelier visuel v3 accepte %d parties au plus.', DiaporamaV3::MAX_PARTIES));
        }
        $coursV3 = [];
        if ($v3) {
            foreach ($this->source->coursExploites($diaporama) as $cours) {
                if ($cours->getId() !== null) {
                    $coursV3[$cours->getId()] = DiaporamaSource::texteDuCours($cours);
                }
            }
        }

        $sourceShingles = $this->shingles($this->source->texte($diaporama));
        $last = \count($diapositives) - 1;
        $dernierePartie = -1;
        foreach ($diapositives as $index => $diapo) {
            $numero = $index + 1;
            array_push($issues, ...$this->checkSlide($diapo, $numero, $index === 0 || $index === $last, $sourceShingles, $v3));
            if ($v3 && \is_array($diapo)) {
                $partie = array_search($diapo['scenarioPartie'] ?? null, $parties, true);
                if ($partie === false) {
                    $issues[] = $this->issue('DIAPO_V3_PARTIE', 'DIA-15', DraftChecker::BLOCKING, sprintf('Diapositive %d : scenarioPartie doit désigner une partie du scénario.', $numero));
                } elseif ($partie < $dernierePartie) {
                    $issues[] = $this->issue('DIAPO_V3_ORDRE_PARTIES', 'DIA-15', DraftChecker::BLOCKING, sprintf('Diapositive %d : respectez l’ordre des parties du scénario.', $numero));
                } else {
                    $dernierePartie = $partie;
                }
                foreach (DiaporamaV3::verifier($diapo, $coursV3) as $champ => $message) {
                    $issues[] = $this->issue('DIAPO_V3_CHAMP', 'DIA-15', DraftChecker::BLOCKING, sprintf('Diapositive %d : %s — %s', $numero, $champ, $message));
                }
                array_push($issues, ...$this->checkPersonalData($diapo, sprintf('Diapositive %d : ', $numero)));
            }
        }
        $avecScene = \count(array_filter($diapositives, static fn ($d) => \is_array($d) && isset($d['scene'])));
        if ($avecScene > max(1, intdiv(\count($diapositives), self::DIAPOSITIVES_PAR_SCENE))) {
            $issues[] = $this->issue('DIAPO_SCENES_NOMBREUSES', 'DIA-07', DraftChecker::WARNING, sprintf('%d scènes pour %d diapositives : gardez une scène pour les idées où le mouvement aide vraiment (une pour %d diapositives au plus).', $avecScene, \count($diapositives), self::DIAPOSITIVES_PAR_SCENE));
        }

        if ($cible === Diaporama::TARGET_COURSE && $diaporama->getCours()?->getCategory()?->getAudience() === 'apprendre'
            && array_filter($diapositives, static fn ($d) => \is_array($d) && \in_array($d['modele'] ?? null, self::PRATIQUE, true)) === []) {
            $issues[] = $this->issue('DIAPO_SANS_PRATIQUE', 'DIA-04', DraftChecker::WARNING, 'Ajoutez une diapositive « exercice » ou « question » : le cours fait pratiquer.');
        }
        array_push($issues, ...$this->checkPreparation($diaporama));
        if ($this->source->estPerime($diaporama)) {
            $issues[] = $this->issue('DIAPO_SOURCE_PERIMEE', null, DraftChecker::WARNING, 'Le cours a changé depuis la synthèse : relisez le diaporama et mettez-le à jour.');
        }

        $textes = [$diaporama->getTitre(), $diaporama->getSousTitre()];
        array_push($issues, ...$this->checkPersonalData($v3 ? $textes : [...$textes, ...$diapositives]));

        return $issues;
    }

    /**
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkPersonalData(array $contenu, string $prefixe = ''): array
    {
        $textes = [];
        array_walk_recursive($contenu, static function ($valeur) use (&$textes) {
            if (\is_string($valeur)) {
                $textes[] = $valeur;
            }
        });

        return array_map(
            fn (array $constat) => $this->issue($constat[0], 'DON-04', DraftChecker::BLOCKING, $prefixe.$constat[1]),
            $this->personalData->find(implode("\n", $textes)),
        );
    }

    /**
     * Brief, scénario, variété des compositions, visuels et dernier contrôle de rendu (DIA-11 à DIA-13).
     * Un diaporama sans brief ni scénario (créé avant le 21 novembre 2026) reste valide : avertissements seulement.
     *
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkPreparation(Diaporama $diaporama): array
    {
        $issues = [];
        $diapositives = array_values(array_filter($diaporama->getDiapositives(), 'is_array'));
        $brief = $diaporama->getBrief();
        if ($brief === null) {
            $issues[] = $this->issue('DIAPO_BRIEF_MANQUANT', 'DIA-11', DraftChecker::WARNING, 'Aucun brief : proposez public, durée, objectif, contexte, thème et intention à la personne (briefPropose de preparer_diaporama), puis enregistrez-le avec modifier_diaporama.');
        } elseif (($brief['statut'] ?? null) !== 'confirme') {
            $issues[] = $this->issue('DIAPO_BRIEF_NON_CONFIRME', 'DIA-11', DraftChecker::WARNING, 'Le brief est encore « propose » : faites-le confirmer ou corriger par la personne.');
        }

        $scenario = $diaporama->getScenario();
        if ($scenario === null) {
            $issues[] = $this->issue('DIAPO_SCENARIO_MANQUANT', 'DIA-11', DraftChecker::WARNING, 'Aucun scénario : proposez-le (verifier_scenario_diaporama), faites-le valider, puis enregistrez-le.');
        } else {
            $analyse = DiaporamaScenario::analyser($scenario, $this->source->inventaire($diaporama), fn (int $id) => $this->captures->findById($id) !== null, $brief);
            array_push($issues, ...$analyse['controles']);
            $ids = DiaporamaScenario::idsParties($scenario);
            $utilises = [];
            foreach ($diapositives as $i => $diapo) {
                $partie = $diapo['scenarioPartie'] ?? null;
                if ($diaporama->getTheme() !== Diaporama::THEME_ATELIER_VISUEL_V3 && \is_string($partie) && !\in_array($partie, $ids, true)) {
                    $issues[] = $this->issue('DIAPO_SCENARIO_PARTIE_INCONNUE', 'DIA-11', DraftChecker::BLOCKING, sprintf('Diapositive %d : la partie « %s » n\'existe pas dans le scénario (%s).', $i + 1, $partie, implode(', ', $ids)));
                }
                if (\is_string($partie)) {
                    $utilises[$partie] = true;
                }
            }
            foreach ($scenario['parties'] as $partie) {
                if (!isset($utilises[$partie['id']])) {
                    $issues[] = $this->issue('DIAPO_SCENARIO_PARTIE_VIDE', 'DIA-11', DraftChecker::WARNING, sprintf('La partie « %s » du scénario n\'a aucune diapositive (champ scenarioPartie).', $partie['titre']));
                }
            }
        }

        // DIA-13 : variété des compositions sur les diapositives de contenu
        $modeles = array_values(array_filter(array_map(static fn (array $d) => $d['modele'] ?? null, $diapositives), static fn ($m) => \is_string($m) && !\in_array($m, self::HORS_VARIETE, true)));
        $suite = 1;
        $signale = false;
        foreach ($modeles as $i => $modele) {
            $suite = $i > 0 && $modeles[$i - 1] === $modele ? $suite + 1 : 1;
            if ($suite > self::MEME_MODELE_CONSECUTIF && !$signale) {
                $issues[] = $this->issue('DIAPO_COMPOSITIONS_REPETITIVES', 'DIA-13', DraftChecker::WARNING, sprintf('Plus de %d diapositives de contenu « %s » à la suite : variez les compositions (exemple commenté, avant / après, démonstration, étude de cas…).', self::MEME_MODELE_CONSECUTIF, $modele));
                $signale = true;
            }
        }
        $compte = array_count_values($modeles);
        arsort($compte);
        $dominant = array_key_first($compte);
        if (!$signale && \count($modeles) >= 6 && $dominant !== null && $compte[$dominant] / \count($modeles) > self::PART_MAX_MODELE) {
            $issues[] = $this->issue('DIAPO_COMPOSITIONS_REPETITIVES', 'DIA-13', DraftChecker::WARNING, sprintf('« %s » occupe %d diapositives de contenu sur %d : variez les compositions.', $dominant, $compte[$dominant], \count($modeles)));
        }

        // DIA-12 : une présentation « illustrée » montre les outils
        if (($brief['intention'] ?? null) === 'illustree' && self::capturesUtilisees($diapositives) === []) {
            $issues[] = $this->issue('DIAPO_SANS_VISUEL', 'DIA-12', DraftChecker::WARNING, 'Le brief prévoit une présentation illustrée, mais aucune capture n\'est utilisée : choisissez des visuels existants (visuels de preparer_diaporama), ou dites pourquoi aucun ne convient.');
        }

        // Contrôle de rendu mesuré dans le navigateur (aperçu) : dépend du rendu, d'où un avertissement
        $rendu = self::etatRendu($diaporama);
        $issues[] = match ($rendu['etat']) {
            'absent' => $this->issue('DIAPO_RENDU_ABSENT', 'DIA-05', DraftChecker::WARNING, 'Le rendu n\'a pas encore été contrôlé : demandez à un administrateur d\'ouvrir l\'aperçu (apercuUrl), qui mesure chaque diapositive, puis relancez verifier_diaporama.'),
            'perime' => $this->issue('DIAPO_RENDU_PERIME', 'DIA-05', DraftChecker::WARNING, 'Le dernier contrôle de rendu porte sur une version antérieure : faites rouvrir l\'aperçu pour le relancer.'),
            default => $rendu['problemes'] === []
                ? null
                : $this->issue('DIAPO_RENDU_PROBLEME', 'DIA-05', DraftChecker::WARNING, sprintf('%d problème(s) d\'affichage mesuré(s) dans l\'aperçu (voir controlesNavigateur) : raccourcissez les textes concernés ou changez de composition.', \count($rendu['problemes']))),
        };

        return array_values(array_filter($issues));
    }

    /**
     * État du dernier contrôle de rendu : absent, à jour (même contenu) ou périmé.
     *
     * @return array{etat: string, le: ?string, formats: list<string>, navigateur: ?string, problemes: list<array<string, mixed>>}
     */
    public static function etatRendu(Diaporama $diaporama): array
    {
        $rapport = $diaporama->getControleRendu();
        if ($rapport === null) {
            return ['etat' => 'absent', 'le' => null, 'formats' => [], 'navigateur' => null, 'problemes' => []];
        }

        return [
            'etat' => ($rapport['empreinte'] ?? null) === $diaporama->getEmpreinteRendu() ? 'a_jour' : 'perime',
            'le' => $rapport['le'] ?? null,
            'formats' => $rapport['formats'] ?? [],
            'navigateur' => $rapport['navigateur'] ?? null,
            'problemes' => $rapport['problemes'] ?? [],
        ];
    }

    /**
     * Identifiants des captures citées par les diapositives (capture d'une diapositive ou d'une étape).
     *
     * @param list<mixed> $diapositives
     * @return list<int>
     */
    public static function capturesUtilisees(array $diapositives): array
    {
        $ids = [];
        foreach ($diapositives as $diapo) {
            if (!\is_array($diapo)) {
                continue;
            }
            if (\is_int($diapo['capture'] ?? null)) {
                $ids[] = $diapo['capture'];
            }
            foreach (\is_array($diapo['etapes'] ?? null) ? $diapo['etapes'] : [] as $etape) {
                if (\is_array($etape) && \is_int($etape['capture'] ?? null)) {
                    $ids[] = $etape['capture'];
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param array<string, true> $sourceShingles
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkSlide(mixed $diapo, int $numero, bool $extremite, array $sourceShingles, bool $v3): array
    {
        $modele = \is_array($diapo) ? ($diapo['modele'] ?? null) : null;
        $spec = $this->modeles()->modele($modele);
        if (!$v3 && $modele === DiaporamaV3::MODELE_CHIFFRES) {
            return [$this->issue('DIAPO_MODELE_INCONNU', 'DIA-15', DraftChecker::BLOCKING, sprintf('Diapositive %d : chiffres_cles est réservé au thème Atelier visuel v3.', $numero))];
        }
        if (!\is_string($modele) || $spec === null) {
            return [$this->issue('DIAPO_MODELE_INCONNU', null, DraftChecker::BLOCKING, sprintf('Diapositive %d : modèle inconnu. Modèles possibles : %s.', $numero, implode(', ', $this->modeles()->ids())))];
        }
        $issues = [];
        $prefixe = sprintf('Diapositive %d (%s) : ', $numero, $modele);

        $titre = self::texte($diapo['titre'] ?? null);
        if ($titre === '' && empty($spec['titreFacultatif'])) {
            $issues[] = $this->issue('DIAPO_TITRE_MANQUANT', 'DIA-05', DraftChecker::BLOCKING, $prefixe.'ajoutez un titre.');
        } elseif (mb_strlen($titre) > self::MAX_TITLE_LENGTH) {
            $issues[] = $this->issue('DIAPO_TITRE_LONG', 'DIA-01', DraftChecker::BLOCKING, $prefixe.sprintf('le titre dépasse %d caractères.', self::MAX_TITLE_LENGTH));
        }

        $listes = [];
        if (isset($spec['points'])) {
            $listes['points'] = [self::listePoints($diapo['points'] ?? null, $v3), $spec['points']];
        }
        if (isset($spec['reponses'])) {
            $listes['réponses'] = [self::liste($diapo['reponses'] ?? null), $spec['reponses']];
        }
        if (isset($spec['colonnes'])) {
            $colonnes = \is_array($diapo['colonnes'] ?? null) ? array_values($diapo['colonnes']) : [];
            if (\count($colonnes) !== 2) {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.'une comparaison a exactement deux colonnes {titre, points}.');
            }
            foreach (array_slice($colonnes, 0, 2) as $i => $colonne) {
                if (self::texte(\is_array($colonne) ? ($colonne['titre'] ?? null) : null) === '') {
                    $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('la colonne %d n\'a pas de titre.', $i + 1));
                }
                $listes[sprintf('points de la colonne %d', $i + 1)] = [self::liste(\is_array($colonne) ? ($colonne['points'] ?? null) : null), [1, 4]];
            }
        }
        foreach ($listes as $nom => [$elements, [$min, $max]]) {
            if (\count($elements) > min($max, self::MAX_POINTS)) {
                $issues[] = $this->issue('DIAPO_TROP_DE_POINTS', 'DIA-01', DraftChecker::BLOCKING, $prefixe.sprintf('%d %s au plus (%d actuellement).', min($max, self::MAX_POINTS), $nom, \count($elements)));
            } elseif (\count($elements) < $min) {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('%d %s au moins (%d actuellement).', $min, $nom, \count($elements)));
            }
            foreach ($elements as $element) {
                if (self::mots($element) > self::MAX_POINT_WORDS) {
                    $issues[] = $this->issue('DIAPO_POINT_LONG', 'DIA-01', DraftChecker::WARNING, $prefixe.sprintf('« %s » dépasse %d mots : gardez le détail pour les notes.', mb_strimwidth($element, 0, 60, '…'), self::MAX_POINT_WORDS));
                }
            }
        }
        foreach ($spec['obligatoires'] ?? [] as $champ) {
            // Les objets, listes d'étapes et numéros sont contrôlés par checkComposition
            if (!isset($spec['objets'][$champ]) && $champ !== 'etapes' && $champ !== 'numero' && self::texte($diapo[$champ] ?? null) === '') {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('le champ « %s » est vide.', $champ));
            }
        }
        if (($spec['capture'] ?? null) === 'obligatoire' || (($spec['capture'] ?? null) === 'facultatif' && ($diapo['capture'] ?? null) !== null)) {
            array_push($issues, ...$this->checkCapture($diapo['capture'] ?? null, $prefixe));
        }
        array_push($issues, ...$this->checkComposition($diapo, $spec, $prefixe));
        if (!$v3 && \array_key_exists('scenarioPartie', $diapo) && (!\is_string($diapo['scenarioPartie']) || preg_match('/^[a-z0-9_-]{1,30}$/', $diapo['scenarioPartie']) !== 1)) {
            $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', 'DIA-11', DraftChecker::BLOCKING, $prefixe.'scenarioPartie est l\'identifiant d\'une partie du scénario.');
        }
        $partie = $diapo['partie'] ?? null;
        if ($partie !== null && (!\is_string($partie) || mb_strlen($partie) > self::MAX_PARTIE_LENGTH || preg_match('/<\s*\/?\s*[a-z!?]/i', $partie) === 1)) {
            $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('le repère de partie est un texte simple de %d caractères au plus.', self::MAX_PARTIE_LENGTH));
        }
        if (\array_key_exists('scene', $diapo)) {
            array_push($issues, ...$this->checkScene($diapo, $modele, $prefixe, $v3));
        }

        $notes = self::texte($diapo['notes'] ?? null);
        if (!$extremite && empty($spec['notesFacultatives']) && $notes === '') {
            $issues[] = $this->issue('DIAPO_NOTES_MANQUANTES', 'DIA-03', DraftChecker::BLOCKING, $prefixe.'ajoutez les notes de présentation : c\'est là que va le détail du cours.');
        } elseif ($notes !== '' && (mb_strlen($notes) < self::NOTES_LENGTH[0] || mb_strlen($notes) > self::NOTES_LENGTH[1])) {
            $issues[] = $this->issue('DIAPO_NOTES_LONGUEUR', 'DIA-03', DraftChecker::WARNING, $prefixe.sprintf('les notes font %d caractères ; visez de %d à %d.', mb_strlen($notes), ...self::NOTES_LENGTH));
        }

        $copie = $this->passageCopie(self::texteVisible($diapo, $v3), $sourceShingles);
        if ($copie !== null) {
            $issues[] = $this->issue('DIAPO_COPIE', 'DIA-02', DraftChecker::BLOCKING, $prefixe.sprintf('« %s… » reprend le cours mot pour mot : reformulez.', $copie));
        }

        return $issues;
    }

    /**
     * Champs des compositions décrits par le catalogue des modèles : textes limités, listes, objets « avant / après »,
     * étapes d'une démonstration, numéro d'un séparateur. Les limites garantissent que le texte tient dans le thème.
     *
     * @param array<string, mixed> $diapo
     * @param array<string, mixed> $spec
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkComposition(array $diapo, array $spec, string $prefixe): array
    {
        $issues = [];
        $obligatoires = $spec['obligatoires'] ?? [];
        $long = fn (string $champ, string $valeur, int $max) => $this->issue('DIAPO_MODELE_CHAMP_LONG', 'DIA-13', DraftChecker::BLOCKING, $prefixe.sprintf('« %s » dépasse %d caractères (%d) : il ne tiendrait pas dans la mise en page ; le détail va dans les notes.', $champ, $max, mb_strlen($valeur)));
        // Avec une capture, certains textes ont moins de place (textesAvecCapture)
        $limitesTextes = ($diapo['capture'] ?? null) !== null ? ($spec['textesAvecCapture'] ?? []) + ($spec['textes'] ?? []) : ($spec['textes'] ?? []);
        foreach ($limitesTextes as $champ => $max) {
            $valeur = self::texte($diapo[$champ] ?? null);
            if (mb_strlen($valeur) > $max) {
                $issues[] = $long($champ, $valeur, $max);
            }
        }
        foreach ($spec['listes'] ?? [] as $champ => $limites) {
            $elements = self::liste($diapo[$champ] ?? null);
            if (\count($elements) < $limites['min']) {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('%d « %s » au moins.', $limites['min'], $champ));
            } elseif (\count($elements) > $limites['max']) {
                $issues[] = $this->issue('DIAPO_TROP_DE_POINTS', 'DIA-01', DraftChecker::BLOCKING, $prefixe.sprintf('%d « %s » au plus.', $limites['max'], $champ));
            }
            foreach ($elements as $element) {
                if (mb_strlen($element) > $limites['longueur']) {
                    $issues[] = $long($champ, $element, $limites['longueur']);
                }
            }
        }
        foreach ($spec['objets'] ?? [] as $champ => $limites) {
            $objet = $diapo[$champ] ?? null;
            if (!\is_array($objet) || self::texte($objet['texte'] ?? null) === '') {
                if (\in_array($champ, $obligatoires, true)) {
                    $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('« %s » attend un objet {libelle, texte} avec un texte.', $champ));
                }
                continue;
            }
            foreach ($limites as $sous => $max) {
                $valeur = self::texte($objet[$sous] ?? null);
                if (mb_strlen($valeur) > $max) {
                    $issues[] = $long("$champ.$sous", $valeur, $max);
                }
            }
        }
        if (isset($spec['etapes'])) {
            $limites = $spec['etapes'];
            $etapes = \is_array($diapo['etapes'] ?? null) && array_is_list($diapo['etapes']) ? $diapo['etapes'] : [];
            if (\count($etapes) < $limites['min'] || \count($etapes) > $limites['max']) {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('une démonstration a de %d à %d étapes {action, capture?, verification?} (%d actuellement).', $limites['min'], $limites['max'], \count($etapes)));
            }
            foreach ($etapes as $i => $etape) {
                if (!\is_array($etape) || self::texte($etape['action'] ?? null) === '') {
                    $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('l\'étape %d n\'a pas d\'action.', $i + 1));
                    continue;
                }
                foreach ($limites['champs'] as $sous => $max) {
                    $valeur = self::texte($etape[$sous] ?? null);
                    if (mb_strlen($valeur) > $max) {
                        $issues[] = $long(sprintf('étape %d · %s', $i + 1, $sous), $valeur, $max);
                    }
                }
                if (($etape['capture'] ?? null) !== null) {
                    array_push($issues, ...$this->checkCapture($etape['capture'], $prefixe.sprintf('étape %d : ', $i + 1)));
                }
            }
        }
        if (isset($spec['numero'])) {
            [$min, $max] = $spec['numero'];
            $numero = $diapo['numero'] ?? null;
            if (!\is_int($numero) || $numero < $min || $numero > $max) {
                $issues[] = $this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.sprintf('le numéro de partie est un entier de %d à %d.', $min, $max));
            }
        }

        return $issues;
    }

    /**
     * Scène animée facultative (DIA-07 à DIA-09) : donnée du catalogue, sur un modèle qui lui laisse la place.
     *
     * @param array<string, mixed> $diapo
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkScene(array $diapo, string $modele, string $prefixe, bool $v3): array
    {
        \assert($this->scenes !== null);
        $issues = [];
        $codes = [
            'SCENE_INCONNUE' => ['DIAPO_SCENE_INCONNUE', 'DIA-08'],
            'SCENE_REFERENCE' => ['DIAPO_SCENE_REFERENCE', 'DIA-08'],
            'SCENE_LIMITE' => ['DIAPO_SCENE_LIMITE', 'DIA-08'],
        ];
        foreach ($this->scenes->valider($diapo['scene']) as $erreur) {
            [$code, $regle] = $codes[$erreur['code']] ?? ['DIAPO_SCENE_CHAMP', 'DIA-08'];
            if ($erreur['champ'] === 'scene.description') {
                [$code, $regle] = ['DIAPO_SCENE_DESCRIPTION', 'DIA-09'];
            }
            $issues[] = $this->issue($code, $regle, DraftChecker::BLOCKING, $prefixe.$erreur['message']);
        }

        $catalogue = $this->scenes->catalogue();
        if (!\in_array($modele, $catalogue->modelesAutorises(), true)) {
            $issues[] = $this->issue('DIAPO_SCENE_MODELE', 'DIA-08', DraftChecker::BLOCKING, $prefixe.sprintf('une scène se place sur une diapositive %s, pas sur « %s ».', implode(', ', $catalogue->modelesAutorises()), $modele));
        } else {
            ['pointsMax' => $pointsMax, 'longueurPointMax' => $longueurMax] = $catalogue->limitesDiapositive();
            $points = self::listePoints($diapo['points'] ?? null, $v3);
            if (\count($points) > $pointsMax) {
                $issues[] = $this->issue('DIAPO_SCENE_MODELE', 'DIA-08', DraftChecker::BLOCKING, $prefixe.sprintf('avec une scène, %d points au plus sous le schéma (%d actuellement).', $pointsMax, \count($points)));
            }
            foreach ($points as $point) {
                if (mb_strlen($point) > $longueurMax) {
                    $issues[] = $this->issue('DIAPO_SCENE_MODELE', 'DIA-08', DraftChecker::BLOCKING, $prefixe.sprintf('avec une scène, chaque point tient en %d caractères : « %s ».', $longueurMax, mb_strimwidth($point, 0, 50, '…')));
                }
            }
        }
        if (\is_array($diapo['scene']) && self::texte($diapo['scene']['justification'] ?? null) === '') {
            $issues[] = $this->issue('DIAPO_SCENE_JUSTIFICATION', 'DIA-07', DraftChecker::WARNING, $prefixe.'dites en une phrase pourquoi cette scène aide à comprendre (champ justification).');
        }

        return $issues;
    }

    /**
     * @return list<array{code: string, regle: ?string, niveau: string, message: string}>
     */
    private function checkCapture(mixed $id, string $prefixe): array
    {
        if (!\is_int($id) && !(\is_string($id) && ctype_digit($id))) {
            return [$this->issue('DIAPO_CHAMP_MANQUANT', null, DraftChecker::BLOCKING, $prefixe.'indiquez l\'identifiant de la capture (lister_captures).')];
        }
        $capture = $this->captures->findById((int) $id);
        if ($capture === null) {
            return [$this->issue('CAPTURE_INCONNUE', 'CAP-02', DraftChecker::BLOCKING, $prefixe.sprintf('la capture %d n\'existe pas.', (int) $id))];
        }
        if (trim($capture->getAltText()) === '') {
            return [$this->issue('CAPTURE_INCONNUE', 'DIA-05', DraftChecker::BLOCKING, $prefixe.sprintf('la capture %d n\'a pas de texte alternatif : complétez-la dans le back-office.', (int) $id))];
        }

        return [];
    }

    /**
     * Texte projeté d'une diapositive (sans les notes, qui peuvent reprendre le cours à l'oral).
     *
     * @param array<string, mixed> $diapo
     */
    private static function texteVisible(array $diapo, bool $v3): string
    {
        $textes = [self::texte($diapo['titre'] ?? null), self::texte($diapo['consigne'] ?? null), self::texte($diapo['question'] ?? null)];
        array_push($textes, ...self::listePoints($diapo['points'] ?? null, $v3), ...self::liste($diapo['reponses'] ?? null));
        if ($v3) {
            foreach (['centre', 'conclusion', 'libelle', 'texte'] as $champ) {
                $textes[] = self::texte($diapo[$champ] ?? null);
            }
            foreach (\is_array($diapo['points'] ?? null) ? $diapo['points'] : [] as $point) {
                if (\is_array($point)) {
                    array_push($textes, self::texte($point['titre'] ?? null), self::texte($point['aVerifier'] ?? null), self::texte($point['action'] ?? null), ...self::liste($point['liste'] ?? null));
                }
            }
        }
        foreach (\is_array($diapo['colonnes'] ?? null) ? $diapo['colonnes'] : [] as $colonne) {
            if (\is_array($colonne)) {
                array_push($textes, self::texte($colonne['titre'] ?? null), ...self::liste($colonne['points'] ?? null));
            }
        }
        // Compositions (regles/diaporamas/modeles.json)
        foreach (['exemple', 'explication', 'contexte', 'sousTitre'] as $champ) {
            $textes[] = self::texte($diapo[$champ] ?? null);
        }
        array_push($textes, ...self::liste($diapo['commentaires'] ?? null), ...self::liste($diapo['questions'] ?? null));
        foreach (['avant', 'apres'] as $champ) {
            if (\is_array($diapo[$champ] ?? null)) {
                array_push($textes, self::texte($diapo[$champ]['libelle'] ?? null), self::texte($diapo[$champ]['texte'] ?? null));
            }
        }
        foreach (\is_array($diapo['etapes'] ?? null) ? $diapo['etapes'] : [] as $etape) {
            if (\is_array($etape)) {
                array_push($textes, self::texte($etape['action'] ?? null), self::texte($etape['verification'] ?? null));
            }
        }
        // Libellés projetés d'une scène et sa description (lue par les lecteurs d'écran et imprimée)
        array_push($textes, ...array_map(self::texte(...), SceneValidator::textes($diapo['scene'] ?? null)));

        // Chaque texte est comparé séparément : un passage ne chevauche pas deux points
        return implode(' | ', array_filter($textes));
    }

    /**
     * @param array<string, true> $sourceShingles
     */
    private function passageCopie(string $texte, array $sourceShingles): ?string
    {
        foreach (explode(' | ', $texte) as $morceau) {
            $mots = self::motsNormalises($morceau);
            for ($i = 0; $i + self::COPY_WORDS <= \count($mots); ++$i) {
                $passage = implode(' ', \array_slice($mots, $i, self::COPY_WORDS));
                if (isset($sourceShingles[$passage])) {
                    return $passage;
                }
            }
        }

        return null;
    }

    /**
     * @return array<string, true>
     */
    private function shingles(string $texte): array
    {
        $mots = self::motsNormalises($texte);
        $shingles = [];
        for ($i = 0; $i + self::COPY_WORDS <= \count($mots); ++$i) {
            $shingles[implode(' ', \array_slice($mots, $i, self::COPY_WORDS))] = true;
        }

        return $shingles;
    }

    /**
     * Mots en minuscules, sans ponctuation : la comparaison ignore la casse et les signes.
     *
     * @return list<string>
     */
    private static function motsNormalises(string $texte): array
    {
        return preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($texte), -1, \PREG_SPLIT_NO_EMPTY) ?: [];
    }

    private static function mots(string $texte): int
    {
        return \count(preg_split('/\s+/u', $texte, -1, \PREG_SPLIT_NO_EMPTY) ?: []);
    }

    private static function texte(mixed $valeur): string
    {
        return \is_string($valeur) ? trim($valeur) : '';
    }

    /**
     * @return list<string>
     */
    private static function liste(mixed $valeur): array
    {
        return \is_array($valeur) ? array_values(array_filter(array_map(self::texte(...), $valeur), static fn (string $t) => $t !== '')) : [];
    }

    /** @return list<string> */
    private static function listePoints(mixed $valeur, bool $v3): array
    {
        if (!$v3 || !\is_array($valeur)) {
            return self::liste($valeur);
        }

        return array_values(array_map(static fn ($point) => self::texte(\is_array($point) ? ($point['texte'] ?? null) : $point), $valeur));
    }

    /**
     * @return array{code: string, regle: ?string, niveau: string, message: string}
     */
    private function issue(string $code, ?string $rule, string $level, string $message): array
    {
        return ['code' => $code, 'regle' => $rule, 'niveau' => $level, 'message' => $message];
    }
}
