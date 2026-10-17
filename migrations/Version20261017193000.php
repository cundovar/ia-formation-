<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261017193000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Lie les codes et jetons OAuth à une ressource MCP et à sa portée';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE oauth_authorization_code ADD resource VARCHAR(500) NOT NULL DEFAULT '/mcp', ADD scope VARCHAR(64) NOT NULL DEFAULT 'redaction'");
        $this->addSql("ALTER TABLE oauth_grant ADD resource VARCHAR(500) NOT NULL DEFAULT '/mcp', ADD scope VARCHAR(64) NOT NULL DEFAULT 'redaction'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE oauth_authorization_code DROP resource, DROP scope');
        $this->addSql('ALTER TABLE oauth_grant DROP resource, DROP scope');
    }
}
