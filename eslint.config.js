const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
    {
        ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.angular/**'],
    },

    {
        files: ['**/*.ts'],

        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            ...angular.configs.tsRecommended,
        ],

        processor: angular.processInlineTemplates,

        rules: {
            '@typescript-eslint/no-explicit-any': 'error',

            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            '@typescript-eslint/no-empty-function': 'error',

            'no-console': 'warn',

            eqeqeq: ['error', 'always'],

            '@angular-eslint/prefer-inject': 'error',

            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],

            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
        },
    },

    {
        files: ['**/*.html'],

        extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    },

    prettier,
);
