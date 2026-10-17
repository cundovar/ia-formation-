<template>
  <div>
    <ol
      class="space-y-4"
      aria-label="Blocs du workflow, dans l'ordre d'exécution"
    >
      <li
        v-for="(noeud, index) in noeudsOrdonnes"
        :key="noeud.id"
      >
        <NoeudBloc
          :noeud="noeud"
          :numero="index + 1"
          @supprime="focusAjout"
        />
      </li>
    </ol>

    <BibliothequeBlocs
      ref="bibliotheque"
      class="mt-6"
      @ajoute="focusBloc"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { ordreTopologique } from '@/laboratoires/moteur/workflow'
import { useLaboratoireStore } from '@/stores/laboratoire'
import BibliothequeBlocs from './BibliothequeBlocs.vue'
import NoeudBloc from './NoeudBloc.vue'

const store = useLaboratoireStore()
const bibliotheque = ref(null)

// Ordre d'exécution ; les blocs pris dans une boucle restent affichés à la fin
const noeudsOrdonnes = computed(() => {
  const { ordre, cycle } = ordreTopologique(store.workflow)
  return [...ordre, ...cycle].map((id) => store.workflow.noeuds.find((noeud) => noeud.id === id)).filter(Boolean)
})

// Le nouveau bloc reçoit le focus : la personne au clavier le retrouve tout de suite
const focusBloc = async (id) => {
  await nextTick()
  document.getElementById(`bloc-${id}`)?.focus()
}

const focusAjout = () => bibliotheque.value?.focus()
</script>
