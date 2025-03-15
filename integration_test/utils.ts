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
    upgrade: oxlintConfig !== undefined,
  });

  return {
    config: result,
    warnings: collector
      // filter out unsupported rules
      .filter((error) => !error.startsWith('unsupported rule: local/'))
      .filter((error) => !error.startsWith('unsupported rule: perfectionist/'))
      .filter((error) => !error.startsWith('unsupported rule: vue/'))
      .filter((error) => !error.startsWith('unsupported rule: regexp/'))
      .filter((error) => !error.startsWith('unsupported rule: toml/'))
      .filter((error) => !error.startsWith('unsupported rule: style/')),
  };
};

export const getSnapShotUpgradeResult = async (
  config: Parameters<typeof main>[0],
  oxlintConfig: OxlintConfig
) => {
  const result = await getSnapshotResult(config, oxlintConfig);
  const upgradedResult = structuredClone(result);
  const result2 = await getSnapshotResult(config, upgradedResult.config);

  expect(result2).toStrictEqual(result);

  return result2;
};
