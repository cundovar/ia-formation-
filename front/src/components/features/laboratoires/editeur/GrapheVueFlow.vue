<template>
  <div class="graphe-labo">
    <p
      id="graphe-aide"
      class="text-base text-gray-800"
    >
      Pour relier deux blocs, faites glisser la poignée de droite d'un bloc vers la poignée de gauche d'un autre, ou touchez l'une puis l'autre.
      Sélectionnez un bloc pour afficher ses réglages sous le graphe. La touche Suppr retire le bloc ou le lien sélectionné.
    </p>

    <div
      class="relative mt-3 h-[34rem] overflow-hidden rounded-2xl border-2 border-gray-200 bg-white"
      role="region"
      aria-label="Vue graphique du workflow"
      aria-describedby="graphe-aide"
    >
      <VueFlow
        id="laboratoire"
        :is-valid-connection="estValide"
        :connect-on-click="true"
        :delete-key-code="['Delete', 'Backspace']"
        :fit-view-on-init="true"
        :min-zoom="0.3"
        :max-zoom="1.5"
        :zoom-on-double-click="false"
        :default-edge-options="{ type: 'smoothstep' }"
        @connect="relier"
        @node-drag-stop="deplacer"
        @nodes-change="changerNoeuds"
        @edges-change="changerLiens"
        @pane-click="store.selectionner(null)"
      >
        <template #node-bloc="nodeProps">
          <NoeudGraphe
            :id="nodeProps.id"
            :data="nodeProps.data"
            :selected="nodeProps.selected"
          />
        </template>
      </VueFlow>

      <div class="absolute bottom-3 right-3 z-10 flex gap-2">
        <button
          type="button"
          :class="BOUTON.secondaire"
          aria-label="Zoom avant"
          @click="zoomIn()"
        >
          <i
            class="fas fa-plus"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          :class="BOUTON.secondaire"
          aria-label="Zoom arrière"
          @click="zoomOut()"
        >
          <i
            class="fas fa-minus"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          :class="BOUTON.secondaire"
          data-testid="recentrer"
          @click="fitView({ padding: 0.2 })"
        >
          <i
            class="fas fa-expand"
            aria-hidden="true"
          />
          Recentrer
        </button>
      </div>
    </div>

    <BibliothequeBlocs
      class="mt-4"
      @ajoute="selectionnerAjout"
    />

    <div
      class="mt-4"
      aria-live="polite"
    >
      <NoeudBloc
        v-if="noeudSelectionne"
        :key="noeudSelectionne.id"
        :noeud="noeudSelectionne"
        :numero="numeroSelectionne"
      />
      <p
        v-else
        class="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-lg text-gray-700"
      >
        Sélectionnez un bloc dans le graphe pour afficher ses réglages et ses liens.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, watch } from 'vue'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { connexionValide, versLiens, versNoeuds } from '@/laboratoires/adaptateurs/vueFlow'
import { ordreTopologique } from '@/laboratoires/moteur/workflow'
import { useLaboratoireStore } from '@/stores/laboratoire'
import BibliothequeBlocs from './BibliothequeBlocs.vue'
import NoeudBloc from './NoeudBloc.vue'
import NoeudGraphe from './NoeudGraphe.vue'
import { BOUTON } from '../styles'

const store = useLaboratoireStore()
const { fitView, setEdges, setNodes, zoomIn, zoomOut } = useVueFlow('laboratoire')

const noeuds = computed(() => versNoeuds(store.workflow, {
  etats: store.execution?.etats ?? {},
  prochain: store.prochainNoeud,
  verrous: store.lab?.verrous?.noeuds ?? [],
  selection: store.noeudSelectionne,
}))

const liens = computed(() => versLiens(store.workflow, { liensActifs: store.execution?.liensActifs ?? {} }))

// Les blocs d'abord, les liens ensuite : un lien posé avant ses blocs serait écarté par Vue Flow
watch([noeuds, liens], async ([nouveauxNoeuds, nouveauxLiens]) => {
  setNodes(nouveauxNoeuds)
  await nextTick()
  setEdges(nouveauxLiens)
}, { immediate: true })

const noeudSelectionne = computed(() => store.workflow.noeuds.find((noeud) => noeud.id === store.noeudSelectionne) ?? null)
const numeroSelectionne = computed(() => ordreTopologique(store.workflow).ordre.indexOf(store.noeudSelectionne) + 1)

// Un bloc ajouté est sélectionné : ses réglages s'affichent sous le graphe et reçoivent le focus
const selectionnerAjout = async (id) => {
  store.selectionner(id)
  await nextTick()
  document.getElementById(`bloc-${id}`)?.focus()
}

// Vue Flow contrôle aussi les liens existants avec cette fonction : ceux du workflow sont acceptés tels quels
const estValide = (connexion) => (connexion.id && store.workflow.liens.some((lien) => lien.id === connexion.id))
  || connexionValide(store.workflow, connexion)

// Chaque geste dans le graphe devient une action du store (même historique, mêmes contrôles)
const relier = ({ source, sourceHandle, target }) => store.relier(source, sourceHandle ?? 'sortie', target)

const deplacer = ({ nodes }) => nodes.forEach((noeud) => store.deplacer(noeud.id, noeud.position))

const changerNoeuds = (changements) => {
  changements.forEach((changement) => {
    if (changement.type === 'remove') store.supprimerBloc(changement.id)
    if (changement.type === 'select' && changement.selected) store.selectionner(changement.id)
    // Déplacement au clavier (flèches) : pas d'événement de fin de glisser, on l'enregistre ici
    if (changement.type === 'position' && changement.position && !changement.dragging) store.deplacer(changement.id, changement.position)
  })
}

const changerLiens = (changements) => {
  changements.filter((changement) => changement.type === 'remove').forEach((changement) => store.delier(changement.id))
}
</script>

<style>
/* Liens selon l'exécution : emprunté (trait plein vert, épais), non pris (pointillés gris) ; aucune animation */
.graphe-labo .vue-flow__edge.lien-pris .vue-flow__edge-path {
  stroke: #15803d;
  stroke-width: 4;
}

.graphe-labo .vue-flow__edge.lien-non-pris .vue-flow__edge-path {
  stroke: #9ca3af;
  stroke-dasharray: 6 6;
}

.graphe-labo .vue-flow__edge-path {
  stroke: #475569;
  stroke-width: 2;
}

.graphe-labo .vue-flow__edge-text {
  font-size: 13px;
  font-weight: 600;
  fill: #111827;
}

.graphe-labo .vue-flow__node:focus-visible {
  outline: 3px solid #1e40af;
  outline-offset: 4px;
  border-radius: 1rem;
}
</style>
