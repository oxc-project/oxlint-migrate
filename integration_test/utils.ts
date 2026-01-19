import { expect, test } from 'vitest';
import main from '../src/index.js';
import { Options, OxlintConfig } from '../src/types.js';
import { DefaultReporter } from '../src/reporter.js';

export const getSnapshotResult = async (
  config: Parameters<typeof main>[0],
  oxlintConfig?: OxlintConfig,
  options?: Pick<Options, 'typeAware' | 'jsPlugins'>
) => {
  const reporter = new DefaultReporter();
  const result = await main(config, oxlintConfig, {
    reporter: reporter,
    merge: oxlintConfig !== undefined,
    ...options,
  });

  return {
    config: result,
    warnings: reporter
      .getReports()
      // filter out unsupported rules
      .filter((error) => !error.startsWith('unsupported rule: local/'))
      // .filter((error) => !error.startsWith('unsupported rule: perfectionist/'))
      .filter((error) => !error.startsWith('unsupported rule: toml/'))
      .filter((error) => !error.startsWith('unsupported rule: style/')),
    skipped: reporter.getSkippedRulesByCategory(),
  };
};

export const getSnapShotMergeResult = async (
  config: Parameters<typeof main>[0],
  oxlintConfig: OxlintConfig
) => {
  const result = await getSnapshotResult(config, oxlintConfig);
  const mergedResult = structuredClone(result);
  const result2 = await getSnapshotResult(config, mergedResult.config);

  expect(result2).toStrictEqual(result);

  return result2;
};

export const testProject = (
  project: string,
  projectConfig: Parameters<typeof main>[0]
) => {
  test(`${project}`, async () => {
    const result = await getSnapshotResult(projectConfig);
    expect(result).toMatchSnapshot(project);
  });

  test(`${project} --type-aware`, async () => {
    const result = await getSnapshotResult(projectConfig, undefined, {
      typeAware: true,
    });
    expect(result).toMatchSnapshot(`${project}--type-aware`);
  });

  test(`${project} merge`, async () => {
    const result = await getSnapShotMergeResult(projectConfig, {
      categories: {
        correctness: 'error',
        perf: 'error',
      },
    });
    expect(result).toMatchSnapshot(`${project}--merge`);
  });

  test(`${project} --js-plugins`, async () => {
    const result = await getSnapshotResult(projectConfig, undefined, {
      jsPlugins: true,
    });
    expect(result).toMatchSnapshot(`${project}--js-plugins`);
  });
};
