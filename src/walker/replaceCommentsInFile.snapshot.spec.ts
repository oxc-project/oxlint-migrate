import { describe, expect, it } from 'vitest';
import replaceCommentsInFile from './replaceCommentsInFile.js';
import { DefaultReporter } from '../reporter.js';
import { nurseryRules } from '../generated/rules.js';

describe('replaceCommentsInFile snapshots', () => {
  describe('TypeScript files', () => {
    it('should handle mixed line and block comments', () => {
      const source = `
import { foo } from 'bar';

// eslint-disable-next-line no-debugger
debugger;

/* eslint-disable no-console */
console.log('hello');
/* eslint-enable no-console */

const x = 1; // eslint-disable-line no-unused-vars

/* eslint-disable no-debugger, no-console -- these are needed for dev */
debugger;
console.log('dev mode');
/* eslint-enable no-debugger, no-console */
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });

    it('should handle unsupported inline config comments', () => {
      const source = `
/* eslint eqeqeq: "off", curly: "error" */
/* global jQuery, lodash */

// eslint-disable-next-line no-debugger
debugger;

/* eslint no-console: "warn" -- temporarily allow */
console.log('test');
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });

    it('should handle file with no eslint comments', () => {
      const source = `
import { foo } from 'bar';

// This is a regular comment
const x = 1;

/* Another regular comment */
function hello() {
  return 'world';
}
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });

    it('should handle all directive types together', () => {
      const source = `
/* eslint-disable no-console */

// eslint-disable-next-line no-debugger
debugger;

console.log('test'); // eslint-disable-line no-console

/* eslint-enable no-console */
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });
  });

  describe('Vue files', () => {
    it('should handle comments across multiple script blocks', () => {
      const source = `<template>
  <div>
    <!-- This HTML comment should not be touched -->
    <h1>Hello</h1>
  </div>
</template>

<script setup lang="ts">
// eslint-disable-next-line no-debugger
debugger;

/* eslint-disable no-console */
console.log('setup');
/* eslint-enable no-console */
</script>

<script lang="ts">
/* eslint-disable no-debugger -- needed in dev */
export default {
  mounted() {
    debugger;
  }
};
/* eslint-enable no-debugger */
</script>

<style scoped>
.hello { color: red; }
</style>
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.vue', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });
  });

  describe('Svelte files', () => {
    it('should handle comments in script and module blocks', () => {
      const source = `<script context="module">
// eslint-disable-next-line no-console
console.log('module level');
</script>

<script lang="ts">
/* eslint-disable no-debugger */
import { onMount } from 'svelte';

onMount(() => {
  debugger; // eslint-disable-line no-debugger
});
/* eslint-enable no-debugger */
</script>

<div>Hello Svelte</div>
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.svelte', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });
  });

  describe('Astro files', () => {
    it('should handle comments in frontmatter and script blocks', () => {
      const source = `---
// eslint-disable-next-line no-debugger
debugger;

/* eslint-disable no-console */
console.log('frontmatter');
/* eslint-enable no-console */
---

<html>
<body>
  <h1>Hello Astro</h1>
  <script>
    // eslint-disable-next-line no-console
    console.log('inline script');
  </script>
</body>
</html>
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.astro', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });
  });

  describe('JSX files', () => {
    it('should handle comments in JSX', () => {
      const source = `
import React from 'react';

/* eslint-disable no-console */

// eslint-disable-next-line no-debugger
debugger;

function App() {
  console.log('render'); // eslint-disable-line no-console
  return <div>Hello</div>;
}

/* eslint-enable no-console */

export default App;
`;
      const reporter = new DefaultReporter();
      const result = replaceCommentsInFile('/tmp/test.tsx', source, {
        reporter,
      });
      expect({
        output: result,
        warnings: reporter.getWarnings(),
      }).toMatchSnapshot();
    });
  });

  describe('with nursery rules', () => {
    it('should snapshot with and without nursery option', () => {
      const nurseryRule = nurseryRules[0];
      const source = `
// eslint-disable-next-line ${nurseryRule}
const x = 1;

// eslint-disable-next-line no-console
console.log('test');
`;
      const reporter1 = new DefaultReporter();
      const withoutNursery = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter: reporter1,
      });

      const reporter2 = new DefaultReporter();
      const withNursery = replaceCommentsInFile('/tmp/test.ts', source, {
        reporter: reporter2,
        withNursery: true,
      });

      expect({
        withoutNursery: {
          output: withoutNursery,
          warnings: reporter1.getWarnings(),
        },
        withNursery: {
          output: withNursery,
          warnings: reporter2.getWarnings(),
        },
      }).toMatchSnapshot();
    });
  });
});
