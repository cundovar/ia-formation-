import { cloner } from '../moteur/cloner.js'
export default {
  type: 'declencheur',
  libelle: 'Déclencheur',
  description: "Démarre l'automatisation quand un événement se produit, par exemple un message qui arrive.",
  icone: 'fas fa-bolt',
  couleur: 'amber',
  entrees: [],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'evenement', libelle: "Événement qui démarre l'automatisation", type: 'texte' },
  ],
  configParDefaut: () => ({ evenement: 'Un message arrive' }),
  verifierConfig: () => [],
  resumer: (config) => config.evenement || 'Événement non décrit',
  executer: ({ config, contexte }) => ({
    donnees: cloner(contexte.jeu?.donnees ?? {}),
    explication: `L'événement « ${config.evenement || 'sans nom'} » se produit. Le déclencheur transmet les données reçues (${contexte.jeu?.libelle ?? 'jeu de données'}) au bloc suivant.`,
  }),
}
