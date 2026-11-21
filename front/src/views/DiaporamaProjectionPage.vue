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

      <section
        v-if="apercu"
        class="projection-page__preparation"
        aria-label="Brief et scénario"
        data-testid="apercu-preparation"
      >
        <h2>Brief</h2>
        <p v-if="!diaporama.brief">
          Aucun brief enregistré (diaporama préparé avant le 22 novembre 2026, ou brief non transmis).
        </p>
        <dl
          v-else
          class="projection-page__brief"
          data-testid="apercu-brief"
        >
          <div>
            <dt>Statut</dt>
            <dd>{{ diaporama.brief.statut === 'confirme' ? 'Confirmé par la personne' : 'Proposé, pas encore confirmé' }}</dd>
          </div>
          <div>
            <dt>Public</dt>
            <dd>{{ diaporama.brief.public === 'former' ? 'Personnes qui forment' : 'Personnes qui apprennent' }}</dd>
          </div>
          <div>
            <dt>Durée indicative</dt>
            <dd>{{ diaporama.brief.dureeMinutes }} min</dd>
          </div>
          <div>
            <dt>Intention</dt>
            <dd>{{ INTENTIONS[diaporama.brief.intention] ?? diaporama.brief.intention }}</dd>
          </div>
          <div>
            <dt>Thème</dt>
            <dd>{{ diaporama.brief.theme }}</dd>
          </div>
          <div>
            <dt>Objectif</dt>
            <dd>{{ diaporama.brief.objectif }}</dd>
          </div>
          <div v-for="(valeur, champ) in diaporama.brief.visuel" :key="champ">
            <template v-if="valeur">
              <dt>{{ { palette: 'Palette', typographie: 'Typographie', references: 'Références', styleSchemas: 'Style des schémas', illustrations: 'Illustrations' }[champ] }}</dt>
              <dd>{{ valeur }}</dd>
            </template>
          </div>
          <div v-if="diaporama.brief.contexte">
            <dt>Contexte</dt>
            <dd>{{ diaporama.brief.contexte }}</dd>
          </div>
        </dl>

        <details
          v-if="diaporama.scenario"
          class="projection-page__scenario"
          data-testid="apercu-scenario"
        >
          <summary>Scénario pédagogique ({{ diaporama.scenario.parties.length }} parties)</summary>
          <p><strong>{{ diaporama.scenario.objectifGeneral }}</strong></p>
          <p v-if="diaporama.scenario.filRouge">
            Fil rouge : {{ diaporama.scenario.filRouge }}
          </p>
          <ol>
            <li
              v-for="partie in diaporama.scenario.parties"
              :key="partie.id"
            >
              <strong>{{ partie.titre }}</strong> ({{ partie.dureeMinutes }} min) — {{ partie.intention }}
              <span v-if="diapositivesDe(partie.id).length">
                · diapositives {{ diapositivesDe(partie.id).join(', ') }}
              </span>
              <span v-else> · aucune diapositive</span>
              <ul>
                <li v-if="partie.coursSources.length">
                  Sources : {{ partie.coursSources.map(titreCours).join(' ; ') }}
                </li>
                <li
                  v-for="(d, i) in partie.demonstrations"
                  :key="`d${i}`"
                >
                  Démonstration : {{ d }}
                </li>
                <li
                  v-for="(v, i) in partie.verifications"
                  :key="`v${i}`"
                >
                  Vérification : {{ v }}
                </li>
                <li v-if="partie.activite">
                  Activité : {{ partie.activite.consigne }} ({{ partie.activite.dureeMinutes }} min)
                </li>
                <li
                  v-for="v in partie.visuels"
                  :key="`c${v.captureId}`"
                >
                  Visuel {{ v.captureId }} : {{ v.raison }}
                </li>
                <li v-if="partie.scene">
                  Scène « {{ partie.scene.type }} » : {{ partie.scene.notion }} — {{ partie.scene.justification }}
                </li>
                <li v-if="partie.transition">
                  Transition : {{ partie.transition }}
                </li>
              </ul>
            </li>
          </ol>
        </details>
        <p v-else>
          Aucun scénario enregistré.
        </p>
      </section>

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
        <p>
          Mesuré automatiquement à l'ouverture, en 16:9 et en lecture étroite (mobile), puis envoyé au connecteur
          (verifier_diaporama). Ces mesures dépendent des polices du navigateur.
        </p>
        <AppButton
          variant="outline"
          size="md"
          data-testid="apercu-controle-rendu"
          :disabled="verification"
          @click="verifierAffichage"
        >
          {{ verification ? 'Vérification en cours…' : 'Relancer la vérification' }}
        </AppButton>
        <p
          v-if="rendu"
          role="status"
          data-testid="apercu-rendu-resume"
        >
          {{ rendu.length === 0 ? 'Aucun problème détecté par les contrôles automatiques.' : `${rendu.length} problème(s) d'affichage :` }}
          <template v-if="envoi">
            {{ envoi }}
          </template>
        </p>
        <ul v-if="rendu?.length">
          <li
            v-for="(p, i) in rendu"
            :key="i"
          >
            <a
              href="#"
              @click.prevent="montrer(p.diapositive)"
            >Diapositive {{ p.diapositive }}</a>{{ p.etape > 1 ? `, étape ${p.etape}` : '' }}
            ({{ p.format === 'etroit' ? 'lecture étroite' : '16:9' }}) : {{ p.message }}
          </li>
        </ul>
        <template v-if="diaporama.aRelire?.length">
          <h3>À relire par l'autre connecteur</h3>
          <ul>
            <li
              v-for="(r, i) in diaporama.aRelire"
              :key="i"
            >
              {{ r }}
            </li>
          </ul>
        </template>
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
import { chargerApercuDiaporama, chargerDiaporama, enregistrerControleRendu } from '@/services/diaporamas'
import { chargerCaptures } from '@/services/captures'
import { chargerImages } from '@/diaporamas/images'
import { controlerRendu } from '@/diaporamas/controleRendu'
import { useCustomization } from '@/composables/ui/useCustomization'

const props = defineProps({
  id: { type: Number, required: true },
  apercu: { type: Boolean, default: false },
  // Aperçu : diapositive à montrer d'abord (lien ?diapositive=N donné par le connecteur)
  diapositive: { type: Number, default: null },
})

const INTENTIONS = {
  explicative: 'Explicative',
  illustree: 'Illustrée (outils montrés)',
  atelier: 'Atelier (faire pratiquer)',
}

const { siteName } = useCustomization()
const chargement = ref(true)
const diaporama = ref(null)
const images = ref({})
const projection = ref(null)
const rendu = ref(null)
const verification = ref(false)
const envoi = ref('')

const diapositivesDe = (partieId) => (diaporama.value?.diapositives ?? [])
  .map((d, i) => (d?.scenarioPartie === partieId ? i + 1 : null))
  .filter(Boolean)
const titreCours = (id) => diaporama.value?.coursSources?.find((c) => c.id === id)?.titre ?? `cours ${id}`
const montrer = (numero) => {
  projection.value?.allerA(numero - 1)
  document.querySelector('[data-testid="projection-zone"]')?.scrollIntoView({ block: 'center' })
}

onMounted(async () => {
  try {
    diaporama.value = props.apercu ? await chargerApercuDiaporama(props.id) : await chargerDiaporama(props.id)
    if (diaporama.value) images.value = await chargerImages(diaporama.value, { chargerCaptures })
  } catch {
    diaporama.value = null
  } finally {
    chargement.value = false
  }
  // Aperçu : la mesure du rendu se lance seule et revient au connecteur
  if (props.apercu && diaporama.value) {
    await nextTick()
    await verifierAffichage()
    if (props.diapositive) montrer(props.diapositive)
  }
})

// Parcourt chaque diapositive et chaque étape, dans les deux formats, et mesure le texte réellement affiché
const mesurerFormat = async (format, problemes) => {
  const total = diaporama.value?.diapositives?.length ?? 0
  projection.value.formatForce = format
  for (let i = 0; i < total; i += 1) {
    projection.value.allerA(i)
    let etape = 0
    for (;;) {
      await nextTick()
      const zone = document.querySelector('[data-testid="projection-zone"] .diapositive')
      controlerRendu(zone).forEach((p) => problemes.push({ ...p, diapositive: i + 1, etape: etape + 1, format }))
      const avant = projection.value.etape
      if (projection.value.index !== i) break
      projection.value.suivant()
      await nextTick()
      if (projection.value.index !== i || projection.value.etape === avant) break
      etape += 1
    }
  }
}

const verifierAffichage = async () => {
  if (!projection.value || verification.value) return
  verification.value = true
  envoi.value = ''
  const problemes = []
  // Mesure sans transition : une forme en mouvement fausserait les positions
  const mouvementAvant = projection.value.mouvement
  projection.value.mouvement = false
  // La lecture étroite n'existe que pour le thème Atelier visuel
  const formats = diaporama.value?.theme === 'atelier_visuel' ? ['large', 'etroit'] : ['large']
  try {
    for (const format of formats) await mesurerFormat(format, problemes)
  } finally {
    projection.value.formatForce = null
    projection.value.allerA(0)
    projection.value.mouvement = mouvementAvant
    verification.value = false
  }
  rendu.value = problemes
  if (props.apercu && diaporama.value?.jetonControleRendu) {
    try {
      await enregistrerControleRendu(props.id, {
        formats,
        navigateur: navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'navigateur',
        problemes: problemes.map(({ diapositive, etape, format, element, autre, probleme, mesure }) => ({ diapositive, etape, format, element, autre, probleme, mesure })),
      }, diaporama.value.jetonControleRendu)
      envoi.value = 'Résultat transmis au connecteur.'
    } catch {
      envoi.value = 'Résultat non transmis (hors ligne ou session expirée) : relancez après reconnexion.'
    }
  }
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

.projection-page__preparation {
  padding: 1rem 1.15rem;
  border: 1px solid #e4dccb;
  border-radius: 0.75rem;
  background: #fffdf8;
}

.projection-page__preparation h2 {
  margin: 0.2rem 0 0.5rem;
  font-size: 1.1rem !important;
}

.projection-page__brief {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.4rem 1rem;
  margin: 0 0 0.75rem;
}

.projection-page__brief dt {
  font-weight: 700;
}

.projection-page__brief dd {
  margin: 0;
}

.projection-page__scenario summary {
  cursor: pointer;
  font-weight: 700;
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
