import { ecrireChemin, verifierChemin } from '../moteur/expressions.js'

const lireJson = (texte) => {
  try {
    return { valeur: JSON.parse(texte) }
  } catch {
    return { erreur: 'Le contenu n\'est pas un JSON valide. Vérifiez les guillemets, les virgules et les accolades.' }
  }
}

export default {
  type: 'donnees',
  libelle: 'Données',
  description: 'Ajoute des données fictives écrites en JSON, par exemple la fiche d\'un client imaginaire.',
  icone: 'fas fa-database',
  couleur: 'sky',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'champ', libelle: 'Où ranger ces données (chemin)', type: 'texte', aide: 'Par exemple « client ».' },
    { nom: 'json', libelle: 'Données en JSON', type: 'zone', aide: 'Par exemple { "prenom": "Léa" }.' },
  ],
  configParDefaut: () => ({ champ: 'infos', json: '{ "exemple": true }' }),
  resumer: (config) => `Ajoute des données fictives dans « ${config.champ || '?'} »`,
  verifierConfig: (config) => [verifierChemin(config.champ), lireJson(config.json ?? '').erreur].filter(Boolean),
  executer: ({ entree, config }) => ({
    donnees: ecrireChemin(entree, config.champ, lireJson(config.json).valeur),
    explication: `Le bloc ajoute les données fictives dans « ${config.champ} ».`,
  }),
}
