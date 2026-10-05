// .stylelintrc.js
module.exports = {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      ['/color$/', 'fill', 'stroke', 'padding', 'margin', 'gap',
       'font-size', 'border-radius', 'box-shadow'],
      {
        ignoreValues: ['inherit', 'currentColor', 'transparent', 'none', 'auto', '0'],
        ignoreKeywords: { '/color$/': ['inherit', 'currentColor', 'transparent'] },
        disableFix: true,
        message: 'Use a token from tokens.css. See standard 13.3.',
      },
    ],
    'declaration-no-important': true,
    'selector-pseudo-element-disallowed-list': ['ng-deep'],
  },
  ignoreFiles: ['src/styles/tokens.css'],
};
