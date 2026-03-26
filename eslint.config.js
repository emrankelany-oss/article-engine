export default [
  {
    files: ['bridge/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'eqeqeq': ['warn', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'Master-Kit-main/', 'tests/', '*.config.js'],
  },
];
