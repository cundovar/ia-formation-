<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Diaporamas de cours et de chapitre (docs/PLAN_DIAPORAMAS.md) : synthèse structurée en JSON,
 * hors de l'API publique tant qu'aucune ressource ne l'expose (étape D5).
 */
final class Version20261026120904 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Diaporamas de cours et de chapitre (diaporama)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE diaporama (id INT AUTO_INCREMENT NOT NULL, cours_id INT DEFAULT NULL, chapitre_id INT DEFAULT NULL, titre VARCHAR(255) NOT NULL, sous_titre VARCHAR(255) NOT NULL, diapositives JSON NOT NULL, status VARCHAR(20) NOT NULL, author VARCHAR(100) NOT NULL, empreinte_source VARCHAR(64) DEFAULT NULL, review_report JSON DEFAULT NULL, reviewed_by VARCHAR(100) DEFAULT NULL, reviewed_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', published_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_776658BE7ECF78B0 (cours_id), INDEX IDX_776658BE1FBEEF7B (chapitre_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE diaporama ADD CONSTRAINT FK_776658BE7ECF78B0 FOREIGN KEY (cours_id) REFERENCES appy_PageContent (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE diaporama ADD CONSTRAINT FK_776658BE1FBEEF7B FOREIGN KEY (chapitre_id) REFERENCES appy_Menus (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE diaporama DROP FOREIGN KEY FK_776658BE7ECF78B0');
        $this->addSql('ALTER TABLE diaporama DROP FOREIGN KEY FK_776658BE1FBEEF7B');
        $this->addSql('DROP TABLE diaporama');
    }
}
