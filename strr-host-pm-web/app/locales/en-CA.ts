/* eslint-disable max-len */
export default {
  alert: {
    prRequired: {
      title: 'Your property is in a location where the principal residence requirement applies.'
    },
    straaExempt: {
      title: '{boldStart}Registration Not Required:{boldEnd} This address appears to be located on First Nation land and is therefore exempt from the {italicStart}Short-term Rental Accommodations Act{italicEnd}. You do not need to register a short-term rental at this address.',
      note: 'Please check with the First Nation for any applicable Short-Term Rental regulations.'
    },
    strProhibited: {
      title: 'Local government by-laws apply for short-term rentals at this address. Ensure your rental follows all local government rules. If you have questions contact your local government.'
    },
    prExempt: {
      title: "Short-term rentals are allowed in any of the host's properties."
    },
    propertyTypeReqUnitNumber: { // camelcase prop (propertytype) not working with ConnectI18nHelper component
      always: '{boldStart}Important:{boldEnd} {propertytype} requires a unit number as part of the Rental Unit Residential Address above. If you do not include a unit number, your registration {boldStart}may be declined{boldEnd}.',
      maybe: '{boldStart}Important:{boldEnd} If your {propertytype} includes a unit number, make sure to enter it as part of the Rental Unit Residential Address above. You may submit your application without a unit number if none exists.'
    },
    renewalChangeAddress: '{boldStart}Note:{boldEnd} If you wish to change the Rental Unit Address, you must submit a new short-term rental application instead of this renewal application.',
    renewalEditPerson: '{boldStart}Note:{boldEnd} If you wish to change any of the following information about the Property Host, you must submit a new short-term rental application instead of this renewal application.{newLine}{newLine}- Full Name{newLine}- Canada Revenue Agency (CRA) Tax Number{newLine}- Residential Address',
    renewalEditBusiness: '{boldStart}Note:{boldEnd} If you wish to change the Business Legal Name of the Property Host, you must submit a new short-term rental application instead of this renewal application.',
    businessLicense: {
      title: 'Important: Business licence – Required.',
      description: 'Your local government requires a business licence to operate a short-term rental at this address.'
    },
    platformMatchRequired: '{boldStart}Important: Platform Address Match Required.{boldEnd} If you’re hosting on a Platform (e.g., Airbnb, Vrbo), make sure the address listed there matches this STR Registry address exactly. If it doesn’t, please contact the Platform directly to update it.',
    strataHotelUnit: '{boldStart}Important:{boldEnd} Strata Hotel Unit applications must be connected to a Strata Hotel platform registration. If your Strata Hotel platform is not registered, this application {boldStart}may be declined{boldEnd}.'
  },
  certify: {
    1: '{terms} I agree to comply with the {link} of registration.',
    2: '{boldStart}Tax Auditing.{boldEnd} I understand that my registration information will be shared with British Columbia’s Ministry of Finance and the Canada Revenue Agency for the purposes of administering and enforcing provincial and federal tax and tax related statutes.',
    3: "{boldStart}Principal Residence Declaration.{boldEnd} As required by section 14 (2) of the {italicStart}Short-Term Rental Accommodations Act{italicEnd} (the Act), I declare that I will comply with the principal residence requirement in the Act and provide the short-term rental accommodation services described in this registration in one or both of: a. the property host's principal residence, and b. not more than one secondary suite or accessory dwelling unit on the same property. I understand that if I do not comply with the principal residence requirement, I may be subject to enforcement action under Part 4 of the Act, including being ordered to pay an administrative penalty.",
    4: '{boldStart}Accuracy of Information.{boldEnd} I confirm that the information contained in the application for registration is accurate and true. I understand that if I have knowingly provided inaccurate or false information, I may be subject to enforcement action under Part 4 of the {italicStart}Short-Term Rental Accommodations Act{italicEnd}.',
    confirm: 'I, {boldStart}{name}{boldEnd}, confirm that I understand and agree to all of the requirements listed above.',
    authorization: 'I, {boldStart}{name}{boldEnd}, have relevant knowledge of and am authorized to submit this registration.',
    tac: 'Terms and Conditions.'
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
        BC_DRIVERS_LICENSE: "BC Driver's Licence",
        PROPERTY_ASSESSMENT_NOTICE: 'Property Assessment Notice',
        SPEC_TAX_CONFIRMATION: 'Speculation and Vacancy Tax Confirmation',
        HOG_DECLARATION: 'Home Owner Grant declaration',
        ICBC_CERTIFICATE_OF_INSURANCE: 'ICBC Certificate of Insurance',
        HOME_INSURANCE_SUMMARY: 'Home Insurance Summary',
        PROPERTY_TAX_NOTICE: 'Property Tax Notice',
        UTILITY_BILL: 'Utility Bill',
        GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE: 'Government or Crown Corporation Official Notice',
        TENANCY_AGREEMENT: 'Tenancy Agreement',
        RENT_RECEIPT_OR_BANK_STATEMENT: 'Notice of Rent Increase',
        LOCAL_GOVT_BUSINESS_LICENSE: 'Local Government Business Licence',
        OTHERS: 'Other Proof Document (subject to review by registry staff)',
        STRATA_HOTEL_DOCUMENTATION: 'Supporting strata-titled hotel or motel documentation',
        FRACTIONAL_OWNERSHIP_AGREEMENT: 'Fractional ownership agreement',
        BCSC: 'British Columbia Services Card',
        COMBINED_BCSC_LICENSE: 'Combined BC Driver’s Licence and Services Card',
        undefined: 'N/A'
      }
    }
  },
  strr: {
    step: {
      stepperLabel: 'Short-Term Rental Application Step Navigation',
      description: {
        0: 'Define Your Short-Term Rental',
        1: 'Add Individuals and Businesses',
        2: 'Add Supporting Information',
        3: 'Review and Confirm'
      },
      title: {
        0: 'Define Your Short-Term Rental',
        1: 'Add Individuals and Businesses',
        2: 'Add Supporting Information',
        3: 'Review and Confirm'
      },
      info: {
        0: 'Tell us about the short-term rental unit. If you have multiple short-term rental units, you must submit a separate registration for each one. However, if you rent multiple rooms at the same address, you can register them together.',
        1: 'List all of the individuals and businesses who have a role in your short-term rental registration. The person completing the form must be an individual.',
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
        completingParty: 'Person Completing the Form',
        craBusinessNumber: 'Canada Revenue Agency (CRA) Business Number',
        craTaxNum: 'Canada Revenue Agency (CRA) Tax Number',
        emailAddress: 'Email Address',
        faxNumber: 'Fax Number',
        individualName: "Individual's Name",
        individualPreferredName: "Individual's Preferred Name",
        mailingAddress: 'Mailing Address',
        phoneNumber: 'Phone Number',
        propertyAddress: 'Rental Unit Address',
        propertyDetails: 'Rental Unit Details',
        propertyListings: 'Online Listings',
        rentalUnitResiAddress: 'Short-Term Rental Unit Residential Address',
        residentialAddress: 'Residential Address',
        role: 'Role'
      }
    },
    title: {
      application: 'Short-Term Rental Registration',
      renewalApplication: 'Short-Term Rental Registration Renewal',
      comingSoon: 'Short-Term Rental Registry Coming Soon',
      dashboard: 'My Short-Term Rental Registry',
      default: 'TBD'
    },
    label: {
      addBusiness: 'Add a Business',
      addIndividual: 'Add an Individual',
      addListing: 'Add Another Listing',
      businessLicense: 'Business Licence Number',
      businessLicenseOpt: 'Local Government Business Licence (Optional)',
      businessLicenseDate: 'Business Licence Expiry Date',
      contactIndName: "Contact Individual's Name",
      registrationStatus: 'Registration Status',
      termsConditions: 'Terms and Conditions',
      individualsBusinesses: 'Individuals and Businesses',
      listingLinkOpt: 'Listing Link (Optional)',
      numberOfRooms: 'Number of Bedrooms for Rent',
      ownershipType: 'Ownership Type',
      nicknameOpt: 'Nickname (Optional)',
      parcelIdentifier: 'Parcel Identifier (Required if one exists)',
      parcelIdentifierOpt: 'Parcel Identifier (Optional)',
      strataRegNum: 'Enter your strata hotel platform registration number',
      hostType: 'Property Host Type',
      strRentalType: 'Short-term Rental Property/Unit Type',
      propertyType: 'Rental Unit Type',
      selectPropertyType: 'Select your property type',
      rentalUnitSetupNote: '{boldStart}Note:{boldEnd} Some options may not be available due to local government restrictions according to your address above.',
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
      businessLicence: 'Business Licence',
      theRentalUnitIs: 'The rental unit is:',
      supportingInfo: 'Supporting Information',
      other: 'Other',
      remove: 'Remove',
      unnamed: 'Unnamed',
      completingParty: 'Person Completing the Form',
      added: 'ADDED'
    },
    text: {
      applicationMustInclude: 'You must provide the names and details of the following individuals and / or businesses:',
      businessContactIndividual: 'Enter the information for the individual to be contacted at this business.',
      comingSoon: 'Short-Term Rental Registry will be available on December 15, 2024',
      completingPartyInfo: 'Select this option if you are entering information for yourself.',
      completingPartyCheckbox: 'I am adding my own information',
      includeCompletingParty: 'Person Completing the Form',
      includeHost: 'The Property Host',
      includeCohost: 'The Co-host (if applicable)',
      includePropertyManager: 'The Property Manager (if applicable)',
      rentalType: 'What type of space is offered in this rental unit?',
      entireHome: 'Entire home (guests have the entire place to themselves)',
      sharedAccomodation: 'Shared accommodation (guests rent a portion of the unit with access to common spaces that may be shared with the host or other guests)',
      hostSameUnit: 'The host lives in this unit when it’s not being rented',
      hostDifferentUnit: 'The host lives in another unit on the same property',
      hostResidence: 'Is this rental unit on the same property as the property host’s principal residence?',
      hostUnit: 'Where does the property host live on the property?',
      listEachWebLink: 'Add the web link for the rental unit’s listing on a short-term rental platform (e.g., airbnb.ca/your_listing123). You can add multiple links if this rental unit is listed on multiple platforms (e.g., Airbnb, VRBO, Expedia, etc.).',
      ownershipTypeLegend: 'Required, What is the ownership type of the property?',
      helpOwnerBtn: 'Help with Adding Individuals and Businesses',
      helpOwnerTitle: 'Adding Individuals and Businesses',
      helpOwner1: 'A Property Host is the person who has the legal right to the property, as the owner or renter of the property.',
      helpOwner2: 'A Co-host who is responsible for managing the short-term rental on behalf of the property host must be added to the registration (if applicable). It is optional to add a co-host who only assists the property host to manage the short-term rental.',
      helpOwner3: 'A Property manager who is acting as an agent of the property host to manage the short-term rental must be added to the registration (if applicable).',
      helpOwner4: 'See more information in the {link}.',
      emailNote: 'Email will be the default method of communication. Information sent via email will be considered received on the third day after the email is sent.'
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
      parcelIdentifier: 'This is a nine-digit number that identifies the parcel in the land title of your property.',
      strataRegNumHint: 'This is a unique code for each registered strata hotel. Ask the strata hotel management for this code.'
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
    addNewDocuments: 'Add New Documents',
    view: 'View',
    saveStartApplication: 'Save & Start Application',
    createNewReg: 'Create New Registration',
    edit: 'Edit',
    done: 'Done',
    cancel: 'Cancel',
    submti: 'Submit',
    exitReg: 'Exit Registration',
    regDiffUnit: 'Register a Different Rental Unit',
    contWithReg: 'Continue with Registration',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    returnToStep: 'Return to the step to finish it',
    ariaViewDetails: 'View details for property: {name}, {address}',
    registerAStr: 'Register a Short-Term Rental',
    renew: 'Renew'
  },
  error: {
    createAccount: {
      title: 'Error creating account',
      description: 'We could not create your account at this time. Please try again or if this issue persists, please contact us.'
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
    lastStatusChange: 'Last Status Change',
    property: 'Property',
    details: 'Details',
    done: 'Done',
    exemption: 'Exemption',
    exemptionReason: 'Exemption Reason',
    prExemption: 'Principal Residence Exemption',
    prExemptionReason: 'Principal Residence Exemption Reason',
    exemptionReasonCode: {
      FARM_LAND: 'Farm land (BC Assessment Farm Class 9)',
      FRACTIONAL_OWNERSHIP: 'Fractional ownership',
      STRATA_HOTEL: 'Eligible strata-titled hotel or motel',
      undefined: 'Not Selected'
    },
    blExemption: 'Business Licence Exemption',
    blExemptionReason: 'Business Licence Exemption Reason',
    blExemptionReasonOver30: 'This short-term rental does not offer bookings of under 30 days',
    blExemptionReasonOther: 'Other',
    blExemptionReasonOtherPlaceholder: 'Reason',
    StrataHotelCategory: 'Strata Hotel Category',
    strataRefCode: 'Strata-Titled Hotel Reference Code',
    strUnitAddress: 'Short-Term Rental Unit Residential Address',
    strUnitName: 'Short-Term Rental Unit Nickname',
    strUnitNameOpt: 'Short-Term Rental Unit Nickname (Optional)',
    typeOfSpace: 'Type of Space',
    chooseDocs: 'Choose type of supporting document to upload',
    fileUpload: 'File Upload',
    localGovBL: 'Local Government Business Licence',
    localGovShortTermRentalBL: 'Local government short-term rental business licence',
    proofOfPr: 'Proof of principal residence',
    supportingStrataDocs: 'Supporting strata-titled hotel or motel documentation',
    fractOwnAgreement: 'Fractional ownership agreement',
    propertyAssessmentNotice: 'Property Assessment Notice',
    businessLicenseNumberOpt: 'Business Licence Number (Optional)',
    businessLicenseExpiryDateOpt: 'Business Licence Expiry Date (Optional)',
    rentalAgreementOrNoticeOfIncrease: 'Tenancy (rental) agreement or receipt or Notice of rent increase',
    streetNameAndType: 'Street Name and Type',
    siteName: 'Site Name',
    siteNameOpt: 'Site Name (Optional)',
    forNonCivicAddresses: 'For non-civic addresses',
    locality: 'Locality',
    additionalLocationDescription: 'Additional Location Description',
    locationDescOpt: 'Location Description (Optional)',
    unitNumber: 'Unit Number',
    unitNumberWithUnits: 'Unit Number (Required if building has multiple units)',
    lookupResidentialAddress: 'Look up the Residential Address',
    enterAddressManually: 'Enter the residential address manually',
    unnamed: 'Unnamed',
    completingParty: 'Person completing form',
    individualOrBusiness: 'Individual or Business',
    contactDetails: 'Contact Details',
    noCraTaxNumber: 'No CRA Tax Number',
    renewalDayCount: 'Less than 1 day | in 1 day | in {count} days'
  },
  link: {
    hostAccomodationsAct: 'Short-Term Rental Accommodations Act',
    hostTAC: 'Terms and Conditions',
    strataHotelInfoPage: 'strata hotel information page',
    proofOfPr: 'Proof of principal residence',
    allRules: 'rules for short-term rental',
    reqDocs: 'required documentation',
    learnMore: 'Learn More',
    viewRequiredDocs: 'View required documents',
    viewFeeSchedule: 'View fee schedule',
    selectStrataHotelCategory: 'Learn more about strata hotel categories',
    strataPlatformRegNum: 'Where do I find the Strata Hotel Platform Registration Number?'
  },
  modal: {
    info: {
      collectionNotice: {
        triggerBtn: 'Information collection notice',
        title: 'Information Collection Notice',
        content: {
          p1: 'This personal information is being collected by the Ministry of Housing and Municipal Affairs under s. 33(1) of the {straAct} and s. 33(2)(e) of the {fippaAct} for the purpose of registering a short-term rental offer.',
          p2: 'The Ministry may share the information with the local government of the area in which the property where short-term rental accommodation services will be offered. If you have any questions about the collection of this personal information, please contact the Executive Director of the Short-Term Rental Branch, at {email}'
        }
      }
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
      title: '{boldStart}My Short-Term Rentals{boldEnd} ({count})',
      emptyText: "You don't have any properties yet. Add a property above."
    }
  },
  text: {
    thisPropIsExempt: 'This property is exempt from the principal residence requirement',
    businessLicNotRequired: 'This short-term rental does not require a business licence',
    followingDocsRequired: 'The following documentation is required for this registration:',
    followingDocsMayBeRequired: 'The following documentation may be required for this registration:',
    rentalUnitSetupLegend: 'Required: Select the set-up of the property, host principal residence, and rental unit.',
    typeOfSpaceLegend: 'Required: Select the type of space of the rental unit.',
    hostTypeLegend: 'Required',
    thisPropIsInLocWithReqs: 'This property is in a location where the following requirements apply:',
    thisPropCouldBeInLocWithReqs: 'This property could be in a location where the following requirements apply:',
    giveUnitNickname: 'Give your rental unit a nickname to help you identify it, especially if you manage multiple units.',
    addAllReqDocs: 'Add all required documentation that supports your short-term rental registration. {link}',
    toDetermineDocsReturnToStart: 'To determine the types of documentation you’ll need, please complete Step 1 of the application first.',
    hostDashboardAddressBreakdown: 'Follow the instructions on your short-term rental platform to update your listing with your {boldStart}Registration Number, Unit Number, Street Number, and Postal Code exactly as it is shown below.{boldEnd} Your listing will be taken down if the below information does not match what’s entered in the platform.{newLine}{newLine}',
    uploadReqDocs: 'Upload all required documentation to support your registration.',
    noDocsReq: 'No supporting documentation is required.',
    missingDocuments: 'Missing required documents.',
    unitAddressIntro: 'Include the Residential Address of your short-term rental by looking up the address, or if the address cannot be found in the lookup, you can enter the address manually.',
    unitAddressIntroNote: 'Note: the address cannot be a Mailing Address (e.g., PO Box, etc.).',
    unitMailingIntroNote: '{boldStart}Important:{boldEnd} Mailing addresses (e.g., PO Boxes) are not accepted in any street address fields. Please enter a complete physical address of the rental unit.',
    unitAddressUnitNumberInfo: 'Unit Number is required if the short-term rental unit has a Unit Number. Enter a Site Name if the address does not have a Street Number and Name.',
    noDocsUploaded: 'No supporting documentation uploaded.',
    bceidSubtext: 'Requires an existing BCeID login account',
    noIndividualsOrBusinesses: 'You don’t have any individuals or businesses listed yet. Select “Add an individual” or “Add a business” above.',
    ifYouHaveBl: 'If you have a business licence for your short-term rental, add your information here.',
    complyWithBylaws: 'The host must comply with local government bylaws'
  },
  help: {
    address: {
      title: 'How to enter your address',
      show: 'Show How to enter your address',
      hide: 'Hide',
      review: 'Help with your Address',
      street: {
        heading: 'Street Address',
        desc: 'This diagram shows the key components of a standard Canadian street address, with examples to help accurately enter and verify address information.',
        examples: {
          title: 'Here are some Address examples:',
          alt: 'Street address examples showing numbered components',
          withUnit: {
            title: 'With Unit Number',
            sample: '456–236 Granville St, Vancouver, BC  V6C 1T2'
          },
          numbered: {
            title: 'Numbered Street',
            sample: '45 33rd St, Castlegar, BC V1N 2P7'
          }
        }
      },
      noncivic: {
        heading: 'I do not have a Street Address',
        desc: 'This is common for rural, remote, or seasonal places like cabins, recreation sites, or float homes. If your property doesn\'t have a street (civic) address, select \'I do not have a street address\' in the form and fill in the \'Site Name\' field.',
        siteName: 'Site Name',
        examples: {
          title: 'Here are some Site Name examples:',
          alt: 'Non-civic address examples showing different site naming conventions',
          ruralRoute: {
            title: 'Rural Route (RR)',
            sample: 'Site 4 Comp 2 RR 1, Prince George BC V2N 5V7'
          },
          firstNations: {
            title: 'First Nations Communities',
            sample: 'Cabin 7, IR No. 4, Cowichan Tribes, Duncan BC V9L 3Y3'
          },
          marine: {
            title: 'Marine or Floating Residences',
            sample: 'Slip 18, Dock B, Coal Harbour Marina, Vancouver BC V6H 3R9'
          },
          seasonal: {
            title: 'Seasonal/Remote Cabins or Recreation Sites',
            sample: 'Cabin 7, Lakelands Recreation Site, Smithers BC V0J 2N0'
          }
        }
      }
    }
  },
  hint: {
    strataRefCode: 'This is a unique code for each registered strata hotel. Ask the strata hotel management for this code.',
    docUpload: 'File must be a PDF, jpeg, or jpg. Maximum 10 MB.',
    autocomplete: 'e.g., 123 - 456 Street Name Victoria BC  V8V 2V2',
    streetNumber: 'e.g., 123, 123A, 123 1/2',
    streetName: 'e.g., Main St, 6th St East, Sun Peaks RD',
    unitNumber: 'Unit or apartment number only (e.g., 205, 3A)',
    locality: 'City, Town, Township, ect.',
    siteName: 'For rural, remote, or seasonal places like cabins, recreation sites, or float homes (e.g., Site 5, Comp 18, RR 1)'
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
    required: 'Required',
    maxChars: 'Maximum {maxLen} Characters',
    accountName: {
      required: 'Please enter an account name',
      exists: 'An account with this name already exists'
    },
    businessLicense: 'Please enter a valid business licence number',
    strataHotelCategory: 'Please select a category',
    strataPlatformRegNum: 'You must enter the strata hotel platform number for your application to be reviewed',
    businessLicenseExpiryDate: 'Please select the expiry date for the business licence',
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
    rentalUnitSetupOption: 'Please select the rental unit setup option',
    typeOfSpace: 'Please select the type of space of the unit',
    ownerRole: 'Please select the role',
    missingReqDocs: 'Missing required documents. Please see above for details.',
    blExpiryDate: 'The expiry date must be greater than today and in less than 1 year.',
    residentialAddressRequired: 'Residential address is required',
    addressIncompleteDropdown: 'The address provided is not complete. Please select one from the dropdown list.',
    sin: 'Please enter a valid 9-digit SIN, TTN, or ITN',
    addressForm: {
      streetNumber: 'Enter a street number',
      streetNumberInvalid: 'Max 6 numbers + 1 Character or 1/2, no spaces unless followed by a fraction (e.g., 1/2)',
      streetName: 'Enter a street name',
      unitNumberInvalid: 'Numbers must be listed first followed by a letter if applicable (e.g., 205, 3A)',
      siteName: 'Enter a site name',
      siteNameInvalid: 'Enter a valid site name',
      city: 'Enter a city, town, township, etc.',
      postalCode: 'Enter a postal code',
      postalCodeInvalid: 'Enter a valid postal code'
    }
  },
  requirements: {
    busLicense: {
      label: 'Business licence',
      content: {
        normal: 'A local government business licence is required to register a short-term rental at this address.',
        override: 'A local government business licence may be required to register a short-term rental at this address.'
      }
    },
    pr: {
      label: 'Principal residence',
      content: {
        normal: '{link} is required to register this address. The provincial principal residence requirement limits short-term rentals in this area to the housing unit the host lives in plus one secondary suite or accessory dwelling unit on the same property, unless you qualify for an exemption.',
        override: '{link} may be required to register this address. The provincial principal residence requirement could limit short-term rentals in this area to the housing unit the host lives in plus one secondary suite or accessory dwelling unit on the same property, unless you qualify for an exemption.'
      }
    }
  },
  todos: {
    renewal: {
      title1: 'Registration Renewal - Due:',
      title2: 'at 11:59 pm PT',
      expiresSoon: 'Your short-term rental registration will expire soon. Please submit a renewal application to keep your registration active.{newLine}{newLine}{boldStart}Note:{boldEnd} If you wish to change any of the following information, you must submit a new short-term rental application instead of a renewal application.{newLine}{newLine}\u2022 Rental Unit Address{newLine}\u2022 Property Host details (if an individual): Full Name, CRA Tax Number, Residential Address{newLine}\u2022 Property Host details (if a business): Business Legal Name',
      expired: 'Your short-term rental registration has expired. Please submit a renewal application to reactive your registration.{newLine}{newLine}{boldStart}Note:{boldEnd} If you wish to change any of the following information, you must submit a new short-term rental application instead of a renewal application.{newLine}{newLine}\u2022 Rental Unit Address{newLine}\u2022 Property Host details (if an individual): Full Name, CRA Tax Number, Residential Address{newLine}\u2022 Property Host details (if a business): Business Legal Name'
    },
    renewalClosed: {
      title: 'Registration Renewal Period Closed',
      subtitle: 'Your short-term rental registration has been {boldStart}expired for over 3 years{boldEnd} and {boldStart}can no longer be renewed.{boldEnd} Please go back to your dashboard and {boldStart}submit a new application{boldEnd} if you wish to register your short-term rental.'
    }
  },
  propertyType: {
    SECONDARY_SUITE: 'Secondary Suite (basement suite)',
    ACCESSORY_DWELLING: 'Accessory Dwelling Unit (e.g., Laneway home, garden suite, etc.)',
    TOWN_HOME: 'Townhome',
    MULTI_UNIT_HOUSING: 'Multi-unit Housing (e.g., Condo, Apartment, Townhome, Duplex, triplex)',
    CONDO_OR_APT: 'Condo or Apartment',
    STRATA_HOTEL: 'Strata Hotel',
    SINGLE_FAMILY_HOME: 'Single Family Home',
    RECREATIONAL: 'Recreational (e.g. cabin, cottage)',
    BED_AND_BREAKFAST: 'Bed and Breakfast',
    FLOAT_HOME: 'Float Home',
    undefined: 'Not Selected'
  },
  rentalUnitType: {
    ENTIRE_HOME: 'Entire Home (guests rent an entire residence for themselves)',
    SHARED_ACCOMMODATION: 'Room in a Home (guest rent only a portion of a residence (e.g. a bedroom) and may share common spaces with the host or other guests. If you select this option, you will be charged a fee per room.',
    undefined: 'Not Selected'
  },
  propertyHostType: {
    OWNER: 'The owner of this unit',
    FRIEND_RELATIVE: 'A friend or relative of the owner',
    LONG_TERM_TENANT: 'The long-term tenant of this unit'
  },
  rentalUnitSetupType: {
    WHOLE_PRINCIPAL_RESIDENCE: "This unit is the host's principal residence or a room within the host's principal residence", // TODO: update enum to not be whole pr ???
    UNIT_ON_PR_PROPERTY: "This unit is not the host's principal residence but it's on the same property",
    UNIT_NOT_ON_PR_PROPERTY: "This unit is not on same property as host's principal residence",
    undefined: 'Not Selected'
  },
  rentalUnitSetupOption: {
    OPTION_1: {
      label: "Option 1: You are short-term renting a unit on a property you don't live at",
      desc: "This option is for renting out a unit on a property that is {boldStart}different from where you live{boldEnd}. This is only available in certain locations, confirm with local government if this applies. This is typically an investment property, a vacation home you don't live in, or any other property you own but do not occupy."
    },
    OPTION_2: {
      label: 'Option 2: You are short-term renting a separate unit on the property where you live',
      desc: "This option applies if you live at a property and are short term renting out a separate, self-contained unit (secondary or basement suite, laneway house or garden suite) on that same property. You live in the main unit on the property and you are renting out the space you don't physically live in.",
      scenarioA: '{boldStart}Scenario A:{boldEnd} You live in the main part of a house and rent out the basement suite.',
      scenarioB: '{boldStart}Scenario B:{boldEnd} You live in the main house and rent out a separate laneway house or garden suite in the backyard.',
      scenarioC: '{boldStart}Scenario C:{boldEnd} You live in the basement suite, laneway house or garden suite in the backyard and rent out the main house.',
      alert: "{boldStart}Common point of confusion:{boldEnd} Even though a basement suite is part of the same building, it's considered a separate unit. If the guest does not have access to all of your amenities, this is your option. Therefore, if you live upstairs and rent the basement, you must select {boldStart}Option 2{boldEnd}."
    },
    OPTION_3: {
      label: 'Option 3: You are short-term renting or sharing the space you live in',
      desc: 'This option applies if you are short-term renting out a part of, or the entirety of, the unit you live in.',
      scenarioA: "{boldStart}Scenario A:{boldEnd} You short-term rent out your entire unit while you're away on vacation.",
      scenarioB: '{boldStart}Scenario B:{boldEnd} You short-term rent out a spare bedroom(s) in the unit where you live and the guest has access to your common amenities.',
      scenarioC: '{boldStart}Scenario C:{boldEnd} If you are a tenant renting a unit (secondary or basement suite, laneway house or garden suite), you can short-term rent only that unit in which you live in while you are away on vacation.'
    }
  },
  ownershipType: {
    RENT: 'Renter',
    OWN: 'Owner',
    CO_OWN: 'Co-owner',
    OTHER: 'Other',
    undefined: 'Not Selected'
  },
  tooltip: {
    pid: 'You can find your Parcel Identifier (PID) on your Property Assessment Notice from BC Assessment. Alternatively, visit the BC Assessment website, search for your civic address, and look for the PID under ‘Legal Description and Parcel ID’.',
    noticeOfConsideration: 'You have received a Notice of Consideration',
    needsAttention: 'This application requires attention. Open to view details.'
  },
  approvalConditionsExpanded: {
    principalResidence: 'The host must use this unit as their Principal Residence',
    validBL: 'The host must have a valid business licence',
    minBookingDays: 'Offers and Bookings must be a minimum amount of {minDays} days',
    class9FarmLand: 'This Short-Term Rental must maintain a Class 9 Farm Land designation to be exempt from the Principal Residence requirement',
    partOfStrataHotel: 'This Short-Term Rental must remain part of a Strata Hotel building and to be exempt from the Principal Residence requirement',
    fractionalOwnership: 'This Short-Term Rental property must remain subject to a Fractional Ownership Agreement to be exempt from the Principal Residence requirement'
  },
  ConnectFeeWidget: {
    feeSummary: {
      itemLabels: {
        HOSTREG_1: 'STR Application Fee',
        HOSTREG_2: 'STR Application Fee',
        HOSTREG_3: 'STR Application Fee'
      }
    }
  }
}
