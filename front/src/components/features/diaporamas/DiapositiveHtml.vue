<!-- Une diapositive dessinée en HTML à partir de la même mise en page que le .pptx :
     sert à l'aperçu et à la version PDF. Ordre de lecture : titre, contenu, repères. -->
<template>
  <section
    class="diapositive"
    :style="{ background: `#${maitre.fond}` }"
    :aria-label="`Diapositive ${numero} : ${diapositive.titre}`"
  >
    <div
      v-for="(element, index) in formesDuMaitre"
      :key="`maitre-${index}`"
      class="diapositive__forme"
      :style="styleForme(element)"
      aria-hidden="true"
    />
    <component
      :is="niveauTitre"
      class="diapositive__titre"
      :style="styleTitre"
    >
      {{ diapositive.titre }}
    </component>
    <template
      v-for="(element, index) in diapositive.elements"
      :key="index"
    >
      <div
        v-if="element.type === 'forme'"
        class="diapositive__forme"
        :style="styleForme(element)"
        aria-hidden="true"
      />
      <img
        v-else-if="element.type === 'image'"
        class="diapositive__image"
        :src="element.data"
        :alt="element.alt"
        :style="zone(element)"
      >
      <DiapositiveTexte
        v-else
        :element="element"
      />
    </template>
    <DiapositiveTexte
      v-for="(element, index) in textesDuMaitre"
      :key="`repere-${index}`"
      :element="element"
    />
    <p
      v-if="maitre.numero"
      class="diapositive__numero"
      :style="styleNumero"
    >
      {{ numero }}
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import DiapositiveTexte from './DiapositiveTexte.vue'
import { taillePolice, zone } from './geometrie'

const props = defineProps({
  diapositive: { type: Object, required: true },
  maitre: { type: Object, required: true },
  numero: { type: Number, required: true },
  // Niveau du titre dans la page qui affiche la diapositive
  niveauTitre: { type: String, default: 'h3' },
})

const formesDuMaitre = computed(() => props.maitre.elements.filter((element) => element.type === 'forme'))
const textesDuMaitre = computed(() => props.maitre.elements.filter((element) => element.type === 'texte'))

const alignement = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }

const styleTitre = computed(() => ({
  ...zone(props.maitre.titre),
  '--taille': taillePolice(props.maitre.titre.taille),
  color: `#${props.maitre.titre.couleur}`,
  justifyContent: alignement[props.maitre.titre.valign] ?? 'flex-start',
}))

const styleNumero = computed(() => ({
  ...zone(props.maitre.numero),
  '--taille': taillePolice(props.maitre.numero.taille),
  color: `#${props.maitre.numero.couleur}`,
}))

const styleForme = (element) => ({
  ...zone(element),
  background: `#${element.fond}`,
  border: element.bordure ? `1px solid #${element.bordure}` : 'none',
  borderRadius: element.forme === 'ellipse' ? '50%' : (element.forme === 'roundRect' ? '999px' : '0'),
})
</script>

<style scoped>
.diapositive {
  position: relative;
  width: 100%;
  aspect-ratio: 13.333 / 7.5;
  overflow: hidden;
  container-type: inline-size;
  font-family: Arial, 'Liberation Sans', Arimo, sans-serif;
  color: #1f2937;
}

.diapositive__forme,
.diapositive__image,
.diapositive__titre,
.diapositive__numero {
  position: absolute;
  margin: 0;
}

/* Les titres du site imposent leur taille (!important) : la diapositive garde la sienne */
.diapositive__titre,
.diapositive__numero {
  font-size: var(--taille) !important;
}

.diapositive__titre {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  line-height: 1.15;
}

.diapositive__image {
  object-fit: contain;
}

.diapositive__numero {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
