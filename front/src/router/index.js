import { createRouter, createWebHistory } from 'vue-router'
import { installerRechargementVersion } from './rechargementVersion'

// Views (lazy-loaded)
const PageContent = () => import('../components/features/pages/PageContent.vue')
const CategoryPage = () => import('../views/CategoryPage.vue')
const PageQCM = () => import('../views/QCM/PageQCM.vue')
const questionQCM = () => import('../views/QCM/questionQCM.vue')
const resultQCM = () => import('../views/QCM/resultQCM.vue')
const ComponentsDemo = () => import('../views/ComponentsDemo.vue')
const HomePage = () => import('../components/features/home/HomePage.vue')
const AudiencePage = () => import('../views/AudiencePage.vue')
const MonEspacePage = () => import('../views/MonEspacePage.vue')
const RubriquePage = () => import('../views/RubriquePage.vue')
const LaboratoiresPage = () => import('../views/LaboratoiresPage.vue')
const LaboratoirePage = () => import('../views/LaboratoirePage.vue')

const routes = [
  // Route accueil
  {
    path: '/',
    name: 'home',
    component: HomePage
  },

  // Les deux entrées de l'accueil : catalogue des parcours de chaque public
  {
    path: '/apprendre',
    name: 'apprendre',
    component: AudiencePage,
    props: { audienceKey: 'apprendre' }
  },
  {
    path: '/former',
    name: 'former',
    component: AudiencePage,
    props: { audienceKey: 'former' }
  },

  // Grande rubrique de l'accueil : ses parcours (rubrique → parcours → modules → cours)
  {
    path: '/rubrique/:id(\\d+)',
    name: 'rubrique',
    component: RubriquePage,
    props: true
  },

  // Laboratoires : workflows et agents simulés dans le navigateur (docs/PLAN_LABORATOIRES.md)
  {
    path: '/laboratoires',
    name: 'laboratoires',
    component: LaboratoiresPage
  },
  {
    path: '/laboratoires/:slug',
    name: 'laboratoire',
    component: LaboratoirePage,
    props: true
  },

  // Espace de l'apprenant connecté : cours, parcours et QCM personnalisés, compte
  {
    path: '/mon-espace',
    name: 'mon-espace',
    component: MonEspacePage
  },

  // Demo composants
  {
    path: '/components-demo',
    name: 'components-demo',
    component: ComponentsDemo
  },

  // Categories
  {
    path: '/category/:category',
    name: 'category',
    component: CategoryPage,
    props: true
  },

  // Pages de contenu
  {
    path: '/pages/:slug',
    name: 'pages',
    component: PageContent,
    props: true
  },

  // QCM
  {
    path: '/qcm',
    name: 'PageQCM',
    component: PageQCM
  },
  {
    path: '/qcm/:index',
    name: 'questionQCM',
    component: questionQCM,
    props: true
  },
  {
    path: '/qcm/result',
    name: 'resultQCM',
    component: resultQCM,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory('/spa'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    return {
      top: 0,
      behavior: 'smooth'
    }
  }
})

installerRechargementVersion(router)

export default router
