/* eslint-disable max-len */
export default {
  act: {
    foippa: 'Freedom of Information and Protection of Privacy Act'
  },
  feeSummary: {
    itemLabels: {
      PLATREG_SM: 'Platform Application Fee',
      PLATREG_LG: 'Platform Application Fee',
      PLATREG_WV: 'Platform Application Fee'
    }
  },
  modal: {
    info: {
      collectionNotice: {
        triggerBtn: 'Information collection notice',
        title: 'Information Collection Notice',
        content: 'This personal information is being collected by the Ministry of Housing and Municipal Affairs under s. 33(1) of the {straAct} and s. 33(2)(e) of the {foippaAct} for the purpose of registering a platform service provider. If you have any questions about the collection of this personal information, please contact the Executive Director of the Short-Term Rental Branch, at {email}'
      }
    }
  },
  strr: {
    title: {
      application: 'Short-Term Rental Platform Service Provider Application'
    },
    step: {
      description: {
        0: 'Add Contact Information',
        1: 'Add Business Details',
        2: 'Add Provider Information',
        3: 'Review and Confirm'
      },
      title: {
        0: 'Step 1 - Contact Information',
        1: 'Step 2 - Business Details',
        2: 'Step 3 - Provider Information',
        3: 'Step 4 - Review and Confirm'
      },
      info: {
        0: 'Short-term rental platform service providers must identify a representative to communicate with the Province. This person will be responsible for representing the platform service provider regarding regulatory requirements for platform service providers.',
        1: 'Provide business details of the platform service provider.',
        2: 'Please enter some additional information about the short-term rental platform service provider being registered.',
        3: 'Review and confirm all of the information you provided as shown below.'
      }
    },
    section: {
      title: {
        completingParty: 'Person Completing Platform Service Provider Application',
        details: 'Platform Details',
        primaryRep: 'Platform Service Provider Representative',
        secondaryRep: 'Secondary Platform Service Provider Representative'
      },
      subTitle: {
        platform: 'Platform',
        brand: 'Platform Brand',
        noticeNonCompliance: 'Notice of Non-Compliance',
        size: 'Platform Service Provider Size',
        takedownRequest: 'Takedown Request'
      }
    },
    label: {
      platformName: 'Platform Name',
      platformNames: 'Platform Name | Platform Names',
      platformSite: 'Platform Website',
      addBrand: 'Add a Platform Brand',
      addPlatform: 'Add a Platform',
      brandName: 'Platform Brand Name',
      brandNameOpt: 'Platform Brand Name (Optional)',
      brandSite: 'Platform Brand Website',
      brandSiteOpt: 'Platform Brand Website (Optional)',
      cpbcNum: 'Consumer Protection BC Number',
      emailAddresses: 'Email Addresses',
      listingSize: {
        THOUSAND_AND_ABOVE: 'Major (1000+ listings)',
        BETWEEN_250_AND_999: 'Medium (250-999 listings)',
        LESS_THAN_250: 'Minor (under 250 listings)',
        null: 'No Listings'
      },
      noncomplianceEmail: 'Non-compliance Email',
      registeredOfficeAttorney: 'Registered Office / Attorney',
      takedownEmail: 'Takedown Email',
      termsAndCond: 'Terms and Conditions',
      confirmation: 'Confirmation'
    },
    hint: {
      platformName: 'The name of the platform',
      platformSite: 'The full URL for the platform (i.e. https://www.bcregistry.gov.bc.ca)',
      brandName: 'The brand name for the platform',
      brandSite: 'The full URL for this brand (i.e. https://www.bcregistry.gov.bc.ca)'
    },
    text: {
      brandNames: 'If your platform operates under distinct brand names, please enter each of them here.',
      brandNames2: 'If the business provides the same listings on multiple websites with different brand names, provide those as well. ',
      brandNamesNote: 'NOTE: if the listings are different, each brand should be a separate registration',
      hasCpbc: 'Does the business have an active number with Consumer Protection BC (CPBC)?',
      isUserRep: 'Are you the platform service provider representative? ',
      listingSize: 'What is the total number of listings offered by the Platform Service Provider across all platforms on June 1, {year}?',
      nonComplianceEmail: 'Provide an email address to receive Notices of Non-Compliance.',
      nonComplianceEmailLong: 'This message will be sent to the supplier host and platform service provider by a local government to inform both parties that a listing is not compliant with a local government business licence requirement. No action is required from the platform service provider.',
      primaryContact: 'This is the primary contact person for the platform service provider.',
      takedownEmail: 'Provide an email address to receive Takedown Requests.',
      takedownEmailLong: 'This message will be sent to the platform service provider by a local government to request the platform service provider cease providing platform services for a listing that is not compliant with a local government business licence requirement. The request may be sent within a period of 5-90 days after a Notice of Non-compliance was delivered. As per s.18 (3)(b) of the Short-term Rental Accommodations Act, platform service providers must comply with the request of the local government.',
      thousandOrMore: '1000 or more',
      '250-999': '250-999',
      '249orLess': '249 or less',
      selectAccountForStrr: 'Select the account you wish to use to register your Short-term rental platform.',
      onlyPremiumAccountWarning: '{boldStart}Note:{boldEnd} Only Premium accounts using Pre-authorized Debit (PAD) can be used to register Short-term Rental Registry Platforms.',
      onlyPremiumAccountModalContent: 'You must create a BC Registries Premium Account that uses a Pre-authorized Debit (PAD) payment method.',
      listEachPlatform: 'Please list each platform operated by the platform service provider.'
    },
    review: {
      platInfo: {
        platformName: 'Platform Name | Platform {count} Name',
        platformSite: 'Platform Website | Platform {count} Website',
        size: 'Platform Size',
        sizeDesc: {
          GREATER_THAN_THOUSAND: 'Greater than 1,000 listings',
          LESS_THAN_THOUSAND: 'Less than 1,000 listings'
        }
      }
    }
  },
  validation: {
    brand: {
      name: 'Please enter a platform name',
      site: 'Please enter a valid full URL for this platform (i.e. https://www.bcregistry.gov.bc.ca)'
    }
  },
  certify: {
    1: '{terms} I agree to comply with the {link} of registration.',
    2: '{boldStart}Accuracy of Information.{boldEnd} I confirm that the information contained in the application for registration is accurate and true. I understand that if I have knowingly provided inaccurate or false information, I may be subject to enforcement action under Part 4 of the {italicStart}Short-term Rental Accommodations Act{italicEnd}.',
    3: '{boldStart}Validating Registration.{boldEnd} I understand that under section 13(1) of the {italicStart}Short-term Rental Accommodations Act{italicEnd}, the platform service provider must validate that all platform offers have a valid registration number; and that under section 17(2)(a) of the Act, platform service providers must cease providing platform services with respect to a platform offer that does not have a valid registration number. ',
    checkbox: 'I confirm that I understand and agree to the above.'
  }
}
