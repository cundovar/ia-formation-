<template>
  <div
    :class="['w-64 rounded-2xl border-2 p-3 text-left shadow-sm', (data.bloc?.sorties.length ?? 0) > 1 ? 'pr-16' : '', couleurs.carte, selected ? 'ring-4 ring-blue-400' : '', data.etat === 'prochain' ? 'ring-4 ring-blue-300' : '']"
    :data-testid="`graphe-${id}`"
  >
    <Handle
      v-if="data.bloc?.entrees.length"
      id="entree"
      type="target"
      :position="Position.Left"
      class="poignee"
      :aria-label="`Entrée de ${data.nom}`"
    />

    <div class="flex items-start gap-2">
      <span
        :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', couleurs.icone]"
        aria-hidden="true"
      >
        <i :class="data.bloc?.icone ?? 'fas fa-question'" />
      </span>
      <div class="min-w-0">
        <p class="text-base font-bold leading-tight text-gray-900">
          {{ data.nom }}
          <i
            v-if="data.verrouille"
            class="fas fa-lock text-sm text-gray-600"
            aria-hidden="true"
          />
        </p>
        <p class="text-sm text-gray-700">
          {{ data.bloc?.libelle }}
        </p>
      </div>
    </div>
    <p class="mt-2 line-clamp-2 text-sm text-gray-900">
      {{ data.resume }}
    </p>
    <p :class="['mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold', etat.classes]">
      <i
        :class="etat.icone"
        aria-hidden="true"
      />
      {{ etat.texte }}
    </p>

    <!-- Une poignée par sortie, avec son nom (« Si vrai », « Si faux ») -->
    <template
      v-for="(sortie, index) in data.bloc?.sorties ?? []"
      :key="sortie.id"
    >
      <Handle
        :id="sortie.id"
        type="source"
        :position="Position.Right"
        class="poignee"
        :style="{ top: positionSortie(index) }"
        :aria-label="`Sortie ${sortie.libelle} de ${data.nom}`"
      />
      <span
        v-if="data.bloc.sorties.length > 1"
        class="pointer-events-none absolute right-3 -translate-y-1/2 text-xs font-semibold text-gray-800"
        :style="{ top: positionSortie(index) }"
        aria-hidden="true"
      >{{ sortie.libelle }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { COULEURS_BLOC, ETATS } from '../styles'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const couleurs = computed(() => COULEURS_BLOC[props.data.bloc?.couleur] ?? COULEURS_BLOC.sky)
const etat = computed(() => ETATS[props.data.etat] ?? ETATS.attente)
const nombreSorties = computed(() => props.data.bloc?.sorties.length ?? 1)
const positionSortie = (index) => `${((index + 1) * 100) / (nombreSorties.value + 1)}%`
</script>

<style scoped>
/* Poignées assez grandes pour le doigt et contrastées */
.poignee {
  width: 22px;
  height: 22px;
  border: 3px solid #1e3a8a;
  background: #dbeafe;
}
</style>
