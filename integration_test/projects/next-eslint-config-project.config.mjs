import next from 'eslint-config-next';

const eslintConfig = [
  ...next,
  {
    rules: {
      'node/prefer-global/process': ['error', 'always'],
    },
  },
];

export default eslintConfig;
