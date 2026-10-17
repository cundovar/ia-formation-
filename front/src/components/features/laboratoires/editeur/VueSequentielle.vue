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

    <!-- Bibliothèque de blocs -->
    <section
      v-if="store.blocsAjoutables.length"
      class="mt-6 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 md:p-5"
      aria-labelledby="ajout-titre"
    >
      <h3
        id="ajout-titre"
        class="text-xl font-bold text-gray-900"
      >
        Ajouter un bloc
      </h3>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
          <label
            for="ajout-type"
            class="text-base font-semibold text-gray-900"
          >Type de bloc</label>
          <select
            id="ajout-type"
            ref="selectAjout"
            v-model="typeAjout"
            :class="CHAMP"
            aria-describedby="ajout-description"
          >
            <option
              v-for="bloc in store.blocsAjoutables"
              :key="bloc.type"
              :value="bloc.type"
            >
              {{ bloc.libelle }}
            </option>
          </select>
        </div>
        <button
          type="button"
          :class="BOUTON.principal"
          data-testid="ajouter-bloc"
          @click="ajouter"
        >
          <i
            class="fas fa-plus"
            aria-hidden="true"
          />
          Ajouter
        </button>
      </div>
      <p
        id="ajout-description"
        class="mt-2 text-base text-gray-700"
      >
        {{ blocChoisi?.description }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { trouverBloc } from '@/laboratoires/blocs'
import { ordreTopologique } from '@/laboratoires/moteur/workflow'
import { useLaboratoireStore } from '@/stores/laboratoire'
import NoeudBloc from './NoeudBloc.vue'
import { BOUTON, CHAMP } from '../styles'

const store = useLaboratoireStore()
const selectAjout = ref(null)
const typeAjout = ref('')

// Ordre d'exécution ; les blocs pris dans une boucle restent affichés à la fin
const noeudsOrdonnes = computed(() => {
  const { ordre, cycle } = ordreTopologique(store.workflow)
  return [...ordre, ...cycle].map((id) => store.workflow.noeuds.find((noeud) => noeud.id === id)).filter(Boolean)
})

const blocChoisi = computed(() => trouverBloc(typeAjout.value))

watch(() => store.blocsAjoutables, (blocs) => {
  if (!blocs.some((bloc) => bloc.type === typeAjout.value)) {
    typeAjout.value = blocs.find((bloc) => bloc.type !== 'declencheur')?.type ?? blocs[0]?.type ?? ''
  }
}, { immediate: true })

const ajouter = async () => {
  const id = store.ajouterBloc(typeAjout.value)
  if (!id) return
  await nextTick()
  // Le nouveau bloc reçoit le focus : la personne au clavier le retrouve tout de suite
  document.getElementById(`bloc-${id}`)?.focus()
}

const focusAjout = async () => {
  await nextTick()
  selectAjout.value?.focus()
}
</script>
