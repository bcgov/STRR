export interface ExaminerDashboardRowI {
  applicationNumber: string;
  registrationNumber: string;
  registrationId: string;
  isCertificateIssued: boolean;
  registrationType: string;
  unitAddressCity: string;
  unitAddressPostalCode: string;
  unitAddress: string;
  status: string;
  submissionDate: string | Date;
}
