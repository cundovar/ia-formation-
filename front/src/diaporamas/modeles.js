// Modèles de diapositive (docs/PLAN_DIAPORAMAS.md § 4). Le contrôle côté serveur (DiaporamaChecker)
// reprendra les mêmes champs ; garder les deux listes alignées.
export const MODELES = {
  titre: { usage: 'première diapositive', champs: ['titre', 'sousTitre', 'public', 'duree'] },
  objectifs: { usage: 'ce que l\'on saura faire', champs: ['titre', 'points'], points: [2, 4] },
  notion: { usage: 'une idée, une définition', champs: ['titre', 'points'], points: [1, 4] },
  etapes: { usage: 'une démarche', champs: ['titre', 'points'], points: [2, 6] },
  comparaison: { usage: 'deux colonnes', champs: ['titre', 'colonnes'] },
  capture: { usage: 'montrer l\'outil', champs: ['titre', 'capture', 'points'], points: [0, 2] },
  exercice: { usage: 'faire pratiquer', champs: ['titre', 'consigne', 'duree', 'points'], points: [0, 4] },
  question: { usage: 'question de QCM ou de discussion', champs: ['titre', 'question', 'reponses'] },
  a_retenir: { usage: 'synthèse', champs: ['titre', 'points'], points: [2, 5] },
  fin: { usage: 'clôture', champs: ['titre', 'lien', 'sources', 'date'] },
}

export const estModeleConnu = (modele) => Object.hasOwn(MODELES, modele)
