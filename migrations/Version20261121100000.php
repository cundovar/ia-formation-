<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Diaporamas de parcours, thème choisi par identifiant, objectif et cours sources
 * (docs/PLAN_DIAPORAMAS.md § 13). Les diaporamas existants gardent le thème « standard ».
 */
final class Version20261121100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Diaporama : cible parcours, thème, objectif et cours sources';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE diaporama ADD parcours_id INT DEFAULT NULL, ADD theme VARCHAR(30) DEFAULT \'standard\' NOT NULL, ADD objectif VARCHAR(255) DEFAULT NULL, ADD cours_sources JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE diaporama ADD CONSTRAINT FK_776658BE6E38C0DB FOREIGN KEY (parcours_id) REFERENCES appy_Category (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_776658BE6E38C0DB ON diaporama (parcours_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE diaporama DROP FOREIGN KEY FK_776658BE6E38C0DB');
        $this->addSql('DROP INDEX IDX_776658BE6E38C0DB ON diaporama');
        $this->addSql('ALTER TABLE diaporama DROP parcours_id, DROP theme, DROP objectif, DROP cours_sources');
    }
}
