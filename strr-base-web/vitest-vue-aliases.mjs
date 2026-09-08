// strr-base-web is extended as a local sibling layer, with its own fully
// separate node_modules - Vite's `resolve.dedupe` can't reconcile that with
// each consuming app's own copy of Vue (dedupe only picks among candidates
// already reachable via the app's own resolution; strr-base-web's
// node_modules is a wholly separate, unrelated tree, not a nested/hoisted
// duplicate within it). A component resolved from inside it (e.g. via
// @daxiom/nuxt-core-layer-test) then pulls in a second, physically distinct
// copy of Vue's runtime, and mounting a component tree that spans both
// crashes on Vue's internal per-instance checks ("Cannot read properties of
// null (reading 'ce')") since the two copies don't share module-level state.
//
// Each consuming app's vitest.config.ts (strr-host-pm-web, strr-examiner-web,
// strr-platform-web, strr-strata-web) forces every resolution of these
// packages - regardless of which directory the importing file lives in - to
// its own copy via an explicit alias, built by calling resolveVueAliases()
// with a `require` created from that app's own vitest.config.ts (so
// require.resolve still resolves against the app's own node_modules, not
// strr-base-web's) - kept here as one shared module rather than duplicated
// in each app's own config.
const VUE_PACKAGES = ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared']

export function resolveVueAliases (require) {
  return Object.fromEntries(VUE_PACKAGES.map(pkg => [pkg, require.resolve(pkg)]))
}
