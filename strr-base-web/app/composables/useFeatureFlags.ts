const ldStore = useConnectLaunchdarklyStore()

/**
 * Composable to retrieve feature flags from LaunchDarkly.
 */
export const useFeatureFlags = () => {
  const isFeatureEnabled = (featureFlagName: string) => computed((): boolean =>
    ldStore.getStoredFlag(featureFlagName) ?? false
  )

  return {
    isFeatureEnabled
  }
}
