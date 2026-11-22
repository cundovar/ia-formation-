<!-- Icône du catalogue (regles/diaporamas/icones.json), dessinée par le site : décorative pour les lecteurs
     d'écran, le sens étant porté par le texte voisin. -->
<template>
  <img
    class="diapositive-icone"
    :src="source"
    alt=""
    aria-hidden="true"
    :style="zone(element, format)"
  >
</template>

<script setup>
import { computed, inject, unref } from 'vue'
import { CLE_FORMAT, zone } from './geometrie'
import { FORMAT } from '@/diaporamas/theme'
import { donneesIcone } from '@/diaporamas/icones'

const props = defineProps({
  element: { type: Object, required: true },
})

const formatInjecte = inject(CLE_FORMAT, FORMAT)
const format = computed(() => unref(formatInjecte))
const source = computed(() => donneesIcone(props.element.nom, props.element.couleur, props.element.epaisseur))
</script>

<style scoped>
.diapositive-icone {
  position: absolute;
  margin: 0;
}
</style>
