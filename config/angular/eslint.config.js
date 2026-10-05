// eslint.config.js (flat config)
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'no-console': 'error',
      'max-lines-per-function': ['error', 75],
      'max-depth': ['error', 3],
      'max-lines': ['error', 400],
      'no-empty': 'error',
      'sonarjs/no-commented-code': 'error',
      'rxjs-x/no-nested-subscribe': 'error',
      'rxjs-angular/prefer-takeuntil': ['error', { alias: ['takeUntilDestroyed'] }],
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-restricted-properties': ['error',
        { object: 'localStorage',   property: 'setItem' },
        { object: 'sessionStorage', property: 'setItem' },
        { object: 'document',       property: 'querySelector' },
        { object: 'document',       property: 'getElementById' },
      ],
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@angular/forms', importNames: ['UntypedFormGroup', 'UntypedFormControl', 'UntypedFormBuilder'],
            message: 'Use typed reactive forms. See standard 3.' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name=/^bypassSecurityTrust/]",
        message: 'Requires an APPROVED BYPASS comment and a second reviewer. Standard 8.6.',
      }],
    },
  },
  {
    files: ['src/app/core/logging/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
