<template>
  <!-- Version PDF : une diapositive par page, notes en dessous si demandé.
       Une scène animée est imprimée dans sa vue fixe, avec ses étapes légendées et numérotées (DIA-09) :
       sous les notes, ou sur une page qui suit la diapositive quand la page a la taille de la diapositive.
       Invisible à l'écran ; à l'impression, seul ce bloc est imprimé (classe sur body). -->
  <Teleport to="body">
    <div
      class="diaporama-impression"
      :class="{ 'diaporama-impression--notes': avecNotes }"
    >
      <template
        v-for="(diapositive, index) in plan.diapositives"
        :key="index"
      >
        <article class="diaporama-impression__page">
          <DiapositiveHtml
            :diapositive="diapositive"
            :maitre="decors[diapositive.maitre]"
            :numero="index + 1"
            :format="plan.format"
            :etape="-1"
            :mouvement="false"
            niveau-titre="h2"
          />
          <div
            v-if="avecNotes && diapositive.notes"
            class="diaporama-impression__notes"
          >
            <p class="diaporama-impression__notes-titre">
              Notes de présentation
            </p>
            <p>{{ diapositive.notes }}</p>
          </div>
          <SceneLegendes
            v-if="avecNotes && diapositive.scene"
            :scene="diapositive.scene"
          />
        </article>
        <article
          v-if="!avecNotes && diapositive.scene"
          class="diaporama-impression__page diaporama-impression__page--etapes"
        >
          <p class="diaporama-impression__notes-titre">
            Diapositive {{ index + 1 }} · {{ diapositive.titre }}
          </p>
          <SceneLegendes :scene="diapositive.scene" />
        </article>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { h } from 'vue'
import DiapositiveHtml from './DiapositiveHtml.vue'

// Équivalent fixe d'une scène : description, puis étapes numérotées
const SceneLegendes = (props) => h('div', { class: 'diaporama-impression__scene' }, [
  h('p', [h('strong', props.scene.genre === 'demonstration' ? 'Démonstration : ' : 'Schéma : '), props.scene.description]),
  h('ol', props.scene.etapes.map((etape, i) => h('li', { key: i }, etape.legende))),
])
SceneLegendes.props = { scene: { type: Object, required: true } }

defineProps({
  plan: { type: Object, required: true },
  decors: { type: Object, required: true },
  avecNotes: { type: Boolean, default: false },
})
</script>

<style>
/* Styles globaux : le bloc est envoyé directement dans body */
.diaporama-impression {
  display: none;
}

@media print {
  body.impression-diaporama > :not(.diaporama-impression) {
    display: none !important;
  }

  html:has(body.impression-diaporama),
  body.impression-diaporama {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  body.impression-diaporama .diaporama-impression {
    display: block;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .diaporama-impression__page {
    break-after: page;
    break-inside: avoid;
    margin: 0;
  }

  /* Sans les notes, la page a exactement la taille de la diapositive : rien ne déborde sur une page vide */
  .diaporama-impression:not(.diaporama-impression--notes) .diaporama-impression__page {
    height: 7.5in;
    overflow: hidden;
  }

  .diaporama-impression__page:last-child {
    break-after: auto;
  }

  .diaporama-impression--notes .diaporama-impression__page .diapositive {
    border: 1px solid #cbd5e1;
  }

  .diaporama-impression__notes {
    margin-top: 6mm;
    font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.45;
    color: #000;
  }

  .diaporama-impression__notes p {
    margin: 0 0 2mm;
  }

  .diaporama-impression__notes-titre {
    font-weight: 700;
  }

  .diaporama-impression__scene {
    margin-top: 4mm;
    font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.45;
    color: #000;
  }

  /* Numéros visibles : Tailwind retire les puces des listes */
  .diaporama-impression__scene ol {
    margin: 2mm 0 0;
    padding-left: 8mm;
    list-style: decimal;
  }

  /* Page des étapes, au format de la diapositive : texte assez grand pour être lu après projection */
  .diaporama-impression__page--etapes {
    box-sizing: border-box;
    padding: 0.75in;
    font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
    font-size: 20pt;
  }

  .diaporama-impression__page--etapes .diaporama-impression__scene {
    font-size: 20pt;
  }
}
</style>
