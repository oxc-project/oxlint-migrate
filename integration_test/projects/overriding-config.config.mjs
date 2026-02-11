// This should result in prefer-const being disabled for all files, as the last config has no `files` and so should
// override the previous configs, even the one that has `files` set to `**/*.ts`.
// This SHOULD result in a config with no rules set, even though that feels goofy.
export default [
  { rules: { 'prefer-const': 'warn' } },
  { files: ['**/*.ts'], rules: { 'prefer-const': 'error' } },
  { rules: { 'prefer-const': 'off' } },
];
