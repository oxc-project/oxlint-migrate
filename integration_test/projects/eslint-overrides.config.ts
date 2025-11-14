import { globalIgnores } from 'eslint/config';
import tseslint, { type ConfigWithExtends } from 'typescript-eslint';

const config1: ConfigWithExtends = {
  rules: {
    'react/react-in-jsx-scope': 'error',
  },
};

const config2: ConfigWithExtends = {
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
};

export default tseslint.config([
  globalIgnores(['node_modules/**/*']),
  config1,
  config2,
  {
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      'react/jsx-filename-extension': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    // The second config should override the first if they have the same rule with the same settings.
    extends: [config1, config2],

    rules: {
      'react/prop-types': 'off',
    },
  },
]);
