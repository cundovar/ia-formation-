<template>
  <div
    v-if="store.lab"
    class="space-y-6"
  >
    <!-- LAB-01 : la simulation est annoncée en permanence -->
    <p
      class="flex items-start gap-3 rounded-2xl border-l-8 border-amber-500 bg-amber-50 p-4 text-lg text-gray-900"
      data-testid="bandeau-simulation"
    >
      <i
        class="fas fa-flask mt-1 text-amber-800"
        aria-hidden="true"
      />
      <span><strong>Simulation.</strong> {{ store.lab.simulation }}</span>
    </p>

    <section
      class="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:p-6"
      aria-labelledby="consigne-titre"
    >
      <h2
        id="consigne-titre"
        class="text-2xl font-bold text-gray-900"
      >
        Situation
      </h2>
      <p class="mt-2 text-lg text-gray-900">
        {{ store.lab.scenario }}
      </p>
      <p class="mt-3 text-lg text-gray-900">
        <strong>Objectif :</strong> {{ store.lab.objectif }}
      </p>
      <h3 class="mt-4 text-xl font-bold text-gray-900">
        Ce que vous allez faire
      </h3>
      <ol class="mt-2 list-decimal space-y-1 pl-6 text-lg text-gray-900">
        <li
          v-for="instruction in store.lab.instructions"
          :key="instruction"
        >
          {{ instruction }}
        </li>
      </ol>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <section aria-labelledby="workflow-titre">
        <h2
          id="workflow-titre"
          class="text-2xl font-bold text-gray-900"
        >
          Votre workflow
        </h2>
        <div
          v-if="erreursGenerales.length"
          class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-lg text-red-950"
          role="status"
        >
          <p
            v-for="erreur in erreursGenerales"
            :key="erreur.code + erreur.message"
          >
            {{ erreur.message }}
          </p>
        </div>
        <p
          v-else-if="nombreProblemes"
          class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-lg text-red-950"
          role="status"
        >
          {{ nombreProblemes }} problème(s) à corriger : ils sont indiqués dans les blocs concernés.
        </p>
        <div class="mt-4">
          <VueSequentielle />
        </div>
      </section>

      <div class="space-y-4 lg:sticky lg:top-32 lg:self-start">
        <BarreControles />
        <JournalExecution />
      </div>
    </div>

    <CriteresReussite />
    <IndicesCorrection />

    <section
      v-if="store.lab.animation"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:p-6"
      aria-labelledby="atelier-titre"
    >
      <h2
        id="atelier-titre"
        class="text-xl font-bold text-gray-900"
      >
        En atelier
      </h2>
      <p class="mt-2 text-lg text-gray-900">
        {{ store.lab.animation }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import VueSequentielle from './editeur/VueSequentielle.vue'
import BarreControles from './execution/BarreControles.vue'
import JournalExecution from './execution/JournalExecution.vue'
import CriteresReussite from './CriteresReussite.vue'
import IndicesCorrection from './IndicesCorrection.vue'

const props = defineProps({
  laboratoire: { type: Object, required: true },
})

const store = useLaboratoireStore()

watch(() => props.laboratoire, (lab) => store.charger(lab), { immediate: true })
onBeforeUnmount(() => store.quitter())

// Problèmes qui ne concernent pas un bloc précis (déclencheur ou résultat manquant, boucle…)
const erreursGenerales = computed(() => store.erreursValidation.filter((erreur) => !erreur.noeudId || erreur.code === 'CYCLE'))
const nombreProblemes = computed(() => store.erreursValidation.length)
</script>
