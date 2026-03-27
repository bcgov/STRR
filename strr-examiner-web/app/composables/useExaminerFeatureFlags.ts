export const useExaminerFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isPropertyAddressFilterEnabled: isFeatureEnabled('enable-examiner-address-filter'),
    isApplicantFilterEnabled: isFeatureEnabled('enable-examiner-applicant-filter'),
    isRequirementFilterEnabled: isFeatureEnabled('enable-examiner-requirement-filter'),
    isSubmissionDateFilterEnabled: isFeatureEnabled('enable-examiner-submission-date-filter'),
    isLastModifiedFilterEnabled: isFeatureEnabled('enable-examiner-last-modified-filter'),
    isNewDocumentIndicatorEnabled: isFeatureEnabled('enable-examiner-new-document-indicator'),
    isSplitDashboardTableEnabled: isFeatureEnabled('enable-examiner-split-dashboard-table'),
    isHistoricalApplicationsTableEnabled: isFeatureEnabled('enable-examiner-historical-applications-table'),
    isExaminerDecisionsEnabled: isFeatureEnabled('enable-examiner-decisions'),
    isSnapshotVersionsTableEnabled: isFeatureEnabled('enable-examiner-snapshot-versions-table')
  }
}
