<?php

declare(strict_types=1);

namespace App\Mcp;

use App\Entity\User;
use App\Service\Learner\LearnerContentService;
use Mcp\Schema\Content\TextContent;
use Mcp\Schema\Result\CallToolResult;
use Mcp\Schema\Tool;
use Mcp\Schema\ToolAnnotations;
use Mcp\Server;
use Mcp\Server\Session\FileSessionStore;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** Lecture du catalogue propre au compte apprenant autorisant le connecteur. */
final class LearnerMcpServer
{
    public const NAME = 'formation-ia-apprenant';
    public const VERSION = '0.1.0';

    public function __construct(
        private LearnerContentService $content,
        private LoggerInterface $logger,
        #[Autowire('%kernel.project_dir%/var/mcp-sessions')] private string $sessionDir,
    ) {}

    public function build(User $learner): Server
    {
        $builder = Server::builder()
            ->setServerInfo(self::NAME, self::VERSION, 'Retrouver les cours publiés accessibles à la personne connectée.')
            ->setInstructions("Assistant apprenant de Formation IA. Utilisez les cours publiés accessibles au seul compte qui vous a autorisé. Ne demandez ni adresse e-mail ni données personnelles. Les résultats de recherche sont indicatifs : lisez le cours avant de le résumer.")
            ->setSession(new FileSessionStore($this->sessionDir))
            ->setLogger($this->logger);
        $readOnly = new ToolAnnotations(readOnlyHint: true, openWorldHint: false);

        $builder->add(
            new Tool('lister_parcours', 'Lister les parcours accessibles', self::schema([
                'public' => ['type' => 'string', 'enum' => ['apprendre', 'former']],
            ]), 'Parcours visibles pour ce compte, publics ou attribués à la personne.', $readOnly),
            new CallbackTool(fn (array $args) => self::result($this->content->parcours($learner, isset($args['public']) ? (string) $args['public'] : null))),
        );
        $builder->add(
            new Tool('rechercher_cours', 'Rechercher des passages cités', self::schema([
                'recherche' => ['type' => 'string', 'minLength' => 2, 'maxLength' => 120],
            ], ['recherche']), 'Recherche dans les passages des cours publiés accessibles à la personne. Chaque résultat contient une citation à utiliser dans la réponse. Renvoie au plus dix résultats.', $readOnly),
            new CallbackTool(fn (array $args) => self::result($this->content->rechercher($learner, (string) $args['recherche']))),
        );
        $builder->add(
            new Tool('lire_cours', 'Lire un cours accessible', self::schema([
                'id' => ['type' => 'integer', 'minimum' => 1],
            ], ['id']), 'Lit un cours publié accessible à la personne. Un cours absent, non publié ou attribué à quelqu’un d’autre reste introuvable.', $readOnly),
            new CallbackTool(fn (array $args) => self::result($this->content->course($learner, (int) $args['id']) ?? ['erreur' => 'Cours introuvable.'])),
        );

        return $builder->build();
    }

    /** @param array<string, mixed> $properties @param list<string> $required */
    private static function schema(array $properties, array $required = []): array
    {
        return ['type' => 'object', 'properties' => $properties, 'required' => $required, 'additionalProperties' => false];
    }

    private static function result(mixed $value): CallToolResult
    {
        return new CallToolResult([new TextContent((string) json_encode($value, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES))]);
    }
}
