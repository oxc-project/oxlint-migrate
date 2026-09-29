/** Local plugin that names itself like an npm package, but is not one. */
export default {
  meta: { name: 'eslint-plugin-fixture-named' },
  rules: {
    'no-named': {
      create(context) {
        return {
          Identifier(node) {
            if (node.name === 'named') {
              context.report({ node, message: 'no named' });
            }
          },
        };
      },
    },
  },
};
