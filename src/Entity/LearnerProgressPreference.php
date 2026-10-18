<?php
declare(strict_types=1);
namespace App\Entity;
use Doctrine\ORM\Mapping as ORM;
#[ORM\Entity]
#[ORM\Table(name: 'learner_progress_preference')]
#[ORM\UniqueConstraint(name: 'UNIQ_LEARNER_PROGRESS_USER', columns: ['user_id'])]
class LearnerProgressPreference {
 #[ORM\Id] #[ORM\GeneratedValue] #[ORM\Column] private ?int $id=null;
 #[ORM\ManyToOne] #[ORM\JoinColumn(nullable:false,onDelete:'CASCADE')] private User $user;
 #[ORM\Column] private bool $enabled=false;
 public function __construct(User $user){$this->user=$user;}
 public function isEnabled(): bool{return $this->enabled;}
 public function enable(): void{$this->enabled=true;}
 public function disable(): void{$this->enabled=false;}
 public function getUser(): User{return $this->user;}
}
