<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261017200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Index local de passages pour la recherche RAG des cours publiés';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE rag_passage (id INT AUTO_INCREMENT NOT NULL, page_content_id INT NOT NULL, position INT NOT NULL, content LONGTEXT NOT NULL, checksum VARCHAR(64) NOT NULL, INDEX IDX_RAG_PASSAGE_COURSE (page_content_id), UNIQUE INDEX uniq_rag_course_position (page_content_id, position), FULLTEXT INDEX rag_passage_content_fulltext (content), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE rag_passage ADD CONSTRAINT FK_RAG_PASSAGE_COURSE FOREIGN KEY (page_content_id) REFERENCES appy_PageContent (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE rag_passage');
    }
}
