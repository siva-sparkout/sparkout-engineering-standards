// .stylelintrc.js
module.exports = {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      ['/color$/', 'fill', 'stroke', 'padding', 'margin', 'gap',
       'font-size', 'border-radius', 'box-shadow'],
      {
        ignoreValues: ['inherit', 'currentColor', 'transparent', 'none', 'auto', '0'],
        disableFix: true,
        message: 'Use a token from tokens.css. See standard 13.3.',
      },
    ],
    'declaration-no-important': true,
  },
  ignoreFiles: ['src/styles/tokens.css'],
};
