<template>
  <div
    class="diapositive-texte"
    :class="{ 'diapositive-texte--gras': element.gras }"
    :style="style"
  >
    <ul v-if="element.paragraphes.some((p) => p.puce)">
      <li
        v-for="(paragraphe, index) in element.paragraphes"
        :key="index"
        :class="`puce--${paragraphe.puce ?? 'aucune'}`"
        :style="index < element.paragraphes.length - 1 ? espace : null"
      >
        <a
          v-if="paragraphe.lien"
          :href="paragraphe.lien"
          target="_blank"
          rel="noopener"
        >{{ paragraphe.texte }}</a>
        <template v-else>
          {{ paragraphe.texte }}
        </template>
      </li>
    </ul>
    <template v-else>
      <p
        v-for="(paragraphe, index) in element.paragraphes"
        :key="index"
        :style="index < element.paragraphes.length - 1 ? espace : null"
      >
        <a
          v-if="paragraphe.lien"
          :href="paragraphe.lien"
          target="_blank"
          rel="noopener"
        >{{ paragraphe.texte }}</a>
        <template v-else>
          {{ paragraphe.texte }}
        </template>
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ESPACE_PARAGRAPHE } from '@/diaporamas/theme'
import { taillePolice, zone } from './geometrie'

const props = defineProps({
  element: { type: Object, required: true },
})

const alignement = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }

const style = computed(() => ({
  ...zone(props.element),
  '--taille': taillePolice(props.element.taille),
  color: `#${props.element.couleur}`,
  textAlign: props.element.align,
  justifyContent: alignement[props.element.valign] ?? 'flex-start',
}))

const espace = { marginBottom: taillePolice(ESPACE_PARAGRAPHE) }
</script>

<style scoped>
.diapositive-texte {
  position: absolute;
  font-size: var(--taille) !important;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.diapositive-texte--gras {
  font-weight: 700;
}

.diapositive-texte p,
.diapositive-texte ul,
.diapositive-texte li {
  font-size: inherit !important;
  line-height: inherit !important;
}

.diapositive-texte p,
.diapositive-texte ul {
  margin: 0;
  padding: 0;
}

.diapositive-texte ul {
  list-style: none;
}

.diapositive-texte li {
  position: relative;
  padding-left: 1.1em;
}

.diapositive-texte li::before {
  position: absolute;
  left: 0;
}

.puce--point::before {
  content: '•';
}

.puce--coche::before {
  content: '✓';
}

.diapositive-texte a {
  color: inherit;
  text-decoration: underline;
}
</style>
