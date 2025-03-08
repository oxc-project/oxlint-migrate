import main from '../src/index.js';

export const getSnapshotResult = async (config: Parameters<typeof main>[0]) => {
  const collector: string[] = [];
  const result = await main(config, undefined, {
    reporter: collector.push.bind(collector),
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
