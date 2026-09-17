// @ts-check

/**
 * @type {import('@commitlint/types').UserConfig}
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type is required and must be in the allowed list
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
        'build',
        'revert'
      ]
    ],
    // Subject must start with a lowercase letter
    'subject-case': [2, 'always', 'lower-case'],
    // No trailing period in subject
    'subject-full-stop': [2, 'never', '.'],
    // Subject must be between 10 and 100 characters
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],
    // Body lines must not exceed 500 characters if present
    'body-max-line-length': [1, 'always', 500],
    // Footer lines must not exceed 500 characters if present
    'footer-max-line-length': [1, 'always', 500],
    // Scope is optional, but if used must be kebab-case
    'scope-case': [2, 'always', 'kebab-case'],
    // Empty scope is not enforced
    'scope-empty': [0, 'never'],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case']
  },
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint'
}

export default config