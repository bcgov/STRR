export const useHostFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isSaveDraftEnabled: isFeatureEnabled('enable-save-draft'),
    isRenewalsEnabled: isFeatureEnabled('enable-registration-renewals'),
    isDashboardTableSortingEnabled: isFeatureEnabled('enable-host-dashboard-table-sorting'),
    isNewDashboardEnabled: isFeatureEnabled('enable-new-host-dashboard'),
    isBusinessLicenseDocumentUploadEnabled: isFeatureEnabled('enable-business-license-document-upload'),
    isEnhancedDocumentUploadEnabled: isFeatureEnabled('enable-host-enhanced-document-upload'),
    isHostSearchTextFieldsEnabled: isFeatureEnabled('enable-host-search-text-fields')
  }
}
