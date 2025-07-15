import { expect } from 'vitest';
import main from '../src/index.js';
import { OxlintConfig } from '../src/types.js';

export const getSnapshotResult = async (
  config: Parameters<typeof main>[0],
  oxlintConfig?: OxlintConfig
) => {
  const collector: string[] = [];
  const result = await main(config, oxlintConfig, {
    reporter: collector.push.bind(collector),
    merge: oxlintConfig !== undefined,
  });

  return {
    config: result,
    warnings: collector
      // filter out unsupported rules
      .filter((error) => !error.startsWith('unsupported rule: local/'))
      .filter((error) => !error.startsWith('unsupported rule: perfectionist/'))
      .filter((error) => !error.startsWith('unsupported rule: toml/'))
      .filter((error) => !error.startsWith('unsupported rule: style/')),
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
