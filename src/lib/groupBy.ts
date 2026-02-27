export const groupBy = <T, K extends string | number>(
  arr: Iterable<T>,
  mapFn: (v: T) => K,
): Record<K, T[]> => {
  const result: Record<K, T[]> = {} as any
  for (const v of arr) {
    const key = mapFn(v)
    result[key] ??= []
    result[key].push(v)
  }
  return result
}
