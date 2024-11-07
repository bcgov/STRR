/* eslint-disable max-len */
export default {
  feeSummary: {
    itemLabels: {
      PLATREG_SM: 'Platform Application Fee',
      PLATREG_LG: 'Platform Application Fee',
      PLATREG_WV: 'Platform Application Fee'
    }
  },
  strr: {
    title: {
      application: 'Short-Term Rental Platform Application'
    },
    step: {
      description: {
        0: 'Add Contact Information',
        1: 'Add Business Details',
        2: 'Add Platform Information',
        3: 'Review and Confirm'
      },
      title: {
        0: 'Step 1 - Contact Information',
        1: 'Step 2 - Business Details',
        2: 'Step 3 - Platform Information',
        3: 'Step 4 - Review and Confirm'
      },
      info: {
        0: 'Short-term rental platforms must identify a platform representative to communicate with the Province. This person will be responsible for representing the platform regarding regulatory requirements for platforms.',
        1: 'Information about the business operating the platform being registered.',
        2: 'Please enter some additional information about the short-term rental platform being registered.',
        3: 'Review and confirm all of the information you provided as shown below.'
      }
    },
    section: {
      title: {
        completingParty: 'Person Completing Platform Application',
        details: 'Platform Details',
        primaryRep: 'Platform Representative',
        secondaryRep: 'Secondary Platform Representative'
      },
      subTitle: {
        brand: 'Platform Brand',
        noticeNonCompliance: 'Notice of Non-Compliance',
        size: 'Platform Size',
        takedownRequest: 'Takedown Request'
      }
    },
    label: {
      addBrand: 'Add a Platform Brand',
      brandName: 'Platform Brand Name',
      brandNameOpt: 'Platform Brand Name (Optional)',
      brandSite: 'Platform Brand Website',
      brandSiteOpt: 'Platform Brand Website (Optional)',
      cpbcNum: 'Consumer Protection BC Number',
      listingSize: {
        LESS_THAN_THOUSAND: 'Small Platform',
        GREATER_THAN_THOUSAND: 'Large Platform'
      },
      noncomplianceEmail: 'Non-compliance Email',
      registeredOfficeAttorney: 'Registered Office / Attorney',
      takedownEmail: 'Takedown Email'
    },
    hint: {
      brandName: 'The brand name for the platform',
      brandSite: 'The full URL for this brand (i.e. https://www.bcregistry.gov.bc.ca)'
    },
    text: {
      brandNames: 'If your platform operates under distinct brand names, please enter each of them here.',
      brandNames2: 'If the business provides the same listings on multiple websites with different brand names, provide those as well. ',
      brandNamesNote: 'NOTE: if the listings are different, each brand should be a separate registration',
      hasCpbc: 'Does the business have an active number with Consumer Protection BC (CPBC)?',
      isUserRep: 'Are you the platform representative?',
      lessThanThousand: 'Less than 1000',
      listingSize: 'What is the total number of listings offered by the Platform Provider on June 1, [previous year]?',
      nonComplianceEmail: 'Provide an email address to receive Notices of Non-Compliance.',
      nonComplianceEmailLong: 'This message will be sent to the supplier host and platform service provider by a local government to inform both parties that a listing is not compliant with a local government business licence requirement. No action is required from the platform service provider.',
      primaryContact: 'This is the primary contact person for the platform.',
      takedownEmail: 'Provide an email address to receive Takedown Requests.',
      takedownEmailLong: 'This message will be sent to the platform service provider by a local government to request the platform service provider cease providing platform services for a listing that is not compliant with a local government business licence requirement. The request may be sent within a period of 5-90 days after a Notice of Non-compliance was delivered. As per s.18 (3)(b) of the Short-term Rental Accommodations Act, platform service providers must comply with the request of the local government.',
      thousandOrMore: '1000 or more',
      selectAccountForStrr: 'Select the account you wish to use to register your Short-term rental platform.',
      onlyPremiumAccountWarning: '{boldStart}Note:{boldEnd} Only Premium accounts using Pre-authorized Debit (PAD) can be used to register Short-term Rental Registry Platforms.',
      onlyPremiumAccountModalContent: 'You must create a BC Registries Premium Account that uses a Pre-authorized Debit (PAD) payment method.'
    },
    review: {
      platInfo: {
        brandName: 'Platform Brand Name | Platform Brand {count} Name',
        brandSite: 'Platform Brand Website | Platform Brand {count} Website',
        size: 'Platform Size',
        sizeDesc: {
          GREATER_THAN_THOUSAND: 'Greater than 1,000 listings',
          LESS_THAN_THOUSAND: 'Less than 1,000 listings'
        }
      }
    }
  }
}
