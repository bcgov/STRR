export const useHostFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isSaveDraftEnabled: isFeatureEnabled('enable-save-draft'),
    isRenewalsEnabled: isFeatureEnabled('enable-registration-renewals'),
    isNewAddressFormEnabled: isFeatureEnabled('enable-host-new-address-form'),
    isNewRentalUnitSetupEnabled: isFeatureEnabled('enable-host-new-rental-unit-setup'),
    isNewPrDocumentsListEnabled: isFeatureEnabled('enable-host-new-pr-documents')
  }
}
