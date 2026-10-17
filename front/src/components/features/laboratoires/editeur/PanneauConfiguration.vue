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
          v-for="option in champ.options"
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
      <p
        v-if="champ.aide"
        :id="`${prefixe}-${champ.nom}-aide`"
        class="mt-1 text-base text-gray-700"
      >
        {{ champ.aide }}
      </p>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { CHAMP } from '../styles'

const props = defineProps({
  noeud: { type: Object, required: true },
  bloc: { type: Object, required: true },
})

defineEmits(['configurer', 'renommer'])

const prefixe = computed(() => `config-${props.noeud.id}`)
const champsVisibles = computed(() => props.bloc.champs.filter((champ) => !champ.visibleSi || champ.visibleSi(props.noeud.config)))
</script>
