/* eslint-disable max-len */
export default {
  act: {
    strrAccomodations: 'Short-Term Rental Accommodations Act',
    fippa: 'Freedom of Information and Protection of Privacy Act'
  },
  badge: {
    basicAccount: 'BASIC ACCOUNT',
    inactiveAccount: 'INACTIVE ACCOUNT'
  },
  btn: {
    ariaResumeDraft: 'Resume Draft for {number}',
    done: 'Done',
    getStarted: 'Get Started',
    goHome: 'Go Home',
    goBack: 'Go Back',
    dashboard: 'Dashboard',
    sbcConnect: 'Service BC Connect',
    copy: 'Copy',
    copied: 'Copied!',
    submit: 'Submit',
    next: 'Next',
    previous: 'Previous',
    openMainNav: 'Open Main Navigation Menu',
    closeMainNav: 'Close Main Navigation Menu',
    loginBCSC: 'Login with BC Services Card',
    createNewAccount: 'Create New Account',
    createAccount: 'Create Account',
    useThisAccount: {
      main: 'Use this Account',
      aria: 'Use this Account, {name}'
    },
    logout: 'Log out',
    submitAndPay: 'Submit & Pay',
    accountOptions: 'Account Options Menu',
    accept: 'Accept',
    decline: 'Decline',
    close: 'Close',
    openHelpDocs: 'Read the Overview',
    deleteApplication: 'Delete Application',
    downloadCertificate: 'Download Certificate',
    downloadReceipt: 'Download Receipt',
    downloadReport: 'Download Report',
    info: {
      show: 'Show information',
      hide: 'Hide information'
    },
    colsToShow: {
      label: 'Columns to Show',
      aria: 'Columns to Show, {count} selected'
    },
    moreOptions: 'More Options',
    clearFilters: 'Clear Filters',
    help: 'Help',
    hideHelp: 'Hide Help',
    tryAgain: 'Try Again',
    cancel: 'Cancel',
    ok: 'OK',
    back: 'Back',
    fileNowNoFee: 'File Now (no fee)',
    reviewConfirm: 'Review and Confirm',
    save: 'Save',
    saveExit: 'Save and Resume Later',
    beginApplication: 'Begin Application',
    resume: 'Resume',
    resumeApplication: 'Resume Application',
    acceptTos: {
      main: 'Accept Terms of Use',
      aria: 'Accept Terms of Use (scroll and check the box before)'
    },
    createAnAccount: 'Create an Account'
  },
  contactInfo: {
    bcRegGeneral: {
      tollFree: {
        title: 'Toll Free:',
        value: '1-877-370-1033'
      },
      victoriaOffice: {
        title: 'Victoria Office:',
        value: '1-250-370-1033'
      },
      email: {
        title: 'Email:',
        value: "BCRegistries{'@'}gov.bc.ca"
      },
      hours: {
        title: 'Hours of Operation:',
        value: 'Monday to Friday, 8:30am - 4:30pm Pacific Time'
      }
    },
    strr: {
      listTitle: 'Short-Term Rental Registry Contact Information',
      tollFree: {
        title: 'Canada and U.S. Toll Free:',
        value: '1-833-828-2240'
      },
      victoriaOffice: {
        title: 'Victoria Office:',
        value: '604-630-4058'
      },
      email: {
        title: 'Email:',
        value: "STRregistry{'@'}gov.bc.ca"
      }
    }
  },
  currency: {
    cad: 'CAD',
    usd: 'USD'
  },
  error: {
    persistContactUs: 'If this issue persists, please contact us at:',
    generic: {
      title: 'Something Went Wrong',
      description: 'An error occurred, please try again. If this error persists, please contact us.'
    },
    tos: {
      load: 'Unable to load terms of use, please try again later.'
    },
    docUpload: {
      fileSize: {
        title: 'File Too Large',
        description: 'The selected file exceeds the maximum allowed size of 10 MB. Please choose a smaller file.'
      },
      fileType: {
        title: 'Invalid File Type',
        description: 'Only PDF, jpeg, or jpg files are supported. Please upload a PDF, jpeg, or jpg.'
      },
      generic: {
        title: 'Error Uploading Document',
        description: 'Something went wrong when uploading the file, only pdfs, jpeg, or jpg and files less than 10mb are accepted.'
      }
    }
  },
  imageAlt: {
    genericLogin: 'Generic Login Image'
  },
  label: {
    additionalInfo: 'Additional Information',
    applicationDate: 'Application Date',
    localGovernment: 'Local Government',
    dateSubmitted: 'Date Submitted',
    authorization: 'Authorization',
    born: 'Born',
    confirmation: 'Confirmation',
    dayCount: '0 days | 1 day | {count} days',
    renewalOverdue: 'Overdue',
    renewalDayCount: 'Less than 1 day | in 1 day | in {count} days',
    daysToExpiry: 'Days to Expiry',
    daysToExpiryExtra: 'Days to Expiry (Pacific Time)',
    details: 'Details',
    expiryDate: 'Expiry Date',
    expirationDate: 'Expiration Date',
    registrationDate: 'Registration Date',
    role: 'Role',
    note: 'Note',
    optional: 'Optional',
    characters: 'characters',
    birthdate: 'Birthdate',
    competency: 'Competency',
    citizenship: 'Citizenship',
    citizenshipPR: 'Citizenship/Permanent Residency',
    emailAddress: 'Email Address',
    emailAddressOpt: 'Email Address (Optional)',
    firstName: 'First Name',
    middleName: 'Middle Name',
    middleNameOpt: 'Middle Name (Optional)',
    lastName: 'Last Name',
    fullName: 'Full Legal Name',
    preferredName: 'Preferred Name',
    preferredNameOpt: 'Preferred Name (Optional)',
    contactName: 'Contact Name',
    address: 'Address',
    addressResidential: 'Residential Address',
    state: 'State',
    street: 'Street Address',
    streetAdditional: 'Additional Street Address (Optional)',
    streetName: 'Street Name',
    streetNumber: 'Street Number',
    unitNumber: 'Unit Number',
    unitNumberOpt: 'Unit Number (Optional)',
    country: 'Country',
    line1: 'Address Line 1',
    line2: 'Address Line 2 (Optional)',
    city: 'City',
    region: 'Region',
    regionOpt: 'Region (Optional)',
    province: 'Province',
    postalCode: 'Postal Code',
    zipCode: 'Zip Code',
    code: 'Code',
    deliveryInstructions: 'Delivery Instructions',
    deliveryInstructionsOpt: 'Delivery Instructions (Optional)',
    locationDescription: 'Location Description',
    locationDescriptionOpt: 'Location Description (Optional)',
    countryOfCitizenship: {
      citizen: 'Citizen of Canada',
      pr: 'Permanent resident of Canada',
      others: 'Other citizenship(s)',
      selectAll: 'Select all countries of which this person is a citizen.',
      placeholder: 'Countries of Citizenship',
      findCountry: 'Find a Country',
      select: 'Select',
      selected: 'Selected'
    },
    findACountry: 'Find a country',
    services: {
      bcsc: 'BC Services Card',
      bceid: 'BCeID',
      idir: 'IDIR'
    },
    socialInsuranceNumber: 'Social Insurance Number (SIN)',
    taxNumber: 'Tax Number',
    craBusTaxNumber: 'CRA Business Tax Number',
    craTaxNumber: 'CRA Tax Number',
    craTaxNumberOpt: 'CRA Tax Number (Optional)',
    craTaxNumberExtra: 'CRA Tax Number (SIN, ITN, or TTN)',
    busName: 'Business Name',
    busNameLegal: 'Business Legal Name',
    corpNum: 'Incorporation Number',
    busNum: 'Business Number',
    busNumOpt: 'Canada Revenue Agency Business Number (Optional)',
    cpbcLicNum: 'CPBC Licence Number',
    registrationNum: 'Registration Number',
    applicationNum: 'Application Number',
    homeJurisdiction: 'Home Jurisdiction',
    homeJurisdictionOpt: 'Home Jurisdiction (Optional)',
    legalName: 'Legal Name',
    name: 'Name',
    mailingAddress: 'Mailing Address',
    deliveryAddress: 'Delivery Address',
    effectiveDates: 'Effective Dates',
    apptDate: '{date} to current',
    sameAsMailAddress: 'Same as Mailing Address',
    registeredOffice: 'Registered Office',
    recordsOffice: 'Records Office',
    office: 'Office',
    status: 'Status',
    number: 'Number',
    type: 'Type',
    actions: 'Actions',
    myList: '{boldStart}My List{boldEnd} ({count})',
    amalgamateNow: 'Amalgamate Now',
    alterNow: 'Alter Now',
    changeNameNow: 'Change Name Now',
    continueInNow: 'Continue In Now',
    downloadForm: 'Download Form',
    registerNow: 'Register Now',
    restoreNow: 'Restore Now',
    reinstateNow: 'Reinstate Now',
    openNameRequest: 'Open Name Request',
    resumeDraft: 'Resume Draft',
    removeFromTable: 'Remove From Table',
    manageBusiness: 'Manage Business',
    cancelRequest: 'Cancel Request',
    newRequest: 'New Request',
    resendEmail: 'Resend Email',
    removeFromList: 'Remove From List',
    removeBusiness: 'Remove Business',
    bcRegDashboard: 'BC Registries Dashboard',
    phone: {
      countryCode: 'Country code',
      number: 'Phone Number',
      extension: 'Extension (Optional)'
    },
    faxNumber: 'Fax Number',
    faxNumberOpt: 'Fax Number (Optional)',
    positionTitle: 'Position/Title',
    todo: 'To Do',
    bcregDash: 'BC Registries Dashboard',
    stepCount: 'Step {current} of {max}:',
    stepValid: 'Step Valid',
    stepInvalid: 'Step Invalid',
    platAppStepLabel: 'Platform Application Step Navigation',
    stepUnfinished: 'This step is unfinished.',
    returnStepToFinish: 'Return to this step to finish it',
    continueBceid: 'Continue with BCeID',
    continueBcsc: 'Continue with BC Services Card',
    continueIdir: 'Continue with IDIR',
    // Each app could overwrite this if they wanted
    login: 'Login',
    selectAccount: 'Select Account',
    yourExistingAccounts: 'Your Existing Accounts ({count})',
    basicAccount: 'Basic Account',
    inactiveAccount: 'Inactive Account',
    createNewAccount: 'Create New Account',
    contToCreateAccount: 'Continue to Create Account',
    myStrr: 'My Short-term Rental Registry',
    completingParty: 'Completing Party',
    completePayment: 'Complete Payment',
    payNow: 'Pay Now',
    strataHotelCategory: 'Strata Hotel Category',
    sessionExpired: 'Session Expired'
  },
  modal: {
    declineTos: {
      title: 'Decline Terms of Use?',
      content: 'By declining the Terms of Use, you won’t be able to access this service. Do you wish to proceed?',
      declineBtn: 'Decline Terms of Use'
    },
    changeAccountConfirm: {
      title: 'Leave Site?',
      content: 'Changes you made may not be saved.',
      leaveBtn: 'Leave'
    },
    help: {
      registerStr: {
        triggerBtn: 'Help with registering',
        title: 'Need Help?',
        content: 'For more information about registration requirements, visit {link}. If you need help registering, using the dashboard, or resolving a technical issue, you can also contact us directly.'
      }
    },
    info: {
      collectionNotice: {
        triggerBtn: 'Information collection notice',
        title: 'Information Collection Notice',
        content: 'Any personal information required is collected to support the administration and enforcement of the {straAct}, under the authority of section 33(1) of that Act. Any questions about the collection of any information can be directed to the Executive Director of the Short-Term Rental Branch, at {email}.'
      }
    },
    padConfirmationPeriod: {
      title: 'PAD Account in Confirmation Period',
      content: 'This account will not be able to perform any PAD transactions until the mandatory (3) day confirmation period has ended. Until then you may continue to pay using credit card.'
    },
    error: {
      applicationSubmit: {
        badRequest: {
          title: 'Invalid Request',
          content: 'There was an issue with the information submitted. Please review your input and try again.'
        },
        internal: {
          title: 'Internal Server Error',
          content: 'We encountered an issue processing your application. Please try again or come back later. If the problem persists, contact us.'
        },
        unknown: {
          title: 'Unexpected Error',
          content: 'An unexpected error occurred. Please refresh the page or try again later. If the problem persists, contact us.'
        }
      }
    }
  },
  word: {
    i: 'i',
    addresses: 'Addresses',
    directors: 'Directors',
    representatives: 'Representatives',
    confirm: 'Confirm',
    select: 'Select',
    none: 'None',
    or: 'or',
    Or: 'Or',
    OR: 'OR',
    error: 'error',
    Error: 'Error',
    OK: 'OK',
    remove: 'remove',
    Remove: 'Remove',
    added: 'added',
    Added: 'Added',
    Yes: 'Yes',
    No: 'No',
    Edit: 'Edit',
    Save: 'Save',
    receipt: 'receipt',
    Receipt: 'Receipt',
    Certify: 'Certify',
    Leave: 'Leave',
    Valid: 'Valid',
    Invalid: 'Invalid',
    certificate: 'certificate'
  },
  page: {
    notFound: {
      h1: 'Page Not Found'
    },
    home: {
      title: 'Home - My STRR PM Registry',
      h1: 'My STRR PM Registry',
      intro: 'Some intro text here'
    },
    login: {
      // Each app could overwrite this if they wanted. Default would be different
      h1: 'Short-Term Rental Registry'
    },
    tos: {
      title: 'Terms of Use - Short Term Rental Registry',
      h1: 'Terms of Use',
      acceptCheckbox: 'I have read and accept the Terms of Use'
    }
  },
  table: {},
  text: {
    completeFilingToDisplay: 'Complete your filing to display',
    defaultDateFormat: 'YYYY-MM-DD',
    filingsWillAppear: 'Filings that require your attention will appear here',
    notAvailable: 'N/A',
    notEntered: 'Not Entered',
    nothingTodo: 'You don’t have anything to do yet',
    preferredName: {
      checkbox: 'This individual also has an another name they prefer to use',
      note: 'Preferred name refers to the name that an individual chooses to use and be addressed by, which may differ from their legal or given name.',
      hint: 'Example: William Smith may prefer to go by Bill Smith to their acquaintances'
    },
    sameAsBusMailing: 'Same as the business mailing address',
    showMoreOptions: 'show more options',
    streetHint: 'Street address, PO box, rural route, or general delivery address',
    noAccountsFound: 'No accounts found, please click below to get started with an account.',
    sessionExpired: 'Your session has expired. Please log in again to continue.'
  },
  todos: {
    noc: { // Notice of Consideration
      title1: 'Notice of Consideration - Due:',
      title2: 'at 12:01 am PT',
      general: "You have received a Notice of Consideration {boldStart}email{boldEnd} about issues with your application. Please review it carefully and {linkStart}add any required documents{linkEnd} below by selecting {boldStart}'Add new document'{boldEnd}.", // used for Host and Strata
      host: "{newLine}{newLine}Make sure to select the correct document category when uploading. If submitting a {boldStart}Statement Document{boldEnd}, upload it under {boldStart}'Other Proof Document'{boldEnd}." // Host only specific addition
    },
    provisionalNoc: { // Notice of Consideration
      title1: 'Notice of Consideration - Due:',
      title2: 'at 12:01 am PT',
      general: "You have received a Notice of Consideration {boldStart}email{boldEnd} about issues with your provisionally approved registration number. Please review it carefully and {linkStart}add any required documents{linkEnd} below by selecting {boldStart}'Add new document'{boldEnd}.", // used for Host and Strata
      host: "{newLine}{newLine}Make sure to select the correct document category when uploading. If submitting a {boldStart}Statement Document{boldEnd}, upload it under {boldStart}'Other Proof Document'{boldEnd}." // Host only specific addition
    },
    registrationNoc: {
      title1: 'Notice of Consideration - Due:',
      title2: 'at 12:01 am PT',
      general: "You have received a Notice of Consideration {boldStart}email{boldEnd} about issues with your registration. Please review it carefully and {linkStart}add any required documents{linkEnd} below by selecting {boldStart}'Add new document'{boldEnd}. " +
        "{newLine}{newLine}Make sure to select the correct document category when uploading. If submitting a {boldStart}Statement Document{boldEnd}, upload it under {boldStart}'Other Proof Document'{boldEnd}." // Host only specific addition
    },
    businessLicense: {
      title: 'Upload Business Licence - Due: August 15, 2025 12:01 am PT',
      subtitle: '{boldStart}Starting August 1, 2025{boldEnd}, 21 local governments will require a valid Business Licence to operate a short-term rental. If your property is in one of these jurisdictions, you must {linkStart}upload a current business licence{linkEnd} issued by the local government where your rental is located.{newLine}{newLine}To avoid cancellation of your registration, please upload your current business licence by {boldStart}August 15th{boldEnd}.{newLine}{newLine}If you need more time, email {mailto} to request an extension.'
    },
    renewal: {
      title1: 'Registration Renewal - Due:',
      title2: 'at 11:59 pm PT'
    }
  },
  toast: {
    invalidIdp: {
      generic: 'Invalid login source. Please login with one of the options provided.',
      BCROS: '', // TODO: more specific messages ???
      IDIR: '',
      BCSC: '',
      BCEID: ''
    }
  },
  validation: {
    required: 'Required',
    address: {
      country: 'Please select a country',
      street: 'Please enter a street address',
      streetName: 'Please enter a street name',
      streetNumber: 'Please enter a street number',
      city: 'Please enter a city',
      region: 'Please select a region',
      postalCode: 'Please enter a postal code',
      requiredBC: {
        region: 'Please enter a BC address',
        country: 'Please enter a BC, Canada address'
      },
      unitNumber: 'Please enter a unit number'
    },
    brand: {
      name: 'Please enter a brand name',
      site: 'Please enter a valid full url for this brand (i.e. https://www.bcregistry.gov.bc.ca)'
    },
    business: {
      bn15: 'Please enter a valid 15-character business number (e.g., 123456789BC0001)',
      legalName: 'Please enter the legal name',
      jurisdiction: 'Please enter the business home jurisdiction',
      cpbc: 'Please enter a valid CPBC number'
    },
    email: 'Please enter a valid email',
    name: {
      first: 'Please enter a first name',
      last: 'Please enter a last name',
      full: 'Please enter a full legal name'
    },
    number: 'Please enter a number',
    phone: {
      code: 'Please select a country code',
      number: 'Please enter a phone number'
    },
    position: 'Please enter the position or job title for the representative',
    step: {
      false: 'Step did not pass validation',
      true: 'Step successfully validated'
    },
    confirm: 'Please confirm to continue',
    tos: {
      scroll: 'You must scroll to the bottom of this page to accept the Terms of Use',
      accept: 'You must accept the Terms of Use to continue'
    }
  },
  // components
  ConnectHeader: {
    title: 'BC Registries and Online Services'
  },
  strr: {
    title: {
      comingSoon: 'My Short-Term Rental Registry Coming Soon',
      dashboard: 'My Short-Term Rental Registry',
      chooseAccount: 'Select an Account - My Short-Term Rental Registry'
    },
    section: {
      title: {
        businessInfo: 'Business Information'
      },
      subTitle: {
        businessIds: 'Business Identifiers',
        businessMailAddress: 'Business Mailing Address',
        contactDetails: 'Contact Details',
        contactName: 'Contact Name',
        regOfficeAttSvcAddrress: 'Registered Office or Attorney for Service Address',
        yourName: 'Your Name'
      }
    },
    label: {
      attForSvcName: 'Attorney for Service Name (Optional)',
      attName: 'Attorney Name',
      addRepresentative: 'Add Another Representative',
      brandNames: 'Brand Names',
      registeredOfficeAttorney: 'Registered Office / Attorney'
    },
    hint: {
      businessLegalNamePlatform: 'The full legal name of the platform service provider',
      businessLegalNameStrataHotel: 'The full legal name of the business that is operating the strata-titled hotel or motel. Include corporate designations (e.g., “Ltd.”, “Inc.”, “LLC.”)',
      businessNumber: '15-character business number (e.g., 123456789BC0001)',
      humeJurisdiction: 'The regional or federal jurisdiction where the business was incorporated or registered, if applicable',
      position: 'Enter your current job title or position'
    },
    text: {
      comingSoon: 'My Short-Term Rental Registry will be available on December 15, 2024',
      emailNote: 'Email will be the default method of communication. Information sent to your email address will be considered “received” on the third day after the email is sent.',
      positionTitle: 'Enter your current job title or position',
      regOffOrAtt: 'Does the business have a registered office or attorney for service in British Columbia?',
      secondaryContact: 'This is a back-up contact person in case other contacts cannot be reached.',
      yourNameBCSC: 'This is your legal name as it appears on your BC Services Card.',
      yourNameBCEID: 'This is your legal name as it appears on your BCeID.',
      yourNameIDIR: 'This is your legal name as it appears on your IDIR.'
    },
    review: {
      alert: {
        contactInfo: '{boldStart}Note:{boldEnd} Only contact information can be changed once you submit this application.'
      },
      busInfo: {
        attForSvcName: 'Attorney for Service Name'
      },
      confirm: {
        infoAccuracy: 'I confirm that the information contained in the application for registration is accurate and true. I understand that, if I have provided inaccurate or false information, I may be the subject of enforcement action under Part 4 of the Short-Term Rental Accommodations Act. Enforcement action may include being ordered to pay an administrative penalty.',
        delistAndCancelBookings: 'I confirm agreement to delist and cancel existing bookings for unregistered listings as required under s. 17 (2) (a) and [relevant section of the forthcoming regulation].'
      }
    }
  },
  strataHotelCategory: {
    FULL_SERVICE: 'Category 1: Strata hotel with a staffed front desk, housekeeping services, and a platform',
    MULTI_UNIT_NON_PR: 'Category 2: Strata hotel with two or more strata lots that cannot be used as a principal residence',
    POST_DECEMBER_2023: 'Category 3: New strata hotel development since December 2023'
  },
  strataHotelCategoryReview: {
    FULL_SERVICE: 'Category 1',
    MULTI_UNIT_NON_PR: 'Category 2',
    POST_DECEMBER_2023: 'Category 3',
    undefined: 'Uncategorized',
    null: 'Uncategorized'
  },
  ConnectPage: {
    error: {
      404: {
        title: 'Page Not Found - Short-Term Rental Registry',
        h1: '404 Page Not Found',
        content: 'This page could not be found or does not exist.'
      },
      unknown: {
        title: 'Unknown Error - Short-Term Rental Registry',
        h1: 'Unknown Error',
        content: 'An unknown error occurred, please refresh the page or try again later.'
      }
    }
  },
  ConnectFeeWidget: {
    feeSummary: {
      title: 'Fee Summary',
      total: 'Total Fees',
      noFee: 'No Fee',
      priorityFees: 'Priority Fees',
      futureEffectiveFees: 'Future Effective Fees',
      serviceFees: 'Service Fee',
      itemLabels: {
        PLACEHOLDER: 'Placeholder (Replace Me)', // each project using the connect fee widget should change the placeholder filingTypeCode
        TEST: 'This is test entry',
        undefined: 'Item Fee'
      }
    },
    paymentMethod: {
      DIRECT_PAY: 'Credit Card',
      PAD: 'Pre-authorized Debit (PAD) {account}',
      BCOL: 'Online Banking',
      JV: 'Journal Voucher',
      undefined: 'Default'
    },
    payingWith: {
      DIRECT_PAY: 'Paying with Credit Card',
      PAD: 'Paying with Pre-authorized Debit (PAD) {account}',
      BCOL: 'Paying with Online Banking',
      JV: 'Paying with Journal Voucher',
      undefined: 'Paying with default method'
    }
  }
}
