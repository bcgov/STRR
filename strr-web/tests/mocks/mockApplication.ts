import { mockPropertyManager } from './mockPropertyManager'
import { ExaminerActionsE } from '~/enums/host-examiner-actions-e'

export const mockPrimaryContact: PrimaryContactInformationI = {
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Doe',
  businessLegalName: 'ABC Rentals Inc.',
  contactType: HostContactTypeE.INDIVIDUAL,
  preferredName: 'John Doe',
  phoneNumber: '123-456-7890',
  extension: '7653',
  faxNumber: '123-456-7891',
  emailAddress: 'john.doe@example.com',
  address: '123 Main St',
  country: 'CA',
  addressLineTwo: 'Apt 4B',
  city: 'Victoria',
  province: 'BC',
  postalCode: 'V4V 1A1',
  birthDay: '15',
  birthMonth: '6',
  birthYear: '1980',
  businessNumber: '987654321',
  socialInsuranceNumber: '123 456 789'
}

export const mockPrimaryContactBusinessType: PrimaryContactInformationI = {
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Doe',
  businessLegalName: 'ABC Rentals Inc.',
  contactType: HostContactTypeE.BUSINESS,
  preferredName: 'John Doe',
  phoneNumber: '123-456-7890',
  extension: '7653',
  faxNumber: '123-456-7891',
  emailAddress: 'john.doe@example.com',
  address: '123 Main St',
  country: 'CA',
  addressLineTwo: 'Apt 4B',
  city: 'Victoria',
  province: 'BC',
  postalCode: 'V4V 1A1',
  businessNumber: '987654321',
  socialInsuranceNumber: '',
  birthDay: '',
  birthMonth: '',
  birthYear: ''
}

export const mockApplicationDetails: HostApplicationDetailsI = {
  listingDetails: [],
  primaryContact: {
    businessNumber: '',
    dateOfBirth: '1955-07-11',
    details: {
      emailAddress: 'test1@email.com',
      faxNumber: '',
      phoneNumber: '5554443322',
      preferredName: '',
      extension: ''
    },
    mailingAddress: {
      address: '555 Main St',
      addressLineTwo: '',
      city: 'Victoria',
      country: 'CA',
      postalCode: 'V3V2V2',
      province: 'BC'
    },
    name: {
      firstName: 'BCREGTEST',
      lastName: 'TWENTYFIVE',
      middleName: ''
    },
    socialInsuranceNumber: '111 222 333'
  },
  principalResidence: {
    agreedToRentalAct: false,
    agreedToSubmit: false,
    isPrincipalResidence: false,
    nonPrincipalOption: '',
    specifiedServiceProvider: ''
  },
  unitAddress: {
    streetNumber: '123',
    streetName: 'Main St',
    unitNumber: 'test',
    city: 'Victoria',
    country: 'CA',
    nickname: '',
    postalCode: 'V3V2V2',
    province: 'BC',
    addressLineTwo: ''
  },
  unitDetails: {
    ownershipType: 'OWN',
    propertyType: 'SECONDARY',
    rentalUnitSpaceType: '',
    isUnitOnPrincipalResidenceProperty: false,
    hostResidence: undefined,
    numberOfRoomsForRent: 0
  },
  registrationType: RegistrationTypeE.HOST,
  propertyManager: mockPropertyManager
}

export const mockApplicationApproved: ApplicationI = {
  header: {
    applicationNumber: '41447512384286',
    applicationDateTime: '2024-08-14T22:24:42.006030+00:00',
    decisionDate: '2024-08-16T11:08:40.948148+00:00',
    name: 'registration',
    paymentAccount: '1699',
    paymentStatus: 'CREATED',
    paymentToken: 39363,
    registrationEndDate: '2025-08-16T11:08:40.935161',
    registrationId: 1,
    registrationNumber: 'BCH24527283787',
    registrationStartDate: '2024-08-16T11:08:40.935161+00:00',
    registrationStatus: RegistrationStatusE.ACTIVE,
    isCertificateIssued: true,
    reviewer: {
      displayName: 'Joe Smith',
      username: 'joes@idir'
    },
    status: ApplicationStatusE.AUTO_APPROVED,
    submitter: {
      displayName: 'BCREGTEST TWENTYFIVE',
      username: 'bcsc/sdfasdfasdf'
    },
    hostActions: [],
    examinerActions: [ExaminerActionsE.ISSUE_CERTIFICATE],
    hostStatus: HostApplicationStatusE.AUTO_APPROVED,
    examinerStatus: ExaminerApplicationStatusE.FULL_REVIEW_APPROVED
  },
  registration: mockApplicationDetails,
  selectedAccount: {
    sbc_account_id: '12345'
  }
}

export const mockApplicationPaymentDue: ApplicationI = {
  header: {
    applicationNumber: '41447512384286',
    applicationDateTime: '2024-08-14T22:24:42.006030+00:00',
    decisionDate: '2024-08-16T11:08:40.948148+00:00',
    name: 'registration',
    paymentAccount: '1699',
    paymentStatus: 'CREATED',
    paymentToken: 39363,
    registrationEndDate: '2025-08-16T11:08:40.935161',
    registrationId: 1,
    registrationNumber: 'BCH24527283787',
    registrationStartDate: '2024-08-16T11:08:40.935161+00:00',
    registrationStatus: RegistrationStatusE.ACTIVE,
    isCertificateIssued: false,
    reviewer: {
      displayName: 'Joe Smith',
      username: 'joes@idir'
    },
    status: ApplicationStatusE.PAYMENT_DUE,
    submitter: {
      displayName: 'BCREGTEST TWENTYFIVE',
      username: 'bcsc/sdfasdfasdf'
    },
    hostActions: [HostActionsE.SUBMIT_PAYMENT],
    examinerActions: [],
    hostStatus: HostApplicationStatusE.PAYMENT_DUE,
    examinerStatus: ExaminerApplicationStatusE.PAYMENT_DUE
  },
  registration: mockApplicationDetails,
  selectedAccount: {
    sbc_account_id: '12345'
  }
}

export const mockApplicationFullReview: ApplicationI = {
  header: {
    applicationNumber: '41447512384286',
    applicationDateTime: '2024-08-14T22:24:42.006030+00:00',
    decisionDate: '2024-08-16T11:08:40.948148+00:00',
    name: 'registration',
    paymentAccount: '1699',
    paymentStatus: 'COMPLETED',
    paymentToken: 34253,
    registrationEndDate: '2025-08-16T11:08:40.935161',
    registrationId: 1,
    registrationNumber: 'BCH24527283787',
    registrationStartDate: '2024-08-16T11:08:40.935161+00:00',
    registrationStatus: RegistrationStatusE.ACTIVE,
    isCertificateIssued: false,
    reviewer: {
      displayName: 'Joe Smith',
      username: 'joes@idir'
    },
    status: ApplicationStatusE.PAYMENT_DUE,
    submitter: {
      displayName: 'BCREGTEST TWENTYFIVE',
      username: 'bcsc/sdfasdfasdf'
    },
    hostActions: [],
    examinerActions: [ExaminerActionsE.APPROVE, ExaminerActionsE.REJECT],
    hostStatus: HostApplicationStatusE.FULL_REVIEW,
    examinerStatus: ExaminerApplicationStatusE.FULL_REVIEW
  },
  registration: mockApplicationDetails,
  selectedAccount: {
    sbc_account_id: '12345'
  }
}
