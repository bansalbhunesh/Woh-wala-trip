import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'storybook-static/**', 'coverage/**', 'ai-worker/**'],
  },
];

export default config;
