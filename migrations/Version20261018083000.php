<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261018083000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Supprime les valeurs par défaut SQL des portées OAuth, définies par le domaine applicatif';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE oauth_authorization_code ALTER resource DROP DEFAULT, ALTER scope DROP DEFAULT');
        $this->addSql('ALTER TABLE oauth_grant ALTER resource DROP DEFAULT, ALTER scope DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE oauth_authorization_code ALTER resource SET DEFAULT '/mcp', ALTER scope SET DEFAULT 'redaction'");
        $this->addSql("ALTER TABLE oauth_grant ALTER resource SET DEFAULT '/mcp', ALTER scope SET DEFAULT 'redaction'");
    }
}
