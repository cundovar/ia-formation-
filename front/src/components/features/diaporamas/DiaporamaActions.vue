<template>
  <section
    class="diaporama-actions"
    :aria-labelledby="idTitre"
    data-testid="diaporama-actions"
  >
    <h2
      :id="idTitre"
      class="diaporama-actions__titre"
    >
      {{ cible === 'chapitre' ? 'Diaporama du chapitre' : 'Diaporama du cours' }}
    </h2>
    <p class="diaporama-actions__texte">
      Une synthèse prête à projeter, avec des notes pour la personne qui présente.
      Vous pouvez la modifier et la réutiliser (licence CC BY-SA 4.0).
    </p>

    <div class="diaporama-actions__boutons">
      <AppButton
        icon="pi pi-download"
        variant="outline"
        size="md"
        :disabled="enCours"
        data-testid="diaporama-pptx"
        @click="telecharger"
      >
        Télécharger (.pptx)
      </AppButton>
      <AppButton
        icon="pi pi-print"
        variant="outline"
        size="md"
        :disabled="enCours"
        data-testid="diaporama-pdf"
        @click="imprimer"
      >
        Version PDF
      </AppButton>
      <AppButton
        :icon="apercuOuvert ? 'pi pi-eye-slash' : 'pi pi-eye'"
        variant="outline"
        size="md"
        :aria-expanded="apercuOuvert ? 'true' : 'false'"
        :aria-controls="idApercu"
        data-testid="diaporama-apercu"
        @click="basculerApercu"
      >
        {{ apercuOuvert ? 'Masquer l\'aperçu' : 'Aperçu' }}
      </AppButton>
    </div>

    <label class="diaporama-actions__notes">
      <input
        v-model="avecNotes"
        type="checkbox"
      >
      Version PDF avec les notes de présentation
    </label>

    <p
      class="diaporama-actions__statut"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </p>

    <ol
      v-if="apercuOuvert"
      :id="idApercu"
      class="diaporama-actions__apercu"
      data-testid="diaporama-vignettes"
    >
      <li
        v-for="(diapositive, index) in plan.diapositives"
        :key="index"
      >
        <DiapositiveHtml
          :diapositive="diapositive"
          :maitre="decors[diapositive.maitre]"
          :numero="index + 1"
          niveau-titre="h3"
        />
      </li>
    </ol>

    <DiaporamaImpression
      v-if="impression"
      :plan="plan"
      :decors="decors"
      :avec-notes="avecNotes"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import AppButton from '../../ui/AppButton.vue'
import DiapositiveHtml from './DiapositiveHtml.vue'
import DiaporamaImpression from './DiaporamaImpression.vue'
import { chargerImages } from '@/diaporamas/images'
import { maitres, planDiaporama } from '@/diaporamas/miseEnPage'
import { useCustomization } from '@/composables/ui/useCustomization'

const props = defineProps({
  // Contenu structuré publié (docs/PLAN_DIAPORAMAS.md § 4)
  diaporama: { type: Object, required: true },
  // Public du parcours (apprendre ou former) : couleur du thème si le diaporama ne la donne pas
  audience: { type: String, default: 'apprendre' },
  cible: { type: String, default: 'cours', validator: (valeur) => ['cours', 'chapitre'].includes(valeur) },
  // Charge les captures demandées, comme pour le cours (API /captures)
  chargerCaptures: { type: Function, required: true },
})

const { siteName } = useCustomization()

const idTitre = useId()
const idApercu = useId()
const images = ref(null)
const enCours = ref(false)
const message = ref('')
const apercuOuvert = ref(false)
const avecNotes = ref(false)
const impression = ref(false)

const contenu = computed(() => ({ ...props.diaporama, audience: props.diaporama.audience ?? props.audience }))
const plan = computed(() => planDiaporama(contenu.value, { images: images.value ?? {} }))
const decors = computed(() => maitres(plan.value, siteName.value))

const assurerImages = async () => {
  if (images.value === null) images.value = await chargerImages(contenu.value, { chargerCaptures: props.chargerCaptures })
}

const telecharger = async () => {
  enCours.value = true
  message.value = 'Préparation du diaporama…'
  try {
    await assurerImages()
    // Bibliothèque chargée seulement maintenant, pour garder la page légère
    const { telechargerPptx } = await import('@/diaporamas/construirePptx')
    await telechargerPptx(contenu.value, { images: images.value, site: siteName.value })
    message.value = 'Le diaporama est téléchargé.'
  } catch (erreur) {
    console.error('Diaporama non créé :', erreur)
    message.value = 'Le diaporama n\'a pas pu être créé. Vérifiez la connexion, puis réessayez.'
  } finally {
    enCours.value = false
  }
}

// Format de page de la version PDF : la diapositive seule, ou A4 avec les notes
let styleImpression = null
const nettoyerImpression = () => {
  document.body.classList.remove('impression-diaporama')
  styleImpression?.remove()
  styleImpression = null
  impression.value = false
  window.removeEventListener('afterprint', nettoyerImpression)
}

const imprimer = async () => {
  enCours.value = true
  message.value = 'Préparation de la version PDF…'
  try {
    await assurerImages()
    impression.value = true
    await nextTick()
    await Promise.all([...document.querySelectorAll('.diaporama-impression img')]
      .map((image) => image.decode?.().catch(() => {})))
    styleImpression = document.createElement('style')
    styleImpression.textContent = avecNotes.value
      ? '@page { size: A4 portrait; margin: 12mm; }'
      : '@page { size: 13.333in 7.5in; margin: 0; }'
    document.head.append(styleImpression)
    document.body.classList.add('impression-diaporama')
    window.addEventListener('afterprint', nettoyerImpression)
    message.value = 'Choisissez « Enregistrer au format PDF » dans la fenêtre d\'impression.'
    window.print()
  } finally {
    enCours.value = false
  }
}

const basculerApercu = async () => {
  apercuOuvert.value = !apercuOuvert.value
  if (apercuOuvert.value) await assurerImages()
}

onBeforeUnmount(nettoyerImpression)
</script>

<style scoped>
.diaporama-actions {
  max-width: 44rem;
  margin: 1.5rem auto 0;
  padding: 1.25rem;
  border: 2px solid #c7d2fe;
  border-radius: 1rem;
  background: #eef2ff;
  color: #111827;
}

.diaporama-actions__titre {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.diaporama-actions__texte {
  margin: 0.25rem 0 1rem;
  color: #374151;
}

.diaporama-actions__boutons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.diaporama-actions__notes {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-weight: 600;
}

.diaporama-actions__notes input {
  width: 1.25rem;
  height: 1.25rem;
}

.diaporama-actions__statut {
  min-height: 1.25rem;
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  color: #374151;
}

.diaporama-actions__apercu {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.diaporama-actions__apercu li {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fff;
}

/* À l'impression du cours, les boutons n'ont pas de sens */
@media print {
  .diaporama-actions {
    display: none;
  }
}
</style>
