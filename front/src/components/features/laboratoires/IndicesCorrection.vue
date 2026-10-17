<template>
  <section
    class="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-6"
    aria-labelledby="aide-titre"
  >
    <h2
      id="aide-titre"
      class="text-2xl font-bold text-gray-900"
    >
      Besoin d'aide ?
    </h2>

    <ol
      v-if="store.indicesAffiches"
      class="mt-3 list-decimal space-y-2 pl-6 text-lg text-gray-900"
      data-testid="indices"
    >
      <li
        v-for="indice in store.lab.indices.slice(0, store.indicesAffiches)"
        :key="indice"
      >
        {{ indice }}
      </li>
    </ol>

    <div class="mt-4 flex flex-wrap gap-3">
      <button
        v-if="store.indicesAffiches < store.lab.indices.length"
        type="button"
        :class="BOUTON.secondaire"
        data-testid="indice"
        @click="store.afficherIndice()"
      >
        <i
          class="fas fa-lightbulb"
          aria-hidden="true"
        />
        {{ store.indicesAffiches ? 'Indice suivant' : 'Afficher un indice' }}
        ({{ store.indicesAffiches + 1 }}/{{ store.lab.indices.length }})
      </button>
      <button
        v-if="!store.correctionAffichee"
        type="button"
        :class="BOUTON.secondaire"
        data-testid="voir-correction"
        @click="store.afficherCorrection()"
      >
        <i
          class="fas fa-eye"
          aria-hidden="true"
        />
        Voir la correction
      </button>
      <button
        type="button"
        :class="BOUTON.secondaire"
        data-testid="restaurer"
        @click="store.restaurerInitial()"
      >
        <i
          class="fas fa-arrow-rotate-left"
          aria-hidden="true"
        />
        Revenir au workflow de départ
      </button>
    </div>

    <div
      v-if="store.correctionAffichee"
      class="mt-5 rounded-xl border border-gray-200 bg-white p-4"
      data-testid="correction"
    >
      <h3 class="text-xl font-bold text-gray-900">
        Correction expliquée
      </h3>
      <p class="mt-2 text-lg text-gray-800">
        {{ store.lab.correction.explication }}
      </p>
      <button
        type="button"
        :class="[BOUTON.principal, 'mt-4']"
        data-testid="charger-correction"
        @click="store.chargerCorrection()"
      >
        <i
          class="fas fa-file-import"
          aria-hidden="true"
        />
        Charger la correction dans l'éditeur
      </button>
    </div>
  </section>
</template>

<script setup>
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON } from './styles'

const store = useLaboratoireStore()
</script>
