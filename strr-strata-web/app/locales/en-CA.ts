/* eslint-disable max-len */
export default {
  breadcrumb: {
    str: {
      strataApplication: 'STR Strata-Titled Hotel or Motel Application',
      strataApplicationRenewal: 'STR Strata-Titled Hotel or Motel Application Renewal'
    }
  },
  strr: {
    step: {
      stepperLabel: 'Strata Hotel Application Step Navigation',
      description: {
        0: 'Add Contact Information',
        1: 'Add Business Details',
        2: 'Add Strata Hotel Information',
        3: 'Review and Confirm'
      },
      title: {
        0: 'Step 1 - Contact Information',
        1: 'Step 2 - Business Details',
        2: 'Step 3 - Strata-Titled Hotel or Motel Information ',
        3: 'Step 4 - Review and Confirm'
      },
      info: {
        0: 'Strata-titled hotels and motels must identify a representative to communicate with the Province. This person will be responsible for representing the strata-titled hotel or motel regarding regulatory requirements for strata-titled hotels and motels.',
        1: 'Provide information about the business operating the strata-titled hotel or motel.',
        2: 'Provide information about the strata-titled hotel or motel you are registering. If you operate additional strata-titled hotels or motels, you must register each of them separately.',
        3: 'Review and confirm all of the information you provided as shown below.'
      }
    },
    section: {
      title: {
        buildings: 'Strata Hotel Buildings',
        completingParty: 'Person Completing Strata-Titled Hotel or Motel Application',
        details: 'Strata-Titled Hotel or Motel Details',
        primaryRep: 'Strata-Titled Hotel or Motel Representative',
        secondaryRep: 'Secondary Strata-Titled Hotel or Motel Representative'
      },
      subTitle: {
        brand: 'Strata-Titled Hotel or Motel',
        numberOfUnits: 'Number of Rental Units',
        primaryStrataBuilding: 'Primary Strata-Titled Hotel or Motel Building',
        strataBuilding: 'Strata-Titled Hotel or Motel Building'
      }
    },
    title: {
      application: 'Short-Term Rental Strata-Titled Hotel or Motel Application',
      applicationRenewal: 'Short-Term Rental Strata-Titled Hotel or Motel Application Renewal',
      comingSoon: 'Short-Term Rental Strata Hotel Registry Coming Soon',
      dashboard: 'My STR Strata-Titled Hotel or Motel Registry',
      default: 'TBD'
    },
    label: {
      addBuilding: 'Add a Building',
      building: 'Building | Buildings | Primary Building',
      brandName: 'Strata-Titled Hotel or Motel Name',
      brandSite: 'Strata-Titled Hotel or Motel Website',
      numberOfUnits: 'Number of Rental Units',
      registeringBusiness: 'Registering Business',
      regOfficeAttSvc: 'Registered Office or Attorney for Service',
      confirmation: 'Confirmation',
      termsAndCond: 'Terms and Conditions',
      termsAndCondLowerCase: 'terms and conditions',
      strataHotelCategory: 'Strata Hotel Category',
      added: 'ADDED'
    },
    text: {
      comingSoon: 'Short-Term Rental Strata Hotel Registry will be available on December 15, 2024',
      isUserRep: 'Are you the strata-titled hotel or motel representative?',
      primaryContact: 'This is the primary contact person for the strata-titled hotel or motel.',
      buildingsSubText: 'Enter the address for each building that is part of the strata-titled hotel or motel. Include all co-located buildings in your application.',
      selectStrataHotelCategory: {
        a11y: 'Required: Identify the type of strata-titled hotel or motel.',
        link: 'Learn more about strata hotel categories'
      }
    },
    word: {
      unit: 'unit | units'
    },
    hint: {
      brandName: 'The name of the strata-titled hotel or motel.',
      brandSite: 'e.g., https://www.your-strata-hotel.ca/',
      numberOfUnits: 'The total number of units within the strata-titled hotel or motel that are offered as short-term rental accommodation.'
    },
    review: {
      brand: {
        name: 'Strata-Titled Hotel or Motel Name',
        site: 'Strata-Titled Hotel or Motel Website'
      },
      unitsOffered: 'Rental Units Offered',
      unitsLink: 'List of Short-Term Rental Units'
    },
    units: {
      title: 'Short-Term Rental Units in Building',
      description: 'List all units within the strata hotel that are offered as short-term rentals. This helps confirm which listings belong to your strata hotel and prevents false or unauthorized listings.',
      important: {
        title: 'Important:',
        items: [
          'Enter each unit separated on a new line (enter or cut and paste from a spreadsheet column)',
          'Do not add spaces within the unit numbers',
          'Do not enter a range of units (e.g., 101–106). Each unit number must be listed individually on a new line.'
        ]
      },
      examples: {
        show: 'Show examples of how to list units',
        hide: 'Hide examples of how to list units',
        hide2: 'Hide',
        title: 'Enter Units Line by Line',
        description: 'This is the format you will get when cutting and pasting a column in a spreadsheet.',
        values: ['102', '103A', '104', 'PH900', 'suite909']
      },
      placeholder: 'Enter Units Here...',
      helper: 'Enter each unit number without spaces. Ex: 102, 103A, 104, PH900 etc.',
      error: 'Enter list of units offered as Short-Term rentals within this building',
      reviewTitle: 'Short-Term Rental Units',
      modalTitle: 'Short-Term Rental Units',
      primaryLabel: 'Primary Building',
      buildingLabel: 'Building {number}'
    }
  },
  btn: {
    addStrataHotel: 'Add a strata-titled hotel or motel',
    view: 'View',
    ariaViewDetails: 'View details for property: {name}`',
    addNewDocuments: 'Add New Documents',
    cancel: 'Cancel',
    renew: 'Renew'
  },
  label: {
    strataName: 'Strata Name',
    hotelName: 'Hotel Name',
    expiryDate: 'Expiry Date',
    application: 'Application',
    registration: 'Registration',
    date: 'Date',
    expired: 'Expired',
    expiresToday: 'Expires today',
    dayCount: '0 days | 1 day | {count} days',
    lastStatusChange: 'Last Status Change',
    daysToExpiry: 'Days to Expiry (Pacific Time)',
    chooseDocs: 'Choose Supporting Documents',
    chooseDocsOpt: 'Choose Supporting Documents (Optional)',
    supportingDocs: 'Supporting Documentation',
    fileUpload: 'File Upload'
  },
  link: {
    strataHotelInfoPage: 'strata hotel information page',
    learnMore: 'Learn More',
    doesPrApply: 'Does the principal residence requirement apply?',
    reqDocs: 'required documentation'
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
    info: {
      collectionNotice: {
        triggerBtn: 'Information collection notice',
        title: 'Information Collection Notice',
        content: {
          p1: 'This personal information is being collected by the Ministry of Housing and Municipal Affairs under s. 33(1) of the {straAct} and s. 33(2)(e) of the {fippaAct} for the purpose of registering a platform service provider of a strata-titled hotel or motel platform.',
          p2: 'The Ministry may share the information with the local government of the area in which the strata-titled hotel or motel is located. If you have any questions about the collection of this personal information, please contact the Executive Director of the Short-Term Rental Branch, at {email}'
        }
      }
    }
  },
  table: {
    strataHotelList: {
      title: '{boldStart}My Strata-titled Hotel and Motel List{boldEnd} ({count})',
      emptyText: 'You don’t have any strata-titled hotels or motels yet. Add a strata-titled hotel or motel above.'
    }
  },
  page: {
    dashboardList: {
      title: 'Dashboard - My Short-Term Rental Registry',
      h1: 'My Short-Term Rental Registry',
      subtitle: 'Register and keep your information up to date.'
    }
  },
  text: {
    streetHint: 'Street address, rural route, or general delivery address',
    selectAccount: {
      generic: 'Select the account you wish to use to register and manage your short-term rentals, or create a new account.'
    },
    addAllReqDocs: 'If the strata hotel is located in an area with the principal residence requirement, add all {reqDocsLink} that supports your short-term rental registration. {prReqLink}',
    noDocsUploaded: 'No supporting documentation uploaded.',
    uploadReqDocs: 'Upload all required documentation to support your registration.',
    missingDocuments: 'Missing required documents.'
  },
  todos: {
    renewal: {
      expiresSoon: 'Your short-term rental registration will expire soon. Please submit a renewal application to keep your registration active.{newLine}{newLine}{boldStart}Note:{boldEnd} If you wish to change any of the following information, you must submit a new short-term rental application instead of a renewal application.{newLine}{newLine}\u2022 Address of the primary strata-titled hotel or motel building{newLine}\u2022 Address of a secondary strata-titled hotel or motel building',
      expired: 'Your short-term rental registration has expired. Please submit a renewal application to reactivate you registration.{newLine}{newLine}{boldStart}Note:{boldEnd} If you wish to change any of the following information, you must submit a new short-term rental application instead of a renewal application.{newLine}{newLine}\u2022 Address of the primary strata-titled hotel or motel building{newLine}\u2022 Address of a secondary strata-titled hotel or motel building'
    }
  },
  validation: {
    brand: {
      name: 'Please enter a name',
      site: 'Please enter a valid full url for this brand (i.e. https://www.bcregistry.gov.bc.ca)'
    },
    wholeNumber: 'Please enter a whole number (no decimals)',
    min1Unit: 'The number of rental units must be greater than 0',
    max5000Units: 'The number of rental units must not exceed 5000',
    min1Document: 'Must have at least one document',
    category: 'Please select a category',
    unitListRequired: 'Enter list of units offered as Short-Term rentals within this building'
  },
  certify: {
    1: '{terms} I confirm that I am duly authorized to register this Strata-Titled Hotel or Motel and to agree to the {link1} of registration on behalf of the Strata-Titled Hotel or Motel. I agree to comply, and the Strata-Titled Hotel or Motel agrees to comply, with the {link2} of registration.',
    2: '{boldStart}Accuracy of Information.{boldEnd} I confirm that the information contained in the application for registration is accurate and true. I understand that if I have knowingly provided inaccurate or false information, I may be subject to enforcement action under Part 4 of the {italicStart}Short-term Rental Accommodations Act{italicEnd}.',
    checkbox: 'I confirm that I understand and agree to the above.'
  },
  docType: {
    STRATA_HOTEL_DOCUMENTATION: 'Supporting strata-titled hotel or motel documentation'
  },
  hint: {
    docUpload: 'File must be a PDF, jpeg, or jpg. Maximum 10 MB.'
  },
  ConnectFeeWidget: {
    feeSummary: {
      itemLabels: {
        STRATAREG: 'Strata Hotel Application Fee'
      }
    }
  }
}
