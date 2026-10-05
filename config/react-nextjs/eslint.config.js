// eslint.config.js (flat config)
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',       // error, not warn
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'no-console': 'error',
      'max-lines-per-function': ['error', 75],
      'max-depth': ['error', 3],
      'max-lines': ['error', 250],
      'no-empty': 'error',
      'sonarjs/no-commented-code': 'error',
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'error',
      'react/no-danger': 'error',
      'react/jsx-handler-names': 'error',
      'react/jsx-props-no-spreading': ['error', { html: 'enforce', custom: 'ignore' }],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Use apiFetch from lib/api. Standard 3.2.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'localStorage',   property: 'setItem' },
        { object: 'sessionStorage', property: 'setItem' },
      ],
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[object.meta.name='import'][object.property.name='meta']",
        message: 'Read config through lib/config. Standard 8.2.',
      }],
    },
  },
  {
    files: ['src/lib/api/**/*.ts', 'src/lib/config/**/*.ts'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/lib/logging/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Presentational components stay presentational (13.5).
    files: ['src/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@tanstack/react-query', message: 'Presentational components do not fetch. Standard 13.5.' },
          { name: 'react-router-dom',      message: 'Presentational components do not navigate. Standard 13.5.' },
        ],
        patterns: [{ group: ['**/features/*'], message: 'Shared components know no domain. Standard 13.5.' }],
      }],
    },
  },
];
