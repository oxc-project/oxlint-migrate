// thanks to https://stackoverflow.com/a/77278013/7387397
export const isEqualDeep = <T>(a: T, b: T): boolean => {
  if (a === b) {
    return true;
  }

  const bothAreObjects =
    a && b && typeof a === 'object' && typeof b === 'object';

  return Boolean(
    bothAreObjects &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([k, v]) => isEqualDeep(v, b[k as keyof T]))
  );
};
