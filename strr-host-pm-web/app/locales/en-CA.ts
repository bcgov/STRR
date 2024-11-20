/* eslint-disable max-len */
export default {
  feeSummary: {
    itemLabels: {
      STRATAREG: 'Strata Hotel Application Fee'
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
        2: 'Step 3 - Platform Information',
        3: 'Step 4 - Review and Confirm'
      },
      info: {
        0: 'Short-term rental strata hotels must identify a strata hotel representative to communicate with the Province. This person will be responsible for representing the strata hotel regarding regulatory requirements for strata hotels.',
        1: 'Information about the business operating the strata hotel.',
        2: 'Provide information about each strata hotel operated by your company.',
        3: 'Review and confirm all of the information you provided as shown below.'
      }
    },
    section: {
      title: {
        buildings: 'Strata Hotel Buildings',
        completingParty: 'Person Completing Strata Hotel Application',
        details: 'Strata Hotel Details',
        primaryRep: 'Strata Hotel Representative',
        secondaryRep: 'Secondary Strata Hotel Representative'
      },
      subTitle: {
        brand: 'Strata Hotel Brand',
        numberOfUnits: 'Number of Rental Units',
        primaryStrataBuilding: 'Primary Strata Hotel Building',
        strataBuilding: 'Strata Hotel Building'
      }
    },
    title: {
      application: 'Short-Term Rental Strata Hotel Application',
      comingSoon: 'Short-Term Rental Strata Hotel Registry Coming Soon',
      dashboard: 'My Short-Term Rental Strata Hotel Registry',
      default: 'TBD'
    },
    label: {
      addBuilding: 'Add a Building',
      building: 'Building | Buildings | Primary Building',
      brandName: 'Strata Hotel Brand Name',
      brandSite: 'Strata Hotel Brand Website',
      numberOfUnits: 'Number of Rental Units',
      registeringBusiness: 'Registering Business',
      regOfficeAttSvc: 'Registered Office or Attorney for Service'
    },
    text: {
      comingSoon: 'Short-Term Rental Strata Hotel Registry will be available on December 15, 2024',
      isUserRep: 'Are you the strata hotel representative?',
      primaryContact: 'This is the primary contact person for the strata hotel.'
    },
    word: {
      unit: 'unit | units'
    },
    hint: {
      brandName: 'The brand name for the strata hotel',
      brandSite: 'e.g., https://www.your-strata-hotel.ca/',
      numberOfUnits: 'The total number of units within the strata hotel that are offered as short-term rentals'
    },
    review: {
      brand: {
        name: 'Strata Hotel Brand Name | Strata Hotel Brand {count} Name',
        site: 'Strata Hotel Brand Website | Strata Hotel Brand {count} Website'
      }
    }
  },
  btn: {
    addStrataHotel: 'Add a Strata Hotel',
    view: 'View',
    saveStartApplication: 'Save & Start Application',
    createNewReg: 'Create New Registration'
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
    daysToExpiry: 'Days to Expiry (Pacific Time)'
  },
  link: {
    strataHotelInfoPage: 'strata hotel information page'
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
    }
  },
  table: {
    hostPmList: {
      title: '{boldStart}My Registration Applications{boldEnd} ({count})',
      emptyText: "You don't have any properties yet. Add a property above."
    }
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
    }
  }
}
