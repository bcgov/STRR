/* eslint-disable max-len */
export default {
  alert: {
    prRequired: {
      title: 'Your property is in a location where the principal residence requirement applies.'
    },
    straaExempt: {
      title: '{boldStart}Registration Not Required:{boldEnd} This address appears to be located on First Nations land and is therefore exempt from the {italicStart}Short-term Rental Accommodations Act{italicEnd}. You do not need to register a short-term rental at this address.'
    },
    strProhibited: {
      title: 'Some types of short-term rentals are not permitted by your local government.',
      description: 'Contact your local government to understand what rules apply to short-term rentals in your community before you submit a registration application. Your registration will be denied if your short-term rental type is not permitted by your local government.',
      note: '{boldStart}Note:{boldEnd} Currently, short-term rental application fees are {boldStart}non-refundable.{boldEnd}'
    },
    prExempt: {
      title: "Short-term rentals are allowed in any of the host's properties."
    }
  },
  feeSummary: {
    itemLabels: {
      HOSTREG_1: 'STR Application Fee',
      HOSTREG_2: 'STR Application Fee'
    }
  },
  form: {
    pr: {
      declaration: {
        intro: 'As required by section 14 (2) of the {italicStart}Short-Term Accommodations Rental Act{italicEnd} (the Act), I declare the property host will comply with the principal residence restriction in the Act and provide the short-term rental accommodation services described in this registration in one or both of:',
        list: {
          a: 'the property host’s principal residence,',
          b: "not more than one secondary suite or other accessory dwelling unit that is on the land parcel associated with the property host's principal residence."
        },
        agreement: 'I understand that if the property host does not comply with the requirement to provide the short-term rental accommodation services in the principal residence, the property host may be subject to enforcement action under Part 4 of the Act, including being ordered to pay an administrative penalty.'
      },
      exemptReason: {
        EXEMPT_COMMUNITY: 'Located in exempt community',
        STRATA_HOTEL: 'Eligible strata hotel or motel',
        FARM_LAND: 'Farm land (BC Assessment Farm Class 9)',
        OTHER: 'Other exempted accommodation service provider'
      },
      exemptOtherProvider: {
        TIMESHARE: 'Timeshare',
        FRACTIONAL_OWNERSHIP: 'Fractional Ownership',
        HOME_EXCHANGE: 'Home Exchange',
        LODGE_OPERATOR: 'Lodge (operator of outdoor recreational activity)',
        EDUCATIONAL_INSTITUTION: 'Educational institution accommodation (Student or Employee) (off campus)',
        STRATA_GUEST_SUITE: 'Strata corporation guest suite'
      },
      docType: {
        BC_DRIVERS_LICENCE: "BC Driver's Licence",
        PROPERTY_ASSESSMENT_NOTICE: 'Property Assessment Notice',
        SPEC_TAX_CONFIRMATION: 'Speculation and Vacancy Tax Confirmation',
        HOG_DECLARATION: 'Home Owner Grant declaration',
        ICBC_CERTIFICATE_OF_INSURANCE: 'ICBC Certificate of Insurance',
        HOME_INSURANCE_SUMMARY: 'Home Insurance Summary',
        PROPERTY_TAX_NOTICE: 'Property Tax Notice',
        UTILITY_BILL: 'Utility Bill',
        GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE: 'Government or Crown Corporation Official Notice',
        TENANCY_AGREEMENT: 'Tenancy Agreement',
        RENT_RECEIPT_OR_BANK_STATEMENT: 'Rent Receipt or Bank Statement',
        LOCAL_GOVT_BUSINESS_LICENSE: 'Local Government Business License',
        OTHERS: 'Other Proof Document (subject to review by registry staff)',
        STRATA_HOTEL_DOCUMENTATION: 'Supporting strata-titled hotel or motel documentation',
        FRACTIONAL_OWNERSHIP_AGREEMENT: 'Fractional ownership agreement',
        BCSC: 'British Columbia Services Card',
        COMBINED_BCSC_LICENCE: 'Combined BC Driver’s Licence and Services Card'
      },
      editAddress: {
        unitNumber: 'Unit Number',
        streetNumber: 'Street Number',
        streetName: 'Street Name',
        siteName: 'Site Name (Optional)',
        city: 'City',
        province: 'Province',
        postalCode: 'Postal Code',
        locationDescription: 'Location Description (Optional)',
        label: 'Edit Rental Unit',
        labelDescription: 'You should only edit the rental unit address to correct data entry errors, and only upon request from the applicant.'
      }
    }
  },
  strr: {
    section: {
      subTitle: {
        birthdate: 'Birthdate',
        businessName: 'Business Legal Name',
        completingParty: 'Completing Party',
        craBusinessNumber: 'Canada Revenue Agency (CRA) Business Number',
        craTaxNum: 'Canada Revenue Agency (CRA) Tax Number',
        emailAddress: 'Email Address',
        faxNumber: 'FaxNumber',
        individualName: "Individual's Name",
        individualPreferredName: "Individual's Preferred Name",
        mailingAddress: 'Mailing Address',
        phoneNumber: 'Phone Number',
        propertyAddress: 'Rental Unit Address',
        propertyDetails: 'Rental Unit Details',
        propertyListings: 'Online Listings',
        rentalUnitResiAddress: 'Rental Unit Residential Address',
        residentialAddress: 'Residential Address',
        role: 'Role'
      }
    },
    title: {
      application: 'Short-Term Rental Registration',
      comingSoon: 'Short-Term Rental Registry Coming Soon',
      dashboard: 'My Short-Term Rental Registry',
      default: 'TBD'
    },
    label: {
      addBusiness: 'Add a Business',
      addIndividual: 'Add a Individual',
      addListing: 'Add Another Listing',
      businessLicense: 'Business Licence Number',
      businessLicenseOpt: 'Local Government Business License (Optional)',
      businessLicenseDate: 'Business Licence Expiry Date',
      contactIndName: "Contact Individual's Name",
      individuals: 'Individuals',
      individualsBusinesses: 'Individuals and Businesses',
      listingLinkOpt: 'Listing Link (Optional)',
      numberOfRooms: 'Number of Rooms for Rent',
      ownershipType: 'Ownership Type',
      nicknameOpt: 'Nickname (Optional)',
      parcelIdentifier: 'Parcel Identifier',
      parcelIdentifierOpt: 'Parcel Identifier (Optional)',
      platforms: 'Platforms',
      propertyType: 'Rental Unit Type',
      role: {
        CO_HOST: 'Co-host',
        HOST: 'Property Host',
        PROPERTY_MANAGER: 'Property Manager',
        undefined: 'Not Selected'
      },
      room: 'Room | Rooms',
      own: 'Own',
      coown: 'Co-Own',
      rent: 'Rent',
      accessDwelling: 'Accessory Dwelling',
      bb: 'Bed & Breakfast',
      condoApt: 'Condo or Apartment',
      floatHome: 'Float Home',
      multiHousing: 'Multi Unit Housing',
      recreational: 'Recreational',
      secondarySuite: 'Secondary Suite',
      singleFamily: 'Single Family Home',
      host: 'Host',
      strataHotel: 'Strata Hotel',
      platform: 'Platform',
      townHome: 'Town Home',
      rentalUnit: 'Rental Unit',
      rentalUnitSetup: 'Rental Unit Set-up',
      rentalUnitName: 'Rental Unit Name',
      rentalUnitNameOpt: 'Rental Unit Name (Optional)',
      parcelId: 'Parcel Identifier (PID)',
      pid: 'PID:',
      exemptionReason: 'Reason:',
      registeredRentals: 'Registered Rentals:',
      prRegisteredRentals: 'PR Registered Rentals:',
      prRequirement: 'Principal Residence',
      theRentalUnitIs: 'The rental unit is:',
      supportingInfo: 'Supporting Information',
      other: 'Other',
      remove: 'Remove',
      hostType: 'Host Type:',
      ownerRenter: 'Owner / Renter:',
      strProhibited: 'Short-term rentals prohibited',
      strProhibitedAction: 'Review Policy',
      businessLicence: 'Business Licence',
      businessLicenceNumber: 'Number:',
      assignee: 'Assignee:',
      applicationType: 'Type:',
      submitted: 'Submitted:',
      registrationNumber: 'Registration Number:',
      registrationDate: 'Registration Date:',
      registrationEndDate: 'Registration Expiry:',
      expiryDate: 'Expiry Date:',
      nocExpiry: 'NOC Expiry:',
      businessLicenceExpiryDate: 'Expiry:',
      primaryBuilding: 'Primary Building',
      building: 'Building',
      buildings: 'Buildings',
      viewAllBuildings: 'View all buildings',
      business: 'Business',
      attorneyForService: 'Attorney For Service',
      representative: 'Representative',
      businesses: 'Businesses',
      secondaryRepresentative: 'Secondary Representative',
      completingParty: 'Completing Party',
      additionalInformation: 'Additional Information',
      strataCategory: 'Category:',
      numberOfRentalUnits: 'Number of Rental Units:',
      cpbcLicenseNum: 'CPBC Licence #',
      listingSize: {
        THOUSAND_AND_ABOVE: '1,000 or more',
        BETWEEN_250_AND_999: '250-999',
        LESS_THAN_250: 'under 250',
        null: 'None'
      },
      totalNumberOfListings: 'Total Number of Listings',
      noticeOfNonCompliance: 'Notice of Non-Compliance',
      takedownRequest: 'Takedown Request',
      added: 'ADDED',
      unAssign: 'Yes, Unassign Them',
      acknowledgeError: 'Close',
      editRentalUnit: 'Edit Rental Unit'
    },
    text: {
      applicationMustInclude: 'Your application must include the following:',
      businessContactIndividual: 'Enter the information for the individual to be contacted at this business.',
      comingSoon: 'Short-Term Rental Registry will be available on December 15, 2024',
      completingPartyInfo: 'Select this option if you are entering information for yourself.',
      completingPartyCheckbox: 'I am adding my own information',
      includeCompletingParty: 'The Completing Party',
      includeHost: 'At least one Host (maximum two)',
      includePropertyManager: 'If you have a Property Manager, you MUST also include the Property Manager (maximum one)',
      individualBusinessInfo: 'Enter business information for this individual if lorem ipsum...',
      rentalType: 'What type of space is offered in this rental unit?',
      entireHome: 'Entire home (guests have the entire place to themselves)',
      hostSameUnit: 'The host lives in this unit when it’s not being rented',
      hostDifferentUnit: 'The host lives in another unit on the same property',
      hostResidence: 'Is this rental unit on the same property as the property host’s principal residence?',
      hostUnit: 'Where does the property host live on the property?',
      listEachWebLink: 'Add the web link for the rental unit’s listing on a short-term rental platform (e.g., airbnb.ca/your_listing123). You can add multiple links if this rental unit is listed on multiple platforms (e.g., Airbnb, VRBO, Expedia, etc.).',
      ownershipTypeLegend: 'Required, What is the ownership type of the property?',
      enterResiAddressToDetermineRequirement: 'Start by entering the residential address of rental unit to help determine if you need to register your short-term rental and if it is in an area subject to the {link}.',
      requireBusLicense: 'Your local government requires a valid business licence to operate a short-term rental.'
    },
    word: {
      room: 'room | rooms',
      unit: 'unit | units'
    },
    hint: {
      businessLicense: 'This is the business licence to operate a short-term rental as provided by your local government.',
      craTaxNumber: '9-digit Social Insurance Number (SIN), Individual Tax Number (ITN), Temporary Tax Number (TTN)',
      listingLink: 'e.g., http://www.airbnb.ca/your_listing123',
      nickname: 'e.g., My Guest Suite',
      parcelIdentifier: 'This is a nine-digit number that identifies the parcel in the land title of your property.'
    },
    review: {
      brand: {
        name: 'Strata Hotel Brand Name | Strata Hotel Brand {count} Name',
        site: 'Strata Hotel Brand Website | Strata Hotel Brand {count} Website'
      }
    },
    alertFlags: {
      hostAddressNotSame: 'PR requirement applies',
      hostIsBusiness: 'Host is a business',
      unitNumberMissing: 'Unit Number Missing',
      notSameProperty: "Unit not on the same property as host's principal residence",
      exceedsRegistrationLimit: 'More than 2 Registrations'
    }
  },
  btn: {
    view: 'View',
    viewAllPlatforms: 'View all platforms',
    edit: 'Edit',
    done: 'Done',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    decline: 'Refuse',
    approve: 'Approve',
    cancel: 'Cancel',
    suspend: 'Suspend',
    sendNotice: 'Send Notice',
    viewReceipt: 'View Receipt',
    showHistory: 'Show History',
    hideHistory: 'Hide History',
    assign: 'Assign To Me',
    unassign: 'Unassign',
    confirm: 'Confirm',
    keepEditing: 'Continue Editing',
    discardChanges: 'Discard',
    approveApplication: 'Approve Application',
    yesApprove: 'Yes, Approve',
    yesSend: 'Yes, Send'
  },
  error: {
    action: {
      approve: 'An error occurred approving this application.',
      reject: 'An error occurred rejecting this application.',
      send_noc: 'An error occurred sending the Notice of Consideration for this application.',
      cancel: 'An error occurred cancelling this registration.'
    },
    createAccount: {
      title: 'Error creating account',
      description: 'We could not create your account at this time. Please try again or if this issue persists, please contact us.'
    },
    downloadReceipt: {
      description: 'We could not download the receipt at this time. If error persists, please contact us.'
    },
    checkAssignee: {
      description: 'We could not verify if you are the assignee for this application. If error persists, please contact us.'
    },
    assignApplication: 'An error occurred assigning this application.',
    unAssignApplication: 'An error occurred unassigning this application.',
    filingHistory: 'An error occurred while retrieving the filing history.',
    saveAddress: 'An error occurred while updating the STR address',
    saveAddressConfig: 'Either application number or registration ID must be provided',
    reqFetch: {
      unknown: {
        title: 'An unexpected error occurred.',
        description: 'Please refresh the page or try again later. If error persists, please contact us.'
      },
      notFound: {
        title: 'Address could not be found. Make sure the address you have entered is correct. Check the {linkAllRules} to determine if you need to register. To continue to register, have the {linkReqDocs} ready.',
        description: 'Alternatively, you can refresh the page or try again later. If error persists, please contact us.'
      },
      500: {
        title: 'Internal Server Error.',
        description: 'Please refresh the page or try again later. If error persists, please contact us.'
      }
    } // TODO: other errors???
  },
  label: {
    hotelName: 'Hotel Name',
    expiryDate: 'Expiry Date',
    application: 'Application',
    registration: 'Registration',
    date: 'Date',
    phoneExt: 'Ext.',
    accountName: 'Account Name',
    accountInfo: 'Account Information',
    primaryContactInfo: 'Primary Contact Information',
    expired: 'Expired',
    expiresToday: 'Expires today',
    dayCount: '0 days | 1 day | {count} days',
    lastStatusChange: 'Last Status Change',
    daysToExpiry: 'Days to Expiry (Pacific Time)',
    property: 'Property',
    details: 'Details',
    done: 'Done',
    strataRefCode: 'Strata-Titled Hotel Reference Code',
    eligibleStrataHotel: 'Eligible strata-titled hotel or motel',
    farmLandClass9: 'Farm land (BC Assessment Farm Class 9)',
    fractOwnership: 'Fractional ownership',
    strUnitName: 'Short-Term Rental Unit Name',
    strUnitNameOpt: 'Short-Term Rental Unit Name (Optional)',
    chooseDocs: 'Choose Supporting Documents',
    fileUpload: 'File Upload',
    localGovBL: 'Local Government Business Licence',
    localGovShortTermRentalBL: 'Local government short-term rental business licence',
    proofOfPr: 'Proof of principal residence',
    supportingStrataDocs: 'Supporting strata-titled hotel or motel documentation',
    fractOwnAgreement: 'Fractional ownership agreement',
    businessLicenceNumberOpt: 'Business Licence Number (Optional)',
    businessLicenceExpiryDateOpt: 'Business Licence Expiry Date (Optional)',
    resultsInTable: 'Results in Table: {boldStart}{count}{boldEnd}',
    search: 'Search',
    applicationListSectionAria: 'Application list, {count} results',
    clearAllFilters: 'Clear All Filters',
    findInApplication: 'Find in application...',
    tableLimitDisplay: 'Display:',
    noCraTaxNumber: 'No CRA Tax Number',
    multipleFilter: 'Multiple',
    history: 'History',
    forNonCivicAddresses: 'For non-civic addresses',
    filingHistoryIdir: ' (by {idir})'
  },
  link: {
    learnMore: 'Learn More'
  },
  modal: {
    infoCollectionNotice: {
      triggerBtn: 'Information collection notice',
      title: 'Information Collection Notice',
      content: 'Any personal information required is collected to support the administration and enforcement of the {act}, under the authority of section 33(1) of that Act. Any questions about the collection of any information can be directed to the Executive Director of the Short-Term Rental Branch, at {link}.'
    },
    createAccount: {
      triggerBtn: 'Help with setting up an account',
      title: 'Need Help?',
      content: 'If you need help with setting up your BC Registries and Online Services account, please contact us.'
    },
    noc: {
      title: 'Email to Completing Party',
      placeholder: 'Email Body Text'
    },
    unassign: {
      title: 'Currently Assigned',
      message: 'This application is currently assigned to someone else. Unassigning them may interrupt their work. Are you sure you want to continue?'
    },
    assignError: {
      title: 'Action Failed',
      message: 'This application is no longer assigned to you.'
    },
    cancelRegistration: {
      title: 'Cancel Registration',
      message: 'This registration will be cancelled. Are you sure you want to continue?'
    },
    unsavedChanges: {
      title: 'Unsaved Changes',
      message: 'Are you sure you want to discard your changes?'
    },
    approveApplication: {
      title: 'Approve Application',
      message: 'This action will fully register the short-term rental unit. Are you sure you want to continue?'
    },
    sendNotice: {
      title: 'Send Notice of Consideration',
      message: 'This action will notify the applicant to provide additional documents. Are you sure you want to continue?'
    }
  },
  table: {
    hostPmList: {
      title: '{boldStart}My Registration Applications{boldEnd} ({count})',
      emptyText: "You don't have any properties yet. Add a property above."
    }
  },
  hint: {
    strataRefCode: 'This is a unique code for each registered strata hotel. Ask the strata hotel management for this code.',
    docUpload: 'File must be a PDF. Maximum 10 MB.'
  },
  page: {
    dashboardList: {
      title: 'Dashboard - My Short-Term Rental Registry',
      h1: 'My CEU STR Registry Dashboard',
      subtitle: 'Register and keep short-term rental unit information up to date.',
      na: 'N/A',
      columns: {
        applicationNumber: 'Number',
        registrationNumber: 'Registration # / Application #',
        registrationType: 'Type',
        requirements: 'Requirements',
        applicantName: 'Applicant',
        propertyHost: 'Property Host',
        propertyManager: 'Property Manager',
        propertyAddress: 'Address',
        status: 'Status',
        submissionDate: 'Submitted',
        adjudicator: 'Assignee'
      },
      requirements: {
        platform: {
          GREATER_THAN_THOUSAND: 'Major platform', // old enum ?
          THOUSAND_AND_ABOVE: 'Major platform',
          BETWEEN_250_AND_999: 'Medium platform',
          LESS_THAN_250: 'Minor platform',
          undefined: '-'
        },
        host: {
          pr: 'PR',
          bl: 'BL',
          prohibited: 'Prohibited',
          none: 'None',
          STRATA_HOTEL: 'PR-ex-strata',
          FARM_LAND: 'PR-ex-farm',
          FRACTIONAL_OWNERSHIP: 'PR-ex-fractional'
        },
        invalid: 'Invalid'
      }
    },
    chooseAccount: {
      title: 'Choose Account - My Short-Term Rental Registry',
      h1: 'Existing Account Found',
      existingAccountFoundAlert: '{boldStart}Note{boldEnd}: It looks like you already have an account with BC Registries and Online Services. You can use an existing account to proceed or create a new one.'
    }
  },
  validation: {
    accountName: {
      required: 'Please enter an account name',
      exists: 'An account with this name already exists'
    },
    businessLicense: 'Please enter a valid business license number',
    businessLicenseExpiryDate: 'Please select the expiry date for the business license',
    dateOfBirth: 'Please enter the birthdate of this individual',
    numberOfRooms: {
      empty: 'Please specify the number of rooms available for rent',
      invalidInput: 'Please enter a valid number of rooms (e.g., 5)'
    },
    ownershipType: 'Please select the ownership type of this rental unit',
    parcelIdentifier: 'The parcel identifier must be a nine-digit number',
    propertyType: 'Please select the rental unit type of this rental unit',
    onlineListings: 'Please enter a valid URL (i.e. https://www.bcregistry.gov.bc.ca)',
    rentalUnitSetupType: 'Please select the setup type of the rental unit',
    typeOfSpace: 'Please select the type of space of the unit',
    ownerRole: 'Please select the role',
    missingReqDocs: 'Missing required documents. Please see above for details.',
    blExpiryDate: 'The expiry date must be greater than today and in less than 1 year.',
    nocContent: 'Please enter email body text',
    address: {
      streetName: 'Street name is required',
      streetNumber: 'Street number is required',
      form: 'Provided address is not valid'
    }
  },
  registrationType: {
    HOST: 'Host',
    PLATFORM: 'Platform',
    STRATA_HOTEL: 'Strata Hotel'
  },
  propertyType: {
    SECONDARY_SUITE: 'Secondary Suite',
    ACCESSORY_DWELLING: 'Accessory Dwelling',
    TOWN_HOME: 'Town Home',
    MULTI_UNIT_HOUSING: 'Multi Unit Housing',
    CONDO_OR_APT: 'Condo or Apartment',
    STRATA_HOTEL: 'Strata Hotel',
    SINGLE_FAMILY_HOME: 'Single Family Home',
    RECREATIONAL: 'Recreational',
    BED_AND_BREAKFAST: 'Bed & Breakfast',
    FLOAT_HOME: 'Float Home'
  },
  rentalUnitType: {
    ENTIRE_HOME: 'Entire home',
    SHARED_ACCOMMODATION: 'Shared accommodation (guests rent a portion of the unit with access to common spaces that may be shared with the host or other guests)'
  },
  hostResidence: {
    SAME_UNIT: 'Same property as host’s principal residence',
    ANOTHER_UNIT: 'Not same property as host’s principal residence'
  },
  rentalUnitSetupType: {
    WHOLE_PRINCIPAL_RESIDENCE: "This unit is the host's principal residence", // The whole Host Principal Residence
    UNIT_ON_PR_PROPERTY: 'This unit is not the host’s principal residence but it’s on the same property', // A whole unit on the same property as the Host Principal Residence (e.g., basement suite)
    UNIT_NOT_ON_PR_PROPERTY: 'This unit is not on the same property as the host’s principal residence'
  },
  ownerType: {
    INDIVIDUAL: 'Individual',
    BUSINESS: 'Business'
  },
  ownershipType: {
    RENT: 'Renter',
    OWN: 'Owner',
    CO_OWN: 'Co-owner',
    OTHER: 'Other'
  },

  tooltip: {
    pid: 'You can find your Parcel Identifier (PID) on your Property Assessment Notice from BC Assessment. Alternatively, visit the BC Assessment website, search for your civic address, and look for the PID under ‘Legal Description and Parcel ID’.'
  },
  documentLabels: {
    BC_DRIVERS_LICENSE: "BC Driver's Licence",
    BCSC: 'BC Services Card',
    COMBINED_BCSC_LICENSE: 'Combined BCSC License',
    PROPERTY_ASSESSMENT_NOTICE: 'Property Assessment Notice',
    SPEC_TAX_CONFIRMATION: 'Special Tax Confirmation',
    HOG_DECLARATION: 'HOG Declaration',
    ICBC_CERTIFICATE_OF_INSURANCE: 'ICBC Certificate of Insurance',
    HOME_INSURANCE_SUMMARY: 'Home Insurance Summary',
    PROPERTY_TAX_NOTICE: 'Property Tax Notice',
    UTILITY_BILL: 'Utility Bill',
    GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE: 'Government or Crown Corporation Official Notice',
    FRACTIONAL_OWNERSHIP_AGREEMENT: 'Fractional Ownership Agreement',
    STRATA_HOTEL_DOCUMENTATION: 'Strata Hotel Documentation',
    TENANCY_AGREEMENT: 'Tenancy Agreement',
    RENT_RECEIPT_OR_BANK_STATEMENT: 'Rent Receipt or Bank Statement',
    LOCAL_GOVT_BUSINESS_LICENSE: 'Business License',
    OTHERS: 'Other',
    undefined: 'N/A'
  },
  pr: {
    required: 'Required.',
    notRequired: 'Not Required.',
    exempt: 'Exempt.',
    notExempt: 'Not Exempt.'
  },
  prExemptReason: {
    notExempt: 'Not Exempt.',
    STRATA_HOTEL: 'PR Exempt - Strata Hotel.',
    FARM_LAND: 'PR Exempt - Class 9 Farmland.',
    FRACTIONAL_OWNERSHIP: 'PR Exempt - Fractional Ownership.'
  },
  applicationType: {
    HOST: 'Host',
    PLATFORM: 'Platform',
    STRATA_HOTEL: 'Strata Hotel'
  },
  filingHistoryEvents: {
    APPLICATION_SUBMITTED: 'Application submitted',
    INVOICE_GENERATED: 'Invoice generated',
    PAYMENT_COMPLETE: 'Payment completed',
    PENDING_AUTO_APPROVAL_PROCESSING: 'Pending Auto Approval processing',
    AUTO_APPROVAL_FULL_REVIEW: 'Application marked for full review by the auto approval process',
    AUTO_APPROVAL_PROVISIONAL: 'Application marked for provisional review by the auto approval process',
    AUTO_APPROVAL_APPROVED: 'Application approved by the auto approval process',
    FULL_REVIEW_IN_PROGRESS: 'Full Review in progress',
    MANUALLY_APPROVED: 'Application approved by staff',
    MANUALLY_DENIED: 'Application rejected by staff',
    MORE_INFORMATION_REQUESTED: 'Additional information requested from the applicant',
    REGISTRATION_CREATED: 'Registration created',
    REGISTRATION_CANCELLED: 'Registration cancelled',
    CERTIFICATE_ISSUED: 'Certificate issued for the registration',
    EXPIRED: 'Registration expired',
    NON_COMPLIANCE_SUSPENDED: 'Registration suspended due to non compliance',
    APPLICATION_REVIEWER_ASSIGNED: 'Application reviewer assigned',
    APPLICATION_REVIEWER_UNASSIGNED: 'Application reviewer unassigned',
    NOC_SENT: 'Notice of Consideration sent',
    NOC_EXPIRED: 'Notice of Consideration expired',
    HOST_REGISTRATION_UNIT_ADDRESS_UPDATED: 'Host STR Address Updated'
  }

}
