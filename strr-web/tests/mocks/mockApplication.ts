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
    address: '123 Main St',
    city: 'Victoria',
    country: 'CA',
    nickname: '',
    postalCode: 'V3V2V2',
    province: 'BC',
    addressLineTwo: ''
  },
  unitDetails: {
    ownershipType: 'OWN',
    propertyType: 'SINGLE_FAMILY_HOME',
    rentalUnitSpaceType: 'ENTIRE_HOME',
    isUnitOnPrincipalResidenceProperty: true,
    hostResidence: 'SAME_UNIT',
    numberOfRoomsForRent: 1
  },
  registrationType: RegistrationTypeE.HOST,
  propertyManager: mockPropertyManager
}

const mockApplicationHeader: ApplicationHeaderI = {
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
  reviewer: {
    displayName: 'Joe Smith',
    username: 'joes@idir'
  },
  submitter: {
    displayName: 'BCREGTEST TWENTYFIVE',
    username: 'bcsc/sdfasdfasdf'
  },
  registrationStatus: RegistrationStatusE.ACTIVE,
  status: ApplicationStatusE.AUTO_APPROVED,
  isCertificateIssued: true,
  hostActions: [],
  examinerActions: [ExaminerActionsE.ISSUE_CERTIFICATE],
  hostStatus: HostApplicationStatusE.AUTO_APPROVED,
  examinerStatus: ExaminerApplicationStatusE.FULL_REVIEW_APPROVED
}

export const mockApplicationApproved: ApplicationI = {
  header: mockApplicationHeader,
  registration: mockApplicationDetails,
  selectedAccount: {
    sbc_account_id: '12345'
  }
}

export const mockApplicationApprovedWithSecondaryContact: ApplicationI = {
  header: mockApplicationHeader,
  registration: {
    ...mockApplicationDetails,
    secondaryContact: {
      details: {
        emailAddress: 'secondary@email.com',
        faxNumber: '',
        phoneNumber: '2505551234',
        preferredName: 'Jane Smith',
        extension: ''
      },
      name: {
        firstName: 'Jane',
        lastName: 'Smith',
        middleName: ''
      },
      socialInsuranceNumber: '',
      businessNumber: '',
      dateOfBirth: '1990-01-01',
      mailingAddress: {
        address: '789 Test',
        addressLineTwo: '',
        city: 'Victoria',
        country: 'CA',
        postalCode: 'V8V3V3',
        province: 'BC'
      }
    }
  },
  selectedAccount: {
    sbc_account_id: '12345'
  }
}

export const mockApplicationApprovedWithDocuments: ApplicationI = {
  header: mockApplicationHeader,
  registration: {
    ...mockApplicationDetails,
    documents: [
      {
        fileKey: '809bf24f-a2b9-4740-af84-8297bc346f1d',
        fileName: 'Test_test',
        fileType: 'application/octet-stream'
      }
    ]
  },
  selectedAccount: {
    sbc_account_id: '12345'
  }
}

export const mockApplicationPaymentDue: ApplicationI = {
  header: {
    ...mockApplicationHeader,
    registrationStatus: RegistrationStatusE.ACTIVE,
    status: ApplicationStatusE.PAYMENT_DUE,
    isCertificateIssued: false,
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
    ...mockApplicationHeader,
    registrationStatus: RegistrationStatusE.ACTIVE,
    status: ApplicationStatusE.FULL_REVIEW,
    isCertificateIssued: false,
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
