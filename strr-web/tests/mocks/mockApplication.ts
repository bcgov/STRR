export const mockApplicationApproved: ApplicationI = {
  header: {
    applicationNumber: '',
    applicationDateTime: '2024-08-14T22:24:42.006030+00:00',
    decisionDate: '2024-08-16T11:08:40.948148+00:00',
    id: 1,
    name: 'registration',
    paymentAccount: '1699',
    paymentStatus: 'CREATED',
    paymentToken: 39363,
    registrationEndDate: '2025-08-16T11:08:40.935161',
    registrationId: 1,
    registrationNumber: 'BCH24527283787',
    registrationStartDate: '2024-08-16T11:08:40.935161+00:00',
    registrationStatus: RegistrationStatusE.ACTIVE,
    reviewer: {
      displayName: 'Joe Smith',
      username: 'joes@idir'
    },
    status: ApplicationStatusE.AUTO_APPROVED,
    submitter: {
      displayName: 'BCREGTEST TWENTYFIVE',
      username: 'bcsc/sdfasdfasdf'
    }
  },
  registration: {
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
      isPrincipalResidence: true,
      nonPrincipalOption: 'Some Option',
      specifiedServiceProvider: 'Some Service Provider',
      agreedToRentalAct: true,
      agreedToSubmit: true
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
      propertyType: 'SECONDARY'
    },
    registrationType: RegistrationTypeE.HOST
  },
  selectedAccount: {
    sbc_account_id: '12345'
  }
}
