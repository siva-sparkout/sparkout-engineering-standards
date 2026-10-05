// eslint.config.js (flat config)
export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { project: './tsconfig.json' } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      'no-console': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-sync': 'error',
      'max-lines-per-function': ['error', 75],
      'max-depth': ['error', 3],
      'sonarjs/no-commented-code': 'error',
      'no-restricted-properties': ['error', {
        object: 'process', property: 'env',
        message: 'Read config through src/config. Standard 9.',
      }],
      'no-restricted-syntax': ['error', {
        selector: "BinaryExpression[operator=/^[*/+-]$/] > Identifier[name=/[Aa]mount|[Pp]rice|[Bb]alance|[Ff]ee/]",
        message: 'Arithmetic on an amount. Use bigint minor units. Standard 12.',
      }],
    },
  },
  { files: ['src/config/**/*.ts', 'scripts/**/*.ts'], rules: { 'no-restricted-properties': 'off', 'no-console': 'off' } },
  { files: ['**/*.test.ts'], rules: { 'max-lines-per-function': 'off' } },
];
