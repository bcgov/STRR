/**
 * Configuration interface for supporting documents.
 *
 * Allows filtering of the Supporting Documents, with options to include or exclude specific upload types and steps,
 * and to show or hide upload date badges.
 */
export interface SupportingDocumentsConfig {
    includeTypes?: DocumentUploadType[],
    excludeTypes?: DocumentUploadType[],
    includeUploadStep?: DocumentUploadStep[],
    excludeUploadStep?: DocumentUploadStep[],
    includeDateBadge?: DocumentUploadStep[], // Upload Steps for which to show the date badges
    showDateBadgeForAll?: boolean // Show date badges for all documents regardless of upload step (for registrations)
}
