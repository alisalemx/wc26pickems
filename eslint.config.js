import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude` holds agent state and git worktrees (full repo copies); linting
  // them trips the typed parser with duplicate tsconfig roots.
  globalIgnores(['dist', '.claude']),
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Vendored shadcn/ui primitives intentionally co-export variant helpers
    // (e.g. buttonVariants) alongside their component.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Node-side tooling: schedule generator, DB seed, Netlify functions.
    files: ['scripts/**/*.{ts,mts}', 'netlify/**/*.{ts,mts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
