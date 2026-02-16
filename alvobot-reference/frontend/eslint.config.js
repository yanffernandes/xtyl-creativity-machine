import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importX from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage', 'node_modules', '*.config.js', '*.config.ts']),

  // ============================================
  // TypeScript + React files
  // ============================================
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importX,
      'jsx-a11y': jsxA11y,
      react,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // ============================================
      // React Refresh (Vite HMR)
      // ============================================
      'react-refresh/only-export-components': 'off',

      // ============================================
      // React Hooks - Core rules only
      // ============================================
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Disable experimental/unstable rules
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',

      // ============================================
      // React Best Practices
      // ============================================
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off', // Not needed with React 17+ JSX transform
      'react/jsx-uses-vars': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-unescaped-entities': 'off', // Portuguese text uses quotes naturally
      'react/no-unknown-property': 'error',
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/self-closing-comp': ['warn', { component: true, html: true }],
      'react/void-dom-elements-no-children': 'error',

      // ============================================
      // TypeScript - Strict but Practical
      // ============================================
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/no-non-null-assertion': 'off', // Common pattern with optional chaining
      '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],

      // ============================================
      // Import Organization
      // ============================================
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: 'react-dom/**',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'react-dom'],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import-x/no-duplicates': ['warn', { 'prefer-inline': true }],
      'import-x/first': 'warn',
      'import-x/newline-after-import': 'warn',
      'import-x/no-cycle': 'off', // Expensive - enable only when debugging
      'import-x/no-self-import': 'off', // Requires resolver
      'import-x/no-useless-path-segments': 'off', // Requires resolver

      // ============================================
      // Accessibility (jsx-a11y)
      // ============================================
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': [
        'warn',
        {
          components: ['Link'],
          specialLink: ['to'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/html-has-lang': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/no-access-key': 'warn',
      'jsx-a11y/no-autofocus': 'off', // Sometimes needed for UX
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'warn',

      // ============================================
      // JavaScript Best Practices
      // ============================================
      'no-case-declarations': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-template': 'warn',
      'prefer-spread': 'warn',
      'prefer-rest-params': 'warn',
      'no-param-reassign': ['warn', { props: false }],
      'no-nested-ternary': 'off', // Too restrictive
      'no-unneeded-ternary': 'warn',
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
      curly: ['warn', 'multi-line', 'consistent'],
      'default-case-last': 'warn',
      'no-else-return': ['warn', { allowElseIf: false }],
      'no-lonely-if': 'warn',
      'no-useless-return': 'warn',
      'no-useless-rename': 'warn',
      'object-shorthand': ['warn', 'always'],
      'prefer-arrow-callback': ['warn', { allowNamedFunctions: true }],
      'arrow-body-style': 'off', // Let devs decide
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ForInStatement',
          message: 'for..in loops iterate over the entire prototype chain. Use Object.keys() instead.',
        },
      ],

      // ============================================
      // Potential Bugs
      // ============================================
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-case': 'error',
      'no-empty-pattern': 'error',
      'no-fallthrough': ['error', { commentPattern: 'falls?\\s*through' }],
      'no-invalid-regexp': 'error',
      'no-loss-of-precision': 'error',
      'no-promise-executor-return': 'off', // setTimeout pattern is common and safe
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-private-class-members': 'warn',
      'require-atomic-updates': 'warn',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
])
