<!-- Démonstration du thème « Atelier visuel » et des six scènes (docs/PLAN_DIAPORAMAS.md § 13).
     Réservée aux administrateurs (et au serveur de développement) : ce sont des propositions non publiées.
     Elle n'apparaît ni dans la navigation ni dans le plan du site. -->
<template>
  <main class="demonstration">
    <template v-if="autorise">
      <header class="demonstration__entete">
        <p class="demonstration__surtitre">
          Diaporamas · démonstration
        </p>
        <h1>Thème « Atelier visuel » et scènes animées</h1>
        <p
          class="demonstration__avertissement"
          role="note"
        >
          <strong>Proposition, non publiée.</strong> {{ diaporama.proposition }}
        </p>
      </header>

      <div
        class="demonstration__onglets"
        role="tablist"
        aria-label="Exemples"
      >
        <button
          v-for="(exemple, cle) in EXEMPLES"
          :id="`onglet-${cle}`"
          :key="cle"
          type="button"
          role="tab"
          class="demonstration__onglet"
          :aria-selected="choix === cle ? 'true' : 'false'"
          :aria-controls="`panneau-${cle}`"
          :data-testid="`demonstration-onglet-${cle}`"
          @click="choix = cle"
        >
          {{ exemple.libelle }}
        </button>
      </div>

      <section
        :id="`panneau-${choix}`"
        role="tabpanel"
        :aria-labelledby="`onglet-${choix}`"
      >
        <ProjectionDiaporama
          :diaporama="diaporama"
          :images="images"
          :site="siteName"
        />
        <DiaporamaActions
          :diaporama="diaporama"
          :audience="diaporama.audience"
          cible="parcours"
          :charger-captures="choix === 'copilot' ? chargerCaptures : sansCaptures"
        />
      </section>
    </template>
    <p
      v-else
      class="demonstration__refus"
    >
      Cette page de démonstration est réservée aux administrateurs du site.
    </p>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ProjectionDiaporama from '@/components/features/diaporamas/ProjectionDiaporama.vue'
import DiaporamaActions from '@/components/features/diaporamas/DiaporamaActions.vue'
import pilote from '@/diaporamas/pilote/automatiser.json'
import galerie from '@/diaporamas/pilote/scenes.json'
import copilot from '@/diaporamas/pilote/copilot-fil-rouge.json'
import { chargerCaptures } from '@/services/captures'
import { chargerImages } from '@/diaporamas/images'
import { useData } from '@/utils/fetchDataPwa'
import { useCustomization } from '@/composables/ui/useCustomization'

const EXEMPLES = {
  pilote: { libelle: 'Pilote : 3 diapositives', diaporama: pilote },
  scenes: { libelle: 'Les six scènes', diaporama: galerie },
  copilot: { libelle: 'Pilote Copilot : brief, scénario, compositions', diaporama: copilot },
}

const { user } = useData()
const { siteName } = useCustomization()
const choix = ref('pilote')
const diaporama = computed(() => EXEMPLES[choix.value].diaporama)
const autorise = computed(() => import.meta.env.DEV || Boolean(user.value?.roles?.includes('ROLE_ADMIN')))
const sansCaptures = async () => []
// Le pilote Copilot cite des captures du back-office : chargées depuis le site, jamais inventées
const images = ref({})
watch(diaporama, async (d) => {
  images.value = {}
  if (d === copilot) {
    try {
      images.value = await chargerImages(d, { chargerCaptures })
    } catch {
      images.value = {}
    }
  }
}, { immediate: true })
</script>

<style scoped>
.demonstration {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: grid;
  gap: 1.25rem;
}

.demonstration__entete h1 {
  margin: 0.2rem 0 0.6rem;
}

.demonstration__surtitre {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4b5563;
  font-size: 0.85rem;
}

.demonstration__avertissement {
  margin: 0;
  padding: 0.75rem 1rem;
  border: 1px solid #e3dccb;
  border-radius: 0.75rem;
  background: #f3eee2;
  color: #353b49;
}

.demonstration__onglets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.demonstration__onglet {
  padding: 0.55rem 1rem;
  border: 1px solid #c9d1e0;
  border-radius: 999px;
  background: #fff;
  color: #353b49;
  font-weight: 600;
  cursor: pointer;
}

.demonstration__onglet[aria-selected='true'] {
  background: #e1eedf;
  border-color: #4f7a4b;
}

.demonstration__onglet:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}

.demonstration__refus {
  padding: 1rem;
  border-radius: 0.75rem;
  background: #f3eee2;
}
</style>
