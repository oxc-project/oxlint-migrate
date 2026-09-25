import named from '../plugins/named.js';

// The config lives one directory below the generated `.oxlintrc.json`, so the
// specifier has to be rebased onto the output directory.
export default [
  {
    plugins: { mylocal: named },
    rules: { 'mylocal/no-named': 'error' },
  },
];
