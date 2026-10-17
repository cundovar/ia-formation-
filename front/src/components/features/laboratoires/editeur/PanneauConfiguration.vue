<template>
  <fieldset class="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
    <legend class="px-1 text-lg font-bold text-gray-900">
      Réglages du bloc
    </legend>

    <div>
      <label
        :for="`${prefixe}-libelle`"
        class="text-base font-semibold text-gray-900"
      >Nom du bloc</label>
      <input
        :id="`${prefixe}-libelle`"
        :value="noeud.libelle"
        type="text"
        :class="CHAMP"
        :placeholder="bloc.libelle"
        @input="$emit('renommer', $event.target.value)"
      >
    </div>

    <div
      v-for="champ in champsVisibles"
      :key="champ.nom"
    >
      <fieldset
        v-if="champ.type === 'cases'"
        :aria-describedby="champ.aide ? `${prefixe}-${champ.nom}-aide` : undefined"
      >
        <legend class="text-base font-semibold text-gray-900">
          {{ champ.libelle }}
        </legend>
        <div
          v-for="option in optionsDe(champ)"
          :key="option.valeur"
          class="mt-2 flex items-start gap-3"
        >
          <input
            :id="`${prefixe}-${champ.nom}-${option.valeur}`"
            type="checkbox"
            class="mt-1 h-6 w-6 shrink-0 accent-blue-700"
            :checked="(noeud.config[champ.nom] ?? []).includes(option.valeur)"
            @change="basculer(champ.nom, option.valeur, $event.target.checked)"
          >
          <label
            :for="`${prefixe}-${champ.nom}-${option.valeur}`"
            class="text-base text-gray-900"
          >{{ option.libelle }}</label>
        </div>
      </fieldset>
      <template v-else>
        <label
          :for="`${prefixe}-${champ.nom}`"
          class="text-base font-semibold text-gray-900"
        >{{ champ.libelle }}</label>
        <select
          v-if="champ.type === 'selection'"
          :id="`${prefixe}-${champ.nom}`"
          :value="noeud.config[champ.nom]"
          :class="CHAMP"
          :aria-describedby="champ.aide ? `${prefixe}-${champ.nom}-aide` : undefined"
          @change="$emit('configurer', champ.nom, $event.target.value)"
        >
          <option
            v-for="option in optionsDe(champ)"
            :key="option.valeur"
            :value="option.valeur"
          >
            {{ option.libelle }}
          </option>
        </select>
        <textarea
          v-else-if="champ.type === 'zone'"
          :id="`${prefixe}-${champ.nom}`"
          :value="noeud.config[champ.nom]"
          rows="4"
          spellcheck="false"
          :class="[CHAMP, 'font-mono text-base']"
          :aria-describedby="champ.aide ? `${prefixe}-${champ.nom}-aide` : undefined"
          @input="$emit('configurer', champ.nom, $event.target.value)"
        />
        <input
          v-else
          :id="`${prefixe}-${champ.nom}`"
          :value="noeud.config[champ.nom]"
          type="text"
          spellcheck="false"
          :class="CHAMP"
          :aria-describedby="champ.aide ? `${prefixe}-${champ.nom}-aide` : undefined"
          @input="$emit('configurer', champ.nom, $event.target.value)"
        >
      </template>
      <p
        v-if="champ.aide"
        :id="`${prefixe}-${champ.nom}-aide`"
        class="mt-1 text-base text-gray-700"
      >
        {{ champ.aide }}
      </p>
    </div>

    <!-- Comportement du simulateur, montré tel quel (LAB-01) -->
    <details
      v-if="informations.length"
      class="rounded-lg border border-indigo-200 bg-indigo-50 p-3"
      data-testid="informations-simulateur"
    >
      <summary class="cursor-pointer text-base font-semibold text-gray-900 underline">
        Comment le simulateur décide
      </summary>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-base text-gray-900">
        <li
          v-for="ligne in informations"
          :key="ligne"
        >
          {{ ligne }}
        </li>
      </ul>
    </details>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { CHAMP } from '../styles'

const props = defineProps({
  noeud: { type: Object, required: true },
  bloc: { type: Object, required: true },
})

const emit = defineEmits(['configurer', 'renommer'])

const store = useLaboratoireStore()
const simulateurs = computed(() => store.lab?.simulateurs ?? {})
const prefixe = computed(() => `config-${props.noeud.id}`)
const champsVisibles = computed(() => props.bloc.champs.filter((champ) => !champ.visibleSi || champ.visibleSi(props.noeud.config, simulateurs.value)))
// Les options peuvent dépendre du laboratoire (outils fictifs proposés à un agent)
const optionsDe = (champ) => (typeof champ.options === 'function' ? champ.options(simulateurs.value) : champ.options ?? [])
const informations = computed(() => props.bloc.informations?.(simulateurs.value) ?? [])

const basculer = (nom, valeur, coche) => {
  const actuelles = props.noeud.config[nom] ?? []
  emit('configurer', nom, coche ? [...actuelles.filter((element) => element !== valeur), valeur] : actuelles.filter((element) => element !== valeur))
}
</script>
