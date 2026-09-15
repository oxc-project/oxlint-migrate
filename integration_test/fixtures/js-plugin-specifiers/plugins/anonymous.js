/** Local plugin without any `meta`, so nothing but the alias identifies it. */
export default {
  rules: {
    'no-anonymous': {
      create(context) {
        return {
          Identifier(node) {
            if (node.name === 'anonymous') {
              context.report({ node, message: 'no anonymous' });
            }
          },
        };
      },
    },
  },
};
