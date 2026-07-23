/**
 * Nuxt `defineAppConfig` merge replacers use `() => value` to replace a key entirely.
 * At runtime those keys may still be functions; normalize to a plain array before use.
 */
export function unwrapAppConfigList<T> (
  value: T[] | (() => T[]) | undefined
): T[] {
  if (value === undefined) {
    return []
  }
  return typeof value === 'function' ? (value as () => T[])() : value
}
