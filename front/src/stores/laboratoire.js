import { defineStore } from 'pinia'
import { BLOCS, trouverBloc } from '@/laboratoires/blocs'
import { evaluerCriteres } from '@/laboratoires/moteur/criteres'
import { creerExecution, estTerminee, etapeSuivante, executerTout, poursuivre, repondreValidation } from '@/laboratoires/moteur/execution'
import { normaliser, valider } from '@/laboratoires/moteur/workflow'
import { useIaReelleStore } from '@/stores/iaReelle'

// Séance d'un laboratoire : rien n'est persisté (LAB-07), tout disparaît en quittant la page
let minuteur = null

// Historique annuler / rétablir : copies du workflow, 20 au plus
const TAILLE_HISTORIQUE = 20
const copier = (workflow) => JSON.parse(JSON.stringify(workflow))

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
    historique: { passe: [], futur: [], derniereCle: null },
    // Bloc sélectionné dans la vue graphique (ses réglages s'affichent sous le graphe)
    noeudSelectionne: null,
  }),

  getters: {
    jeu: (state) => state.lab?.jeuxDeDonnees.find((jeu) => jeu.id === state.jeuId) ?? null,
    options: (state) => ({ blocsDisponibles: state.lab?.blocsDisponibles ?? null, simulateurs: state.lab?.simulateurs ?? {} }),
    erreursValidation() {
      return this.lab ? valider(this.workflow, this.options) : []
    },
    // Bloc Agent confié à une vraie IA (LAB-08) : seulement dans un labo qui le prévoit, clé saisie
    agentReel: (state) => (state.lab?.modeReel ? useIaReelleStore().agentReel : null),
    modeIaReelle() {
      return Boolean(this.agentReel)
    },
    peutAnnuler: (state) => state.historique.passe.length > 0,
    peutRetablir: (state) => state.historique.futur.length > 0,
    verrouille: (state) => (noeudId) => (state.lab?.verrous?.noeuds ?? []).includes(noeudId),
    terminee: (state) => Boolean(state.execution && estTerminee(state.execution)),
    // Une validation humaine attend la décision de l'apprenant
    enAttente: (state) => state.execution?.statut === 'attente_humaine',
    // Bloc qui s'exécutera à la prochaine étape
    prochainNoeud: (state) => {
      const execution = state.execution
      if (!execution || estTerminee(execution) || execution.statut === 'attente_humaine') return null
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

    // Garde l'état actuel avant une modification. Les frappes successives dans un même
    // champ (même `cle`) ne font qu'une étape d'historique.
    memoriser(cle = null) {
      const historique = this.historique
      if (cle && cle === historique.derniereCle) return
      historique.passe.push(copier(this.workflow))
      if (historique.passe.length > TAILLE_HISTORIQUE) historique.passe.shift()
      historique.futur = []
      historique.derniereCle = cle
    },

    annuler() {
      const historique = this.historique
      if (!historique.passe.length) return
      historique.futur.push(copier(this.workflow))
      this.workflow = historique.passe.pop()
      historique.derniereCle = null
      this.apresModification()
    },

    retablir() {
      const historique = this.historique
      if (!historique.futur.length) return
      historique.passe.push(copier(this.workflow))
      this.workflow = historique.futur.pop()
      historique.derniereCle = null
      this.apresModification()
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
      const derniere = this.workflow.noeuds.at(-1)?.position ?? { x: -340, y: 0 }
      this.memoriser()
      this.workflow.noeuds.push({ id, type, libelle: '', config: bloc.configParDefaut(), position: { x: derniere.x + 340, y: derniere.y } })
      this.apresModification()
      return id
    },

    // Copie d'un bloc (réglages compris, sans ses liens). Le déclencheur reste unique.
    dupliquerBloc(noeudId) {
      const source = this.workflow.noeuds.find((noeud) => noeud.id === noeudId)
      if (!source || source.type === 'declencheur' || !this.lab?.blocsDisponibles.includes(source.type)) return null
      let numero = 1
      while (this.workflow.noeuds.some((noeud) => noeud.id === `${source.type}-${numero}`)) numero += 1
      const id = `${source.type}-${numero}`
      const position = source.position ?? { x: 0, y: 0 }
      this.memoriser()
      this.workflow.noeuds.push({
        id,
        type: source.type,
        libelle: source.libelle ? `${source.libelle} (copie)` : '',
        config: copier(source.config ?? {}),
        position: { x: position.x + 40, y: position.y + 80 },
      })
      this.apresModification()
      return id
    },

    selectionner(noeudId) {
      this.noeudSelectionne = this.workflow.noeuds.some((noeud) => noeud.id === noeudId) ? noeudId : null
    },

    // Position dans la vue graphique : sans effet sur l'exécution, hors historique
    deplacer(noeudId, position) {
      const noeud = this.workflow.noeuds.find((candidat) => candidat.id === noeudId)
      if (noeud) noeud.position = { x: Math.round(position.x), y: Math.round(position.y) }
    },

    supprimerBloc(noeudId) {
      if (this.verrouille(noeudId) || !this.workflow.noeuds.some((noeud) => noeud.id === noeudId)) return
      this.memoriser()
      this.workflow.noeuds = this.workflow.noeuds.filter((noeud) => noeud.id !== noeudId)
      this.workflow.liens = this.workflow.liens.filter((lien) => lien.source !== noeudId && lien.cible !== noeudId)
      if (this.noeudSelectionne === noeudId) this.noeudSelectionne = null
      this.apresModification()
    },

    configurer(noeudId, champ, valeur) {
      const noeud = this.workflow.noeuds.find((candidat) => candidat.id === noeudId)
      if (!noeud || this.verrouille(noeudId)) return
      this.memoriser(`config:${noeudId}:${champ}`)
      noeud.config = { ...noeud.config, [champ]: valeur }
      this.apresModification()
    },

    renommer(noeudId, libelle) {
      const noeud = this.workflow.noeuds.find((candidat) => candidat.id === noeudId)
      if (!noeud || this.verrouille(noeudId)) return
      this.memoriser(`nom:${noeudId}`)
      noeud.libelle = libelle
    },

    relier(source, sortie, cible) {
      if (!source || !cible || source === cible) return null
      if (this.workflow.liens.some((lien) => lien.source === source && lien.sortie === sortie && lien.cible === cible)) return null
      let numero = this.workflow.liens.length + 1
      while (this.workflow.liens.some((lien) => lien.id === `lien-${numero}`)) numero += 1
      const id = `lien-${numero}`
      this.memoriser()
      this.workflow.liens.push({ id, source, sortie, cible })
      this.apresModification()
      return id
    },

    delier(lienId) {
      if (!this.workflow.liens.some((lien) => lien.id === lienId)) return
      this.memoriser()
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
      if (this.enAttente) return this.execution
      if (!this.execution || estTerminee(this.execution)) {
        this.execution = this.nouvelleExecution()
        if (this.execution.statut === 'invalide') return this.execution
      }
      this.execution = await etapeSuivante(this.execution, { agentReel: this.agentReel })
      return this.execution
    },

    lire() {
      if (this.lecture) return
      if (this.execution && estTerminee(this.execution)) this.execution = null
      this.lecture = true
      const avancer = async () => {
        if (!this.lecture) return
        await this.pas()
        if (estTerminee(this.execution) || this.enAttente) {
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

    // Exécute jusqu'au bout (ou jusqu'à une validation humaine), en reprenant l'exécution en cours
    async toutExecuter() {
      this.pause()
      this.execution = this.execution && !estTerminee(this.execution)
        ? await poursuivre(this.execution, { agentReel: this.agentReel })
        : await executerTout(this.workflow, this.jeu, { ...this.options, agentReel: this.agentReel })
    },

    // Décision de l'apprenant pour la validation humaine en attente ; le bloc s'exécute aussitôt
    async decider(decision) {
      if (!this.enAttente) return this.execution
      this.execution = repondreValidation(this.execution, this.execution.attente.noeudId, decision)
      return this.pas()
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
      this.memoriser()
      this.workflow = normaliser(this.lab.correction.workflow)
      this.correctionAffichee = true
      this.apresModification()
    },

    restaurerInitial() {
      this.memoriser()
      this.workflow = normaliser(this.lab.workflowInitial)
      this.apresModification()
    },
  },
})
