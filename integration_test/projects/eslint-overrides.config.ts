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
    rules: {
      'react/jsx-filename-extension': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    // The second config should override the first if they have the same rule with the same settings.
    // And then get deleted entirely in the cleanup step since it becomes redundant (off is the default
    // in the default config, so the override is pointless).
    extends: [config1, config2],

    rules: {
      'react/prop-types': 'off',
    },
  },
]);
