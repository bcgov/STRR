export enum ApplicationStatusE {
  DRAFT = 'DRAFT',
  PAYMENT_DUE = 'PAYMENT_DUE',
  PAID = 'PAID',
  AUTO_APPROVED = 'AUTO_APPROVED',
  PROVISIONALLY_APPROVED = 'PROVISIONALLY_APPROVED',
  FULL_REVIEW_APPROVED = 'FULL_REVIEW_APPROVED',
  PROVISIONAL_REVIEW = 'PROVISIONAL_REVIEW',
  ADDITIONAL_INFO_REQUESTED = 'ADDITIONAL_INFO_REQUESTED',
  FULL_REVIEW = 'FULL_REVIEW',
  DECLINED = 'DECLINED',
  PROVISIONAL = 'PROVISIONAL'
}

export enum HostApplicationStatusE {
  DRAFT = 'Draft',
  PAYMENT_DUE = 'Payment Due',
  PAID = 'Pending Approval',
  AUTO_APPROVED = 'Approved', // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  PROVISIONALLY_APPROVED = 'Approved', // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  FULL_REVIEW_APPROVED = 'Approved',
  PROVISIONAL_REVIEW = 'Approved – Provisional', // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  FULL_REVIEW = 'Pending Approval',
  DECLINED = 'Declined'
}

export enum ExaminerApplicationStatusE {
  DRAFT = 'Draft',
  PAYMENT_DUE = 'Payment Due',
  PAID = 'Paid',
  AUTO_APPROVED = 'Approved – Automatic',
  PROVISIONALLY_APPROVED = 'Approved – Provisional',
  FULL_REVIEW_APPROVED = 'Approved – Examined',
  PROVISIONAL_REVIEW = 'Provisional Examination',
  FULL_REVIEW = 'Full Examination',
  DECLINED = 'Declined'
}
