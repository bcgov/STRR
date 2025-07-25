/**
 * Helper functions for business license document upload feature
 */

export const AFFECTED_MUNICIPALITIES = [
  'City of Courtenay',
  'City of Kamloops',
  'City of Kelowna',
  'City of Mission',
  'City of North Vancouver',
  'City of Port Alberni',
  'City of Port Coquitlam',
  'City of Port Moody',
  'City of Prince Rupert',
  'City of Surrey',
  'City of Vernon',
  'City of Williams Lake',
  'District of Invermere',
  'District of Lillooet',
  'District of North Cowichan',
  'District of North Vancouver',
  'District of West Vancouver',
  'Town of Golden',
  'Town of Ladysmith',
  'Town of Osoyoos',
  'Town of Sidney',
  'Town of Smithers'
]

/**
 * Check if registration is in an affected municipality that requires business license upload
 * @param jurisdiction - The jurisdiction/municipality name from registration
 * @returns boolean indicating if business license upload is required
 */
export const isAffectedMunicipality = (jurisdiction?: string): boolean => {
  if (!jurisdiction) { return false }
  return AFFECTED_MUNICIPALITIES.includes(jurisdiction)
}

/**
 * Check if registration needs business license document upload
 * @param jurisdiction - The jurisdiction from registration response
 * @param isFeatureEnabled - Whether the feature flag is enabled
 * @returns boolean indicating if business license upload should be shown
 */
export const needsBusinessLicenseUpload = (
  jurisdiction?: string,
  isFeatureEnabled = false
): boolean => {
  return isFeatureEnabled && isAffectedMunicipality(jurisdiction)
}
