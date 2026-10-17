<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Rang des grandes rubriques (SuperMenu) sur l'accueil et dans le menu ; sans rang, elles sont rangées par nom.
 */
final class Version20261017090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rang des rubriques (appy_SuperMenu.ordre)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `appy_SuperMenu` ADD ordre INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `appy_SuperMenu` DROP ordre');
    }
}
