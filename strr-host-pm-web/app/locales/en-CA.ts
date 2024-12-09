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
    },
    propertyTypeReqUnitNumber: { // camelcase prop not working with ConnectI18nBold component
      title: '{boldStart}Important:{boldEnd} {propertytype} requires a unit number as part of the Rental Unit Residential Address above. If you do not include a unit number, your registration {boldStart}may be declined{boldEnd}.'
    }
  },
  certify: {
    1: '{terms} I agree to comply with the {link} of registration.',
    2: '{boldStart}Tax Auditing.{boldEnd} I understand that my registration information will be shared with the Ministry of Finance and the Canada Revenue Agency for the purposes of tax auditing.',
    3: "{boldStart}Principal Residence Declaration.{boldEnd} As required by section 14 (2) of the Short-Term Rental Accommodations Act (the Act), I declare that I will comply with the principal residence requirement in the Act and provide the short-term rental accommodation services described in this registration in one or both of: a. the property host's principal residence, and b. not more than one secondary suite or accessory dwelling unit on the same property. I understand that if I do not comply with the principal residence requirement, I may be subject to enforcement action under Part 4 of the Act, including being ordered to pay an administrative penalty.",
    4: '{boldStart}Accuracy of Information.{boldEnd} I confirm that the information contained in the application for registration is accurate and true. I understand that if I have knowingly provided inaccurate or false information, I may be subject to enforcement action under Part 4 of the Short-Term Rental Accommodations Act.',
    confirm: 'I, {boldStart}{name}{boldEnd}, confirm that I understand and agree to all of the requirements listed above.',
    authorization: 'I, {boldStart}{name}{boldEnd}, have relevant knowledge of and am authorized to submit this registration.',
    tac: 'Terms and Conditions.'
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
        BC_DRIVERS_LICENSE: "BC Driver's License",
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
        COMBINED_BCSC_LICENSE: 'Combined BC Driver’s License and Services Card'
      }
    }
  },
  strr: {
    step: {
      stepperLabel: 'Short-Term Rental Application Step Navigation',
      description: {
        0: 'Define Your Rental',
        1: 'Add Individuals and Businesses',
        2: 'Add Supporting Documentation',
        3: 'Review and Confirm'
      },
      title: {
        0: 'Define Your Rental',
        1: 'Individuals and Businesses',
        2: 'Add Supporting Documentation',
        3: 'Review and Confirm'
      },
      info: {
        0: 'Tell us about the short-term rental property. Note: If you have multiple short-term rental properties, you must submit a separate Short-Term Rental Registration for each rental property.',
        1: 'Add the individuals and businesses who will have a role in your short-term rental registration. The completing party must be an individual.',
        2: '',
        3: 'Review and confirm all of the information you provided as shown below.'
      }
    },
    section: {
      title: {
        addBusiness: 'Add a Business',
        addIndividual: 'Add an Individual',
        contactIndividualDetails: "Contact Individual's Details",
        property: 'Rental Unit Information'
      },
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
      addIndividual: 'Add an Individual',
      addListing: 'Add Another Listing',
      businessLicense: 'Business License Number',
      businessLicenseOpt: 'Local Government Business License (Optional)',
      businessLicenseDate: 'Business License Expiry Date',
      contactIndName: "Contact Individual's Name",
      individualsBusinesses: 'Individuals and Businesses',
      listingLinkOpt: 'Listing Link (Optional)',
      numberOfRooms: 'Number of Rooms for Rent',
      ownershipType: 'Ownership Type',
      nicknameOpt: 'Nickname (Optional)',
      parcelIdentifier: 'Parcel Identifier',
      parcelIdentifierOpt: 'Parcel Identifier (Optional)',
      propertyType: 'Property Type',
      role: {
        CO_HOST: 'Co-host',
        HOST: 'Property Host',
        PROPERTY_MANAGER: 'Property Manager',
        undefined: 'Not Selected'
      },
      room: 'Room | Rooms',
      shortTermRental: 'Short-Term Rental',
      supportingDocs: 'Supporting Documents',
      rentalUnit: 'Rental Unit',
      rentalUnitSetup: 'Rental Unit Set-up',
      rentalUnitName: 'Rental Unit Name',
      rentalUnitNameOpt: 'Rental Unit Name (Optional)',
      parcelId: 'Parcel Identifier (PID)',
      prRequirement: 'Principal Residence Requirement',
      theRentalUnitIs: 'The rental unit is:',
      supportingInfo: 'Supporting Information',
      other: 'Other',
      remove: 'Remove'
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
      rentalType: 'What type of space is offered in this rental unit?',
      entireHome: 'Entire home (guests have the entire place to themselves)',
      sharedAccomodation: 'Shared accommodation (guests rent a portion of the unit with access to common spaces that may be shared with the host or other guests)',
      hostSameUnit: 'The host lives in this unit when it’s not being rented',
      hostDifferentUnit: 'The host lives in another unit on the same property',
      hostResidence: 'Is this rental unit on the same property as the property host’s principal residence?',
      hostUnit: 'Where does the property host live on the property?',
      listEachWebLink: 'Add the web link for the rental unit’s listing on a short-term rental platform (e.g., airbnb.ca/your_listing123). You can add multiple links if this rental unit is listed on multiple platforms (e.g., Airbnb, VRBO, Expedia, etc.).',
      ownershipTypeLegend: 'Required, What is the ownership type of the property?',
      enterResiAddressToDetermineRequirement: 'Start by entering the residential address of rental unit to help determine if you need to register your short-term rental and if it is in an area subject to the {link}.',
      requireBusLicense: 'Your local government requires a valid business license to operate a short-term rental.',
      helpOwnerBtn: 'Help with Adding Individuals and Businesses',
      helpOwnerTitle: 'Adding Individuals and Businesses',
      helpOwner1: 'A Property Host is anyone who has the legal right to the property, as the owner or renter of the property.',
      helpOwner2: 'A Property Manager is a supplier host who is acting as an agent of the property host to manage the short-term rental.',
      helpOwner3: 'See more information in the {link}.'
    },
    word: {
      room: 'room | rooms',
      unit: 'unit | units'
    },
    hint: {
      businessLicense: 'This is the business license to operate a short-term rental as provided by your local government.',
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
    }
  },
  btn: {
    addCompParty: 'Start by adding a Completing Party',
    addBusiness: 'Add a Business',
    addIndividual: 'Add an Individual',
    view: 'View',
    saveStartApplication: 'Save & Start Application',
    createNewReg: 'Create New Registration',
    edit: 'Edit',
    done: 'Done',
    exitReg: 'Exit Registration',
    regDiffUnit: 'Register a Different Rental Unit',
    contWithReg: 'Continue with Registration',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    returnToStep: 'Return to the step to finish it'
  },
  error: {
    createAccount: {
      title: 'Error creating account',
      description: 'We could not create your account at this time. Please try again or if this issue persists, please contact us.'
    },
    docUpload: {
      fileSize: {
        title: 'Error Uploading Document',
        description: 'File size too large. Please only upload files less than 10mb.'
      },
      generic: {
        title: 'Error Uploading Document',
        description: 'Something went wrong when uploading the file, only pdfs and files less than 10mb are accepted.'
      }
    },
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
    exemption: 'Exemption',
    exemptionReason: 'Exemption Reason',
    exemptionReasonCode: {
      FARM_LAND: 'Farm land (BC Assessment Farm Class 9)',
      FRACTIONAL_OWNERSHIP: 'Fractional ownership',
      STRATA_HOTEL: 'Eligible strata-titled hotel or motel'
    },
    strataRefCode: 'Strata-Titled Hotel Reference Code',
    strUnitAddress: 'Short-Term Rental Unit Residential Address',
    strUnitName: 'Short-Term Rental Unit Name',
    strUnitNameOpt: 'Short-Term Rental Unit Name (Optional)',
    typeOfSpace: 'Type of Space',
    chooseDocs: 'Choose Supporting Documents',
    fileUpload: 'File Upload',
    localGovBL: 'Local Government Business License',
    localGovShortTermRentalBL: 'Local government short-term rental business license',
    proofOfPr: 'Proof of principal residence',
    supportingStrataDocs: 'Supporting strata-titled hotel or motel documentation',
    fractOwnAgreement: 'Fractional ownership agreement',
    businessLicenseNumberOpt: 'Business License Number (Optional)',
    businessLicenseExpiryDateOpt: 'Business License Expiry Date (Optional)',
    rentalAgreementOrRecept: 'Tenancy (rental) agreement or receipt or bank statement showing payment of rent',
    streetNameAndType: 'Street Name and Type',
    siteNameOpt: 'Site Name (Optional)',
    forNonCivicAddresses: 'For non-civic addresses',
    locality: 'Locality',
    additionalLocationDescription: 'Additional Location Description',
    lookupResidentialAddress: 'Look up the Residential Address',
    enterAddressManually: 'Enter the residental address manually'
  },
  link: {
    hostAccomodationsAct: 'Short-Term Rental Accommodations Act',
    hostTAC: 'Terms and Conditions',
    strataHotelInfoPage: 'strata hotel information page',
    proofOfPr: 'Proof of principal residence',
    allRules: 'rules for short-term rental',
    reqDocs: 'required documentation',
    learnMore: 'Learn More'
  },
  modal: {
    helpRegisteringStrata: {
      triggerBtn: 'Help with registering and managing short-term rentals',
      title: 'Short Term Rental Help',
      content: 'Help Text Here'
    },
    helpRegisterStrataHotel: {
      triggerBtn: 'Help with registering a strata hotel',
      title: 'Need Help?',
      content: 'For more information on definitions and rules, refer to the {act} and the Short-Term Rental Accommodation Regulation, or visit the {link}. If you need help with registering your strata hotel, using the My STR Registry Dashboard, or resolving a technical issue, you can also contact us directly.'
    },
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
    editUnitAddress: {
      title: 'Edit Rental Unit Address?',
      content: 'Editing the rental unit address will reset this application. Any information you have entered will be lost. Are you sure you want to continue?',
      confirmBtn: 'Yes, Edit Address'
    },
    removeUnitAddress: {
      title: 'Remove Rental Unit Address?',
      content: 'Removing the rental unit address will reset this application. Any information you have entered will be lost. Are you sure you want to continue?',
      confirmBtn: 'Yes, Remove Address'
    }
  },
  table: {
    hostPmList: {
      title: '{boldStart}My Registration Applications{boldEnd} ({count})',
      emptyText: "You don't have any properties yet. Add a property above."
    }
  },
  text: {
    thisPropIsExempt: 'This property is exempt from the principal residence requirement',
    followingDocsRequired: 'The following documentation is required for this registration:',
    followingDocsMayBeRequired: 'The following documentation may be required for this registration:',
    rentalUnitSetupLegend: 'Required: Select the set-up of the property, host principal residence, and rental unit.',
    typeOfSpaceLegend: 'Required: Select the type of space of the rental unit.',
    thisPropIsInLocWithReqs: 'This property is in a location where the following requirements apply:',
    thisPropCouldBeInLocWithReqs: 'This property could be in a location where the following requirements apply:',
    giveUnitNickname: 'Give your rental unit a name to help you identify it, especially if you manage multiple units.',
    addAllReqDocs: 'Add all required documentation that supports your short-term rental registration. {link}',
    toDetermineDocsReturnToStart: 'To determine the types of documentation you’ll need, please complete Step 1 of the application first.',
    uploadReqDocs: 'Upload all required documentation to support your application.',
    noDocsReq: 'No supporting documentation is required.',
    unitAddressIntro: 'Include the Residential Address of your short-term rental by looking up the address, or if the address cannot be found in the lookup, you can enter the address manually.',
    unitAddressIntroNote: 'Note: the address cannot be a Mailing Address (e.g., PO Box, etc.).',
    unitAddressUnitNumberInfo: 'Unit Number is required if the short-term rental unit has a Unit Number. Enter a Site Name if the address does not have a Street Number and Name.',
    noDocsUploaded: 'No supporting documentation uploaded.'
  },
  hint: {
    strataRefCode: 'This is a unique code for each registered strata hotel. Ask the strata hotel management for this code.',
    docUpload: 'File must be a PDF. Maximum 10 MB.',
    autocomplete: 'For example: 123 - 456 Street Name Victoria BC  V8V 2V2'
  },
  page: {
    dashboardList: {
      title: 'Dashboard - My Short-Term Rental Registry',
      h1: 'My Short-Term Rental Registry',
      subtitle: 'Register and keep short-term rental unit information up to date.'
    },
    chooseAccount: {
      title: 'Choose Account - My Short-Term Rental Registry',
      h1: 'Existing Account Found',
      existingAccountFoundAlert: '{boldStart}Note{boldEnd}: It looks like you already have an account with BC Registries and Online Services. You can use an existing account to proceed or create a new one.'
    },
    createAccount: {
      title: 'Create Account - My Short-Term Rental Registry',
      h1: 'Service BC Account Creation',
      subtitle: 'Create a new account to continue.',
      accountNameHint: "e.g., Andy's Rentals"
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
    propertyType: 'Please select the property type of this rental unit',
    onlineListings: 'Please enter a valid URL (i.e. https://www.bcregistry.gov.bc.ca)',
    rentalUnitSetupType: 'Please select the setup type of the rental unit',
    typeOfSpace: 'Please select the type of space of the unit',
    ownerRole: 'Please select the role',
    missingReqDocs: 'Missing required documents. Please see above for details.',
    blExpiryDate: 'The expiry date must be greater than today and in less than 1 year.',
    residentialAddressRequired: 'Residential address is required',
    addressIncompleteDropdown: 'The address provided is not complete. Please select one from the dropdown list.'
  },
  requirements: {
    busLicense: {
      label: 'Business license',
      content: {
        normal: 'Your local government requires a business license to operate a short-term rental at this address.',
        override: 'Your local government may require a business license to operate a short-term rental at this address.'
      }
    },
    pr: {
      label: 'Principal residence',
      content: {
        normal: '{link} is required as the provincial principal residence requirement applies to this address. Note: Short-term rentals are limited to the housing unit the host lives in plus one secondary suite or accessory dwelling unit on the same property.',
        override: '{link} is required if the provincial principal residence requirement applies to this address. Note: If the requirement applies, short-term rentals are limited to the housing unit the host lives in plus one secondary suite or accessory dwelling unit on the same property.'
      }
    }
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
    FLOAT_HOME: 'Float Home',
    undefined: 'Not Selected'
  },
  rentalUnitType: {
    ENTIRE_HOME: 'Entire home (guests have the entire place to themselves)',
    SHARED_ACCOMMODATION: 'Shared accommodation (guests rent a portion of the unit with access to common spaces that may be shared with the host or other guests)',
    undefined: 'Not Selected'
  },
  rentalUnitSetupType: {
    WHOLE_PRINCIPAL_RESIDENCE: "This unit is the host's principal residence", // The whole Host Principal Residence
    UNIT_ON_PR_PROPERTY: 'This unit is not the host’s principal residence but it’s on the same property', // A whole unit on the same property as the Host Principal Residence (e.g., basement suite)
    UNIT_NOT_ON_PR_PROPERTY: 'This unit is not on the same property as the host’s principal residence',
    undefined: 'Not Selected'
  },
  ownershipType: {
    RENT: 'Renter',
    OWN: 'Owner',
    CO_OWN: 'Co-owner',
    OTHER: 'Other',
    undefined: 'Not Selected'
  },
  tooltip: {
    pid: 'You can find your Parcel Identifier (PID) on your Property Assessment Notice from BC Assessment. Alternatively, visit the BC Assessment website, search for your civic address, and look for the PID under ‘Legal Description and Parcel ID’.'
  }
}
