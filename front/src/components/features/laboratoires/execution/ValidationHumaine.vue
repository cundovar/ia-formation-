<template>
  <section
    v-if="attente"
    class="rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-4"
    aria-labelledby="validation-titre"
    data-testid="validation-humaine"
  >
    <h3
      id="validation-titre"
      ref="titre"
      tabindex="-1"
      class="text-xl font-bold text-gray-900 focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-800"
    >
      <i
        class="fas fa-user-check"
        aria-hidden="true"
      />
      Votre décision est attendue
    </h3>
    <p class="mt-2 text-lg text-gray-900">
      Le bloc « {{ attente.nom }} » met le workflow en pause. Vous jouez la personne qui valide.
    </p>
    <p
      class="mt-2 text-lg font-semibold text-gray-900"
      data-testid="question-validation"
    >
      {{ attente.question }}
    </p>
    <details class="mt-2">
      <summary class="cursor-pointer text-base font-semibold underline">
        Données à examiner avant de décider
      </summary>
      <pre class="mt-1 max-h-64 overflow-auto rounded-lg bg-white p-2 text-sm text-gray-900">{{ json(attente.entree) }}</pre>
    </details>
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        :class="BOUTON.succes"
        data-testid="approuver"
        @click="decider('approuver')"
      >
        <i
          class="fas fa-check"
          aria-hidden="true"
        />
        Approuver
      </button>
      <button
        type="button"
        :class="BOUTON.secondaire"
        data-testid="refuser"
        @click="decider('refuser')"
      >
        <i
          class="fas fa-xmark"
          aria-hidden="true"
        />
        Refuser
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON, json } from '../styles'

const store = useLaboratoireStore()
const titre = ref(null)
const attente = computed(() => (store.enAttente ? store.execution.attente : null))

// Après la décision, le focus revient sur « Pas à pas » pour continuer au clavier
const decider = async (decision) => {
  await store.decider(decision)
  await nextTick()
  document.getElementById('bouton-pas-a-pas')?.focus()
}

// La décision attendue reçoit le focus : la personne n'a pas à la chercher
watch(attente, async (valeur, ancienne) => {
  if (!valeur || valeur.noeudId === ancienne?.noeudId) return
  await nextTick()
  titre.value?.focus()
})
</script>
