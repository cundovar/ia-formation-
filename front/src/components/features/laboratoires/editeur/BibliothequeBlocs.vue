<template>
  <section
    v-if="store.blocsAjoutables.length"
    class="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 md:p-5"
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
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { trouverBloc } from '@/laboratoires/blocs'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON, CHAMP } from '../styles'

const emit = defineEmits(['ajoute'])

const store = useLaboratoireStore()
const selectAjout = ref(null)
const typeAjout = ref('')

const blocChoisi = computed(() => trouverBloc(typeAjout.value))

watch(() => store.blocsAjoutables, (blocs) => {
  if (!blocs.some((bloc) => bloc.type === typeAjout.value)) {
    typeAjout.value = blocs.find((bloc) => bloc.type !== 'declencheur')?.type ?? blocs[0]?.type ?? ''
  }
}, { immediate: true })

const ajouter = () => {
  const id = store.ajouterBloc(typeAjout.value)
  if (id) emit('ajoute', id)
}

defineExpose({
  focus: async () => {
    await nextTick()
    selectAjout.value?.focus()
  },
})
</script>
