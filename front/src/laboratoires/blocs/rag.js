import { ErreurExecution } from '../moteur/erreurs.js'
import { ecrireChemin, lireCheminObligatoire, verifierChemin } from '../moteur/expressions.js'
import { citation, rechercher, TOP_K_MAX } from '../simulateurs/rechercheFictive.js'

const entier = (valeur) => (/^\d+$/.test(String(valeur ?? '').trim()) ? Number(valeur) : NaN)
const decimal = (valeur) => (String(valeur ?? '').trim() === '' ? 0 : Number(String(valeur).replace(',', '.')))

export default {
  type: 'rag',
  libelle: 'Recherche documentaire (fictive)',
  description: 'Cherche dans les documents du laboratoire les passages les plus proches d\'une question, avec un score de 0 à 1. La recherche compare des mots : une vraie recherche documentaire est plus fine.',
  icone: 'fas fa-book-open',
  couleur: 'lime',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'question', libelle: 'Question à chercher (chemin)', type: 'texte', aide: 'Par exemple « message.texte ».' },
    { nom: 'topK', libelle: 'Nombre maximal de passages (topK)', type: 'texte', aide: `Un nombre de 1 à ${TOP_K_MAX}.` },
    { nom: 'scoreMin', libelle: 'Score minimal (de 0 à 1)', type: 'texte', aide: 'Un passage moins pertinent est écarté. 0 garde tout passage qui partage au moins un mot.' },
    { nom: 'champ', libelle: 'Où ranger les passages trouvés (chemin)', type: 'texte', aide: 'Par exemple « recherche » : vous lirez recherche.passages, recherche.sources et recherche.citations.' },
  ],
  configParDefaut: () => ({ question: '', topK: '3', scoreMin: '0', champ: 'recherche' }),
  resumer: (config) => `Cherche « ${config.question || '?'} », ${config.topK || '?'} passage(s) au plus, score ≥ ${config.scoreMin || 0}`,
  informations: (simulateurs) => (simulateurs?.documents ?? []).map((document) => `Document « ${document.titre} » (${document.source}) : ${document.passages.length} passage(s).`),
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.question), verifierChemin(config.champ)]
    const topK = entier(config.topK)
    if (!(topK >= 1 && topK <= TOP_K_MAX)) erreurs.push(`Le nombre de passages est un entier de 1 à ${TOP_K_MAX}.`)
    const scoreMin = decimal(config.scoreMin)
    if (!(scoreMin >= 0 && scoreMin <= 1)) erreurs.push('Le score minimal est un nombre entre 0 et 1, par exemple 0,5.')
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config, contexte }) => {
    const question = lireCheminObligatoire(entree, config.question)
    if (typeof question !== 'string') throw new ErreurExecution('PAS_UN_TEXTE', `« ${config.question} » n'est pas un texte : impossible de chercher.`)
    const topK = entier(config.topK)
    const scoreMin = decimal(config.scoreMin)
    const trouves = rechercher(contexte.simulateurs?.documents ?? [], question, { topK, scoreMin })
    const resultat = {
      question,
      passages: trouves,
      sources: trouves.map((passage) => passage.passage),
      citations: trouves.map(citation).join(' ; '),
    }
    const liste = trouves.map((passage) => `« ${citation(passage)} » (score ${passage.score})`).join(', ')
    return {
      donnees: ecrireChemin(entree, config.champ, resultat),
      explication: trouves.length
        ? `Recherche de « ${question} » : ${trouves.length} passage(s) retenu(s) sur ${topK} au plus : ${liste}. Ils sont rangés dans « ${config.champ} ».`
        : `Recherche de « ${question} » : ${scoreMin > 0 ? `aucun passage n'atteint le score minimal (${scoreMin})` : 'aucun passage ne partage de mot avec la question'}. « ${config.champ}.passages » est vide.`,
    }
  },
}
