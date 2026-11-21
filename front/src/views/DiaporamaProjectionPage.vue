<!-- Projection d'un diaporama publié (API publique filtrée), ou aperçu d'un brouillon pour un
     administrateur (API /api/apercu-diaporamas : statut, couverture, contrôles, relecture). L'aperçu applique les
     mêmes règles d'accès côté serveur : sans droit, rien n'est affiché. -->
<template>
  <main class="projection-page">
    <p
      v-if="chargement"
      role="status"
    >
      Chargement du diaporama…
    </p>
    <p
      v-else-if="!diaporama"
      class="projection-page__erreur"
      role="alert"
    >
      {{ apercu
        ? 'Aperçu indisponible : il est réservé aux administrateurs connectés au site.'
        : 'Ce diaporama n\'est pas disponible. Il n\'est peut-être pas publié, ou il est réservé à d\'autres personnes.' }}
    </p>
    <template v-else>
      <header class="projection-page__entete">
        <p class="projection-page__surtitre">
          {{ apercu ? 'Aperçu (administrateur)' : 'Projection' }}
        </p>
        <h1>{{ diaporama.titre }}</h1>
        <p
          v-if="apercu"
          class="projection-page__etat"
          data-testid="apercu-etat"
        >
          Statut : <strong>{{ diaporama.statut }}</strong>
          <template v-if="diaporama.cible">
            · cible : {{ diaporama.cible.type }} « {{ diaporama.cible.titre }} »
          </template>
          <template v-if="diaporama.couverture">
            · {{ diaporama.couverture.exploites }} cours publiés exploités sur {{ diaporama.couverture.total }}
          </template>
        </p>
        <p
          v-if="diaporama.objectif"
          class="projection-page__objectif"
        >
          Objectif : {{ diaporama.objectif }}
        </p>
      </header>

      <ProjectionDiaporama
        ref="projection"
        :diaporama="diaporama"
        :images="images"
        :site="siteName"
      />

      <section
        v-if="apercu"
        class="projection-page__controles"
        aria-label="Contrôles"
        data-testid="apercu-controles"
      >
        <h2>Contrôles</h2>
        <p v-if="(diaporama.controles ?? []).length === 0">
          Aucun contrôle signalé à l'enregistrement.
        </p>
        <ul v-else>
          <li
            v-for="(c, i) in diaporama.controles"
            :key="i"
          >
            <strong>{{ c.niveau === 'bloquant' ? 'Bloquant' : 'Avertissement' }}</strong>
            ({{ c.code }}) : {{ c.message }}
          </li>
        </ul>
        <h3>Contrôle d'affichage (dans ce navigateur)</h3>
        <AppButton
          variant="outline"
          size="md"
          data-testid="apercu-controle-rendu"
          @click="verifierAffichage"
        >
          Vérifier toutes les diapositives
        </AppButton>
        <p
          v-if="rendu"
          role="status"
        >
          {{ rendu.length === 0 ? 'Aucun débordement ni recouvrement de texte détecté.' : `${rendu.length} problème(s) d'affichage :` }}
        </p>
        <ul v-if="rendu?.length">
          <li
            v-for="(p, i) in rendu"
            :key="i"
          >
            Diapositive {{ p.diapositive }}, étape {{ p.etape }} : {{ p.message }}
          </li>
        </ul>
      </section>

      <DiaporamaActions
        :diaporama="diaporama"
        :audience="diaporama.audience ?? 'apprendre'"
        :cible="diaporama.cible?.type === 'parcours' || diaporama.parcours ? 'parcours' : (diaporama.chapitre ? 'chapitre' : 'cours')"
        :charger-captures="chargerCaptures"
      />
    </template>
  </main>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import ProjectionDiaporama from '@/components/features/diaporamas/ProjectionDiaporama.vue'
import DiaporamaActions from '@/components/features/diaporamas/DiaporamaActions.vue'
import { chargerApercuDiaporama, chargerDiaporama } from '@/services/diaporamas'
import { chargerCaptures } from '@/services/captures'
import { chargerImages } from '@/diaporamas/images'
import { controlerRendu } from '@/diaporamas/controleRendu'
import { useCustomization } from '@/composables/ui/useCustomization'

const props = defineProps({
  id: { type: Number, required: true },
  apercu: { type: Boolean, default: false },
})

const { siteName } = useCustomization()
const chargement = ref(true)
const diaporama = ref(null)
const images = ref({})
const projection = ref(null)
const rendu = ref(null)

onMounted(async () => {
  try {
    diaporama.value = props.apercu ? await chargerApercuDiaporama(props.id) : await chargerDiaporama(props.id)
    if (diaporama.value) images.value = await chargerImages(diaporama.value, { chargerCaptures })
  } catch {
    diaporama.value = null
  } finally {
    chargement.value = false
  }
})

// Parcourt chaque diapositive et chaque étape, et mesure le texte réellement affiché
const verifierAffichage = async () => {
  const problemes = []
  const total = diaporama.value?.diapositives?.length ?? 0
  // Mesure sans transition : une forme en mouvement fausserait les positions
  const mouvementAvant = projection.value.mouvement
  projection.value.mouvement = false
  for (let i = 0; i < total; i += 1) {
    projection.value.allerA(i)
    let etape = 0
    for (;;) {
      await nextTick()
      const zone = document.querySelector('[data-testid="projection-zone"] .diapositive')
      controlerRendu(zone).forEach((message) => problemes.push({ diapositive: i + 1, etape: etape + 1, message }))
      const avant = projection.value.etape
      if (projection.value.index !== i) break
      projection.value.suivant()
      await nextTick()
      if (projection.value.index !== i || projection.value.etape === avant) break
      etape += 1
    }
  }
  projection.value.allerA(0)
  projection.value.mouvement = mouvementAvant
  rendu.value = problemes
}
</script>

<style scoped>
.projection-page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: grid;
  gap: 1.25rem;
}

.projection-page__entete h1 {
  margin: 0.2rem 0 0.4rem;
}

.projection-page__surtitre {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4b5563;
  font-size: 0.85rem;
}

.projection-page__etat,
.projection-page__objectif {
  margin: 0.2rem 0 0;
}

.projection-page__erreur {
  padding: 1rem;
  border-radius: 0.75rem;
  background: #fff1f2;
}

.projection-page__controles {
  padding: 1rem 1.15rem;
  border: 1px solid #c9d1e0;
  border-radius: 0.75rem;
  background: #eef2fb;
}

.projection-page__controles h2,
.projection-page__controles h3 {
  margin: 0.2rem 0 0.5rem;
  font-size: 1.1rem !important;
}
</style>
