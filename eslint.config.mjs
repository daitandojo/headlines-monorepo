// eslint.config.mjs (version 2.0.0)
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import globals from 'globals'
import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  js.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/ai-services/src/shared/**',
              from: ['./packages/**/node.js', './packages/**/next.js'],
              message:
                'Violation: Shared AI services cannot import environment-specific entry points.',
            },
            {
              target: './packages/ai-services/src/next/**',
              from: './packages/**/node.js',
              message:
                'Violation: Next.js-specific AI services cannot import Node.js-only modules.',
            },
            {
              target: './apps/client/**',
              from: './packages/scraper-logic/node.js',
              message:
                'Violation: The Next.js client app cannot import the Node-only scraper-logic package.',
            },
          ],
        },
      ],
    },
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'apps/pipeline/backup/**',
      'apps/pipeline/logs/**',
    ],
  },
]

export default eslintConfig
