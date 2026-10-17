import { cloner } from '../moteur/cloner.js'
import { ErreurExecution } from '../moteur/erreurs.js'
import { cheminsDuGabarit, ecrireChemin, remplirGabarit, verifierChemin } from '../moteur/expressions.js'
import { analyserUrl, decrireStatut, METHODES, repondre } from '../simulateurs/apiFictive.js'

const lireCorps = (texte) => {
  if (!String(texte ?? '').trim()) return { valeur: null }
  try {
    return { valeur: JSON.parse(texte) }
  } catch {
    return { erreur: 'Le corps de la requête n\'est pas un JSON valide.' }
  }
}

export default {
  type: 'api',
  libelle: 'API',
  description: 'Envoie une requête HTTP à une API fictive et range sa réponse (code de statut et corps JSON). Une réponse 404 ou 500 n\'arrête pas le workflow : à vous de la tester.',
  icone: 'fas fa-globe',
  couleur: 'sky',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'methode', libelle: 'Méthode', type: 'selection', options: METHODES.map((methode) => ({ valeur: methode, libelle: methode === 'GET' ? 'GET (lire)' : 'POST (envoyer)' })) },
    { nom: 'url', libelle: 'Adresse', type: 'texte', aide: 'Pour reprendre une donnée : https://meteo.exemple.test/previsions?ville={{demande.ville}}' },
    { nom: 'corps', libelle: 'Corps de la requête (JSON)', type: 'zone', visibleSi: (config) => config.methode === 'POST' },
    { nom: 'champ', libelle: 'Où ranger la réponse (chemin)', type: 'texte', aide: 'Par exemple « reponse » : vous lirez ensuite reponse.statut et reponse.corps.' },
  ],
  configParDefaut: () => ({ methode: 'GET', url: 'https://', corps: '', champ: 'reponse' }),
  resumer: (config) => `${config.methode} ${config.url || '?'} → « ${config.champ || '?'} »`,
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.champ)]
    if (!METHODES.includes(config.methode)) erreurs.push('Choisissez une méthode.')
    // L'adresse est vérifiée sans ses {{…}}, remplacés par une valeur neutre
    erreurs.push(analyserUrl(String(config.url ?? '').replace(/\{\{[^}]*\}\}/g, 'x')).erreur)
    erreurs.push(...cheminsDuGabarit(config.url).map(verifierChemin))
    if (config.methode === 'POST') erreurs.push(lireCorps(config.corps).erreur)
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config, contexte }) => {
    const analyse = analyserUrl(remplirGabarit(config.url, entree))
    if (analyse.erreur) throw new ErreurExecution('URL_INVALIDE', analyse.erreur)
    const requete = {
      methode: config.methode,
      url: remplirGabarit(config.url, entree),
      adresse: analyse.adresse,
      parametres: analyse.parametres,
      ...(config.methode === 'POST' ? { corps: lireCorps(config.corps).valeur } : {}),
    }
    const { statut, corps } = repondre(contexte.simulateurs?.api ?? [], requete)
    const echange = { requete: { methode: requete.methode, url: requete.url, ...(requete.corps !== undefined ? { corps: requete.corps } : {}) }, statut, corps: cloner(corps) }
    const reussie = statut >= 200 && statut < 300
    return {
      donnees: ecrireChemin(entree, config.champ, echange),
      explication: `Requête ${requete.methode} vers ${requete.url}. L'API fictive répond ${decrireStatut(statut)}${reussie ? '' : ' : la demande n\'a pas abouti'}. La réponse est rangée dans « ${config.champ} » (${config.champ}.statut et ${config.champ}.corps).`,
    }
  },
}
