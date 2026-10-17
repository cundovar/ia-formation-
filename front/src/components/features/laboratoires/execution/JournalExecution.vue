<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-4"
    aria-labelledby="journal-titre"
  >
    <h3
      id="journal-titre"
      class="text-xl font-bold text-gray-900"
    >
      Journal d'exécution
    </h3>

    <!-- Annonce de la dernière étape pour les lecteurs d'écran -->
    <p
      class="sr-only"
      aria-live="polite"
      data-testid="annonce"
    >
      {{ annonce }}
    </p>

    <p
      v-if="!execution"
      class="mt-2 text-lg text-gray-700"
    >
      Cliquez sur « Pas à pas » pour exécuter le premier bloc et lire ce qu'il fait.
    </p>

    <ol
      v-else
      class="mt-3 space-y-3"
      data-testid="journal"
    >
      <li
        v-for="entree in execution.journal"
        :key="entree.etape"
        :class="['rounded-xl border p-3', ETATS[entree.statut]?.classes ?? '']"
      >
        <p class="text-lg font-bold">
          <i
            :class="ETATS[entree.statut]?.icone"
            aria-hidden="true"
          />
          Étape {{ entree.etape }} : {{ entree.nom }}
          <span class="sr-only">({{ ETATS[entree.statut]?.texte }})</span>
        </p>
        <p class="mt-1 text-lg">
          {{ entree.explication }}
        </p>
        <details
          v-if="entree.entree"
          class="mt-2"
        >
          <summary class="cursor-pointer text-base font-semibold underline">
            Données reçues
          </summary>
          <pre class="mt-1 max-h-64 overflow-auto rounded-lg bg-white p-2 text-sm text-gray-900">{{ json(entree.entree) }}</pre>
        </details>
        <details
          v-if="entree.sortie"
          class="mt-2"
        >
          <summary class="cursor-pointer text-base font-semibold underline">
            Données transmises
          </summary>
          <pre class="mt-1 max-h-64 overflow-auto rounded-lg bg-white p-2 text-sm text-gray-900">{{ json(entree.sortie) }}</pre>
        </details>
      </li>
    </ol>

    <div
      v-if="execution?.statut === 'termine'"
      class="mt-4 rounded-xl border border-green-300 bg-green-50 p-3"
      data-testid="resultat-final"
    >
      <p class="text-lg font-bold text-green-950">
        Exécution terminée.
      </p>
      <template v-if="execution.resultat">
        <p class="mt-1 text-lg text-gray-900">
          Données finales :
        </p>
        <pre class="mt-1 max-h-64 overflow-auto rounded-lg bg-white p-2 text-sm text-gray-900">{{ json(execution.resultat) }}</pre>
      </template>
      <p
        v-else
        class="mt-1 text-lg text-gray-900"
      >
        Aucun bloc Résultat n'a reçu de données.
      </p>
    </div>

    <p
      v-if="execution?.statut === 'erreur'"
      class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-lg text-red-950"
      data-testid="erreur-execution"
    >
      L'exécution s'est arrêtée : {{ execution.erreur.message }}
    </p>

    <p
      v-if="execution?.statut === 'invalide'"
      class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-lg text-red-950"
    >
      Le workflow ne peut pas s'exécuter : corrigez d'abord les problèmes signalés.
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { ETATS, json } from '../styles'

const store = useLaboratoireStore()
const execution = computed(() => store.execution)

const annonce = computed(() => {
  const derniere = execution.value?.journal.at(-1)
  if (!derniere) return ''
  const fin = execution.value.statut === 'termine' ? ' Exécution terminée.' : ''
  return `Étape ${derniere.etape}, ${derniere.nom} : ${derniere.explication}${fin}`
})
</script>
