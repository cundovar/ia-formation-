import { defineStore } from 'pinia'
import { BLOCS, trouverBloc } from '@/laboratoires/blocs'
import { evaluerCriteres } from '@/laboratoires/moteur/criteres'
import { creerExecution, estTerminee, etapeSuivante, executerTout } from '@/laboratoires/moteur/execution'
import { normaliser, valider } from '@/laboratoires/moteur/workflow'

// Séance d'un laboratoire : rien n'est persisté (LAB-07), tout disparaît en quittant la page
let minuteur = null

const arreterMinuteur = () => {
  clearTimeout(minuteur)
  minuteur = null
}

export const useLaboratoireStore = defineStore('laboratoire', {
  state: () => ({
    lab: null,
    workflow: { noeuds: [], liens: [] },
    jeuId: null,
    execution: null,
    lecture: false,
    vitesse: 1200,
    verification: null,
    indicesAffiches: 0,
    correctionAffichee: false,
  }),

  getters: {
    jeu: (state) => state.lab?.jeuxDeDonnees.find((jeu) => jeu.id === state.jeuId) ?? null,
    options: (state) => ({ blocsDisponibles: state.lab?.blocsDisponibles ?? null }),
    erreursValidation() {
      return this.lab ? valider(this.workflow, this.options) : []
    },
    verrouille: (state) => (noeudId) => (state.lab?.verrous?.noeuds ?? []).includes(noeudId),
    terminee: (state) => Boolean(state.execution && estTerminee(state.execution)),
    // Bloc qui s'exécutera à la prochaine étape
    prochainNoeud: (state) => {
      const execution = state.execution
      if (!execution || estTerminee(execution)) return null
      return execution.ordre[execution.index] ?? null
    },
    // Types que l'apprenant peut ajouter (un seul déclencheur par workflow)
    blocsAjoutables(state) {
      const types = state.lab?.blocsDisponibles ?? []
      const aDeclencheur = state.workflow.noeuds.some((noeud) => noeud.type === 'declencheur')
      return types.filter((type) => !(type === 'declencheur' && aDeclencheur)).map((type) => BLOCS[type]).filter(Boolean)
    },
  },

  actions: {
    charger(lab) {
      arreterMinuteur()
      this.$reset()
      this.lab = lab
      this.workflow = normaliser(lab.workflowInitial)
      this.jeuId = lab.jeuxDeDonnees[0]?.id ?? null
    },

    quitter() {
      arreterMinuteur()
      this.$reset()
    },

    // Toute modification du workflow annule l'exécution et la vérification en cours
    apresModification() {
      this.pause()
      this.execution = null
      this.verification = null
    },

    ajouterBloc(type) {
      const bloc = trouverBloc(type)
      if (!bloc || !this.lab?.blocsDisponibles.includes(type)) return null
      let numero = 1
      while (this.workflow.noeuds.some((noeud) => noeud.id === `${type}-${numero}`)) numero += 1
      const id = `${type}-${numero}`
      const derniere = this.workflow.noeuds.at(-1)?.position ?? { x: -260, y: 0 }
      this.workflow.noeuds.push({ id, type, libelle: '', config: bloc.configParDefaut(), position: { x: derniere.x + 260, y: derniere.y } })
      this.apresModification()
      return id
    },

    supprimerBloc(noeudId) {
      if (this.verrouille(noeudId)) return
      this.workflow.noeuds = this.workflow.noeuds.filter((noeud) => noeud.id !== noeudId)
      this.workflow.liens = this.workflow.liens.filter((lien) => lien.source !== noeudId && lien.cible !== noeudId)
      this.apresModification()
    },

    configurer(noeudId, champ, valeur) {
      const noeud = this.workflow.noeuds.find((candidat) => candidat.id === noeudId)
      if (!noeud || this.verrouille(noeudId)) return
      noeud.config = { ...noeud.config, [champ]: valeur }
      this.apresModification()
    },

    renommer(noeudId, libelle) {
      const noeud = this.workflow.noeuds.find((candidat) => candidat.id === noeudId)
      if (!noeud || this.verrouille(noeudId)) return
      noeud.libelle = libelle
    },

    relier(source, sortie, cible) {
      if (!source || !cible || source === cible) return null
      if (this.workflow.liens.some((lien) => lien.source === source && lien.sortie === sortie && lien.cible === cible)) return null
      let numero = this.workflow.liens.length + 1
      while (this.workflow.liens.some((lien) => lien.id === `lien-${numero}`)) numero += 1
      const id = `lien-${numero}`
      this.workflow.liens.push({ id, source, sortie, cible })
      this.apresModification()
      return id
    },

    delier(lienId) {
      this.workflow.liens = this.workflow.liens.filter((lien) => lien.id !== lienId)
      this.apresModification()
    },

    choisirJeu(jeuId) {
      if (!this.lab?.jeuxDeDonnees.some((jeu) => jeu.id === jeuId)) return
      this.jeuId = jeuId
      this.reinitialiser()
    },

    nouvelleExecution() {
      return creerExecution(this.workflow, this.jeu, this.options)
    },

    async pas() {
      if (!this.execution || estTerminee(this.execution)) {
        this.execution = this.nouvelleExecution()
        if (this.execution.statut === 'invalide') return this.execution
      }
      this.execution = await etapeSuivante(this.execution)
      return this.execution
    },

    lire() {
      if (this.lecture) return
      if (this.execution && estTerminee(this.execution)) this.execution = null
      this.lecture = true
      const avancer = async () => {
        if (!this.lecture) return
        await this.pas()
        if (estTerminee(this.execution)) {
          this.lecture = false
          return
        }
        minuteur = setTimeout(avancer, this.vitesse)
      }
      avancer()
    },

    pause() {
      this.lecture = false
      arreterMinuteur()
    },

    async toutExecuter() {
      this.pause()
      this.execution = await executerTout(this.workflow, this.jeu, this.options)
    },

    reinitialiser() {
      this.pause()
      this.execution = null
    },

    async verifier() {
      this.pause()
      this.verification = await evaluerCriteres(this.lab, this.workflow)
      return this.verification
    },

    afficherIndice() {
      this.indicesAffiches = Math.min(this.indicesAffiches + 1, this.lab?.indices.length ?? 0)
    },

    afficherCorrection() {
      this.correctionAffichee = true
    },

    chargerCorrection() {
      this.workflow = normaliser(this.lab.correction.workflow)
      this.correctionAffichee = true
      this.apresModification()
    },

    restaurerInitial() {
      this.workflow = normaliser(this.lab.workflowInitial)
      this.apresModification()
    },
  },
})
