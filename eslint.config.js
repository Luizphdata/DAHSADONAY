import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'supabase/consistency-v1'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      // Only the two rules this phase's research names (rules-of-hooks / exhaustive-deps).
      // eslint-plugin-react-hooks@7.x's `recommended`/`recommended-latest` presets also bundle
      // newer React Compiler-oriented rules (set-state-in-effect, refs, purity, etc.) that flag
      // existing, working application patterns (e.g. resetting state in an effect when a prop
      // changes) with no logic bug present. Fixing those would require rewriting application
      // logic in files this plan does not touch — out of scope for lint tooling setup.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...reactRefresh.configs.vite.rules,
      // useAuth is intentionally exported alongside the AuthProvider component in the same
      // file (documented convention, CONVENTIONS.md § Module Design) — not a Fast Refresh bug.
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, allowCompoundComponents: true, allowExportNames: ['useAuth'] }],
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.denoBuiltin },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'double'],
    },
  },
)
