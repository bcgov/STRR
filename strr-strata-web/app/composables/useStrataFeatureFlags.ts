export const useStrataFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isRenewalsEnabled: isFeatureEnabled('enable-strata-registration-renewals')
  }
}
