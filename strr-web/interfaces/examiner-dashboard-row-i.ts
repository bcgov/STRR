export interface ExaminerDashboardRowI {
  applicationNumber: string;
  registrationNumber: string;
  registrationId: string;
  isCertificateIssued: boolean;
  applicantName?: string;
  propertyAddress?: string;
  registrationType: string;
  status: string;
  submissionDate: string | Date;
  isPaid: boolean;
}
