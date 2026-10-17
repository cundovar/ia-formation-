import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: [
      'dist/',
      'dev-dist/',
      'node_modules/',
      'storybook-static/',
      'coverage/',
      'public/',
      'build-output',
      '.vite'
    ],
  },

  js.configs.recommended,

  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Laboratoires : moteur et simulateurs purs, sans interface ni réseau (regles/07-laboratoires.md)
  {
    files: ['src/laboratoires/**/*.js'],
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-imports': ['error', {
        paths: ['vue', 'pinia', 'vue-router', 'axios'],
        patterns: [{ group: ['@/services/*', '@/composables/*', '@/stores/*', '**/services/*'], message: 'Le moteur des laboratoires ne fait aucun appel réseau.' }],
      }],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Le simulateur ne fait aucun appel réseau.' },
        { name: 'XMLHttpRequest', message: 'Le simulateur ne fait aucun appel réseau.' },
        { name: 'WebSocket', message: 'Le simulateur ne fait aucun appel réseau.' },
        { name: 'EventSource', message: 'Le simulateur ne fait aucun appel réseau.' },
        { name: 'localStorage', message: 'Les laboratoires n\'enregistrent rien (LAB-07).' },
        { name: 'indexedDB', message: 'Les laboratoires n\'enregistrent rien (LAB-07).' },
      ],
    },
  },
]
