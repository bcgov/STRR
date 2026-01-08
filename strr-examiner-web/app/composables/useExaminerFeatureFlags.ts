export const useExaminerFeatureFlags = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  return {
    isPropertyAddressFilterEnabled: isFeatureEnabled('enable-examiner-address-filter'),
    isApplicantFilterEnabled: isFeatureEnabled('enable-examiner-applicant-filter'),
    isRequirementFilterEnabled: isFeatureEnabled('enable-examiner-requirement-filter'),
    isSubmissionDateFilterEnabled: isFeatureEnabled('enable-examiner-submission-date-filter'),
    isLastModifiedFilterEnabled: isFeatureEnabled('enable-examiner-last-modified-filter'),
    isSplitDashboardTableEnabled: isFeatureEnabled('enable-examiner-split-dashboard-table')
  }
}
