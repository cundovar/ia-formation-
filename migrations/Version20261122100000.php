<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Brief, scénario pédagogique et dernier contrôle de rendu d'un diaporama (docs/PLAN_DIAPORAMAS.md § 14).
 * Trois colonnes facultatives : les diaporamas existants restent valides.
 */
final class Version20261122100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Diaporama : brief, scénario et contrôle de rendu';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE diaporama ADD brief JSON DEFAULT NULL, ADD scenario JSON DEFAULT NULL, ADD controle_rendu JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE diaporama DROP brief, DROP scenario, DROP controle_rendu');
    }
}
