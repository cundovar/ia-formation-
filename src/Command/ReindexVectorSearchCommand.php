<?php
declare(strict_types=1);
namespace App\Command;
use App\Service\Rag\RagIndex;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
#[AsCommand(name: 'app:rag:reindex', description: 'Réindexe les cours publiés dans le moteur vectoriel privé.')]
final class ReindexVectorSearchCommand extends Command { public function __construct(private RagIndex $index){parent::__construct();} protected function execute(InputInterface $input, OutputInterface $output): int { $count=$this->index->rebuildVectors(); $output->writeln(sprintf('%d cours vectorisés.', $count)); return Command::SUCCESS; } }
