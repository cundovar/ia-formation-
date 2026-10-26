<template>
  <!-- Version PDF : une diapositive par page, notes en dessous si demandé.
       Invisible à l'écran ; à l'impression, seul ce bloc est imprimé (classe sur body). -->
  <Teleport to="body">
    <div
      class="diaporama-impression"
      :class="{ 'diaporama-impression--notes': avecNotes }"
    >
      <article
        v-for="(diapositive, index) in plan.diapositives"
        :key="index"
        class="diaporama-impression__page"
      >
        <DiapositiveHtml
          :diapositive="diapositive"
          :maitre="decors[diapositive.maitre]"
          :numero="index + 1"
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
      </article>
    </div>
  </Teleport>
</template>

<script setup>
import DiapositiveHtml from './DiapositiveHtml.vue'

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
}
</style>
