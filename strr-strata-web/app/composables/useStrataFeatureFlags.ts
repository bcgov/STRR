export const useStrataFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isSaveDraftEnabled: isFeatureEnabled('enable-save-draft'),
    isRenewalsEnabled: isFeatureEnabled('enable-strata-registration-renewals')
  }
}
