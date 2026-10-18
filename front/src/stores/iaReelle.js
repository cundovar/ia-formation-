import { defineStore } from 'pinia'
import { LOGOUT_EVENT } from '@/services/auth'
import { FOURNISSEURS, repondre, trouverFournisseur } from '@/services/iaReelle'

/**
 * Mode IA réelle des laboratoires (LAB-08). La clé de l'apprenant reste en mémoire dans cette page :
 * jamais persistée, jamais envoyée au site, effacée à la déconnexion et en quittant la page.
 */
const fournisseurParDefaut = Object.values(FOURNISSEURS)[0]

export const useIaReelleStore = defineStore('iaReelle', {
  state: () => ({
    actif: false,
    fournisseur: fournisseurParDefaut?.id ?? null,
    modele: fournisseurParDefaut?.modeles[0]?.id ?? null,
    cle: '',
    test: { etat: 'inconnu', message: '' },
  }),

  getters: {
    fournisseurChoisi: (state) => trouverFournisseur(state.fournisseur),
    pret: (state) => state.actif && state.cle.trim() !== '',
    // Fonction confiée au moteur des laboratoires ; null en simulation
    agentReel() {
      if (!this.pret) return null
      const { fournisseur, modele, cle } = this
      return ({ consigne, contexte, signal }) => repondre({ fournisseur, modele, cle, consigne, contexte, signal })
    },
  },

  actions: {
    activer(actif) {
      this.actif = Boolean(actif)
    },

    choisirFournisseur(id) {
      const fournisseur = trouverFournisseur(id)
      if (!fournisseur) return
      this.fournisseur = id
      this.modele = fournisseur.modeles[0].id
      this.test = { etat: 'inconnu', message: '' }
    },

    choisirModele(id) {
      if (this.fournisseurChoisi?.modeles.some((modele) => modele.id === id)) this.modele = id
    },

    definirCle(cle) {
      this.cle = String(cle ?? '')
      this.test = { etat: 'inconnu', message: '' }
    },

    // Petite demande pour vérifier la clé : elle consomme quelques jetons sur le compte de la personne
    async tester() {
      if (!this.cle.trim()) {
        this.test = { etat: 'erreur', message: 'Saisissez d\'abord votre clé.' }
        return this.test
      }
      this.test = { etat: 'en_cours', message: 'Test en cours…' }
      try {
        const reponse = await repondre({ fournisseur: this.fournisseur, modele: this.modele, cle: this.cle, consigne: 'Réponds seulement : OK.', contexte: 'Test de connexion.' })
        this.test = { etat: 'ok', message: `La clé fonctionne (${reponse.fournisseur}, ${reponse.modele}).` }
      } catch (exception) {
        this.test = { etat: 'erreur', message: exception?.name === 'ErreurIaReelle' ? exception.message : 'Le test a échoué.' }
      }
      return this.test
    },

    oublier() {
      this.$reset()
    },
  },
})

// À la déconnexion, la clé est oubliée (comme le cache hors ligne)
if (typeof window !== 'undefined') {
  window.addEventListener(LOGOUT_EVENT, () => {
    try {
      useIaReelleStore().oublier()
    } catch {
      // Pinia pas encore actif : il n'y a pas de clé à effacer
    }
  })
}
