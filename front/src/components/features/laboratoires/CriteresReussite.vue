<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-4 md:p-6"
    aria-labelledby="criteres-titre"
  >
    <h2
      id="criteres-titre"
      class="text-2xl font-bold text-gray-900"
    >
      Vérifier mon workflow
    </h2>
    <p class="mt-2 text-lg text-gray-700">
      Le simulateur exécute votre workflow avec toutes les données d'essai, puis contrôle chaque objectif. Rien n'est enregistré.
    </p>
    <button
      type="button"
      :class="[BOUTON.principal, 'mt-4']"
      data-testid="verifier"
      @click="verifier"
    >
      <i
        class="fas fa-list-check"
        aria-hidden="true"
      />
      Vérifier mon workflow
    </button>

    <div
      v-if="store.verification"
      class="mt-5"
    >
      <h3
        ref="titreResultat"
        tabindex="-1"
        :class="['text-xl font-bold focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-800', store.verification.reussi ? 'text-green-900' : 'text-gray-900']"
        data-testid="bilan"
      >
        {{ bilan }}
      </h3>
      <ul class="mt-3 space-y-2">
        <li
          v-for="detail in store.verification.details"
          :key="detail.id"
          :class="['flex items-start gap-3 rounded-xl border p-3 text-lg', detail.reussi ? 'border-green-300 bg-green-50 text-green-950' : 'border-amber-300 bg-amber-50 text-gray-900']"
          :data-testid="`critere-${detail.id}`"
        >
          <i
            :class="['mt-1', detail.reussi ? 'fas fa-circle-check' : 'fas fa-circle-exclamation']"
            aria-hidden="true"
          />
          <span><strong>{{ detail.reussi ? 'Réussi' : 'À revoir' }} :</strong> {{ detail.message }}</span>
        </li>
      </ul>

      <div
        v-if="store.verification.reussi"
        class="surface-card surface-card--green mt-5 rounded-2xl p-5"
        data-testid="a-retenir"
      >
        <h3 class="text-xl font-bold text-gray-900">
          À retenir
        </h3>
        <ul class="mt-3 list-disc space-y-2 pl-6 text-lg text-gray-800">
          <li
            v-for="phrase in store.lab.aRetenir"
            :key="phrase"
          >
            {{ phrase }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON } from './styles'

const store = useLaboratoireStore()
const titreResultat = ref(null)

const bilan = computed(() => {
  const verification = store.verification
  if (!verification) return ''
  if (verification.reussi) return 'Bravo, tous les objectifs sont atteints.'
  if (verification.erreursValidation.length) return 'Le workflow ne peut pas encore s\'exécuter : corrigez les problèmes signalés dans les blocs.'
  const reussis = verification.details.filter((detail) => detail.reussi).length
  return `${reussis} objectif(s) atteint(s) sur ${verification.details.length}. Continuez !`
})

const verifier = async () => {
  await store.verifier()
  await nextTick()
  titreResultat.value?.focus()
}
</script>
