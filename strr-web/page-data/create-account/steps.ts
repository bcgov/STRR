import { FormPageI } from '~/interfaces/form/form-page-i'

const steps: FormPageI[] = [
  {
    step: {
      label: 'createAccount.stepTitle.contact',
      inactiveIconPath: '/icons/create-account/add_person.svg',
      activeIconPath: '/icons/create-account/add_person_active.svg',
      complete: false,
      isValid: false,
      alt: 'Add contacts'
    },
    title: 'createAccount.contact.title',
    subtitle: 'createAccount.contact.subtitle',
    formTitle: 'createAccount.contact.primary',
    sections: []
  },
  {
    step: {
      label: 'createAccount.stepTitle.property',
      inactiveIconPath: '/icons/create-account/add_location.svg',
      activeIconPath: '/icons/create-account/add_location_active.svg',
      complete: false,
      isValid: false,
      alt: 'Add properties'
    },
    title: 'createAccount.details.title',
    subtitle: 'createAccount.details.subtitle',
    formTitle: 'createAccount.details.primary',
    sections: []
  },
  {
    step: {
      label: 'createAccount.stepTitle.eligibility',
      inactiveIconPath: '/icons/create-account/upload_file.svg',
      activeIconPath: '/icons/create-account/upload_file_active.svg',
      complete: false,
      isValid: false,
      alt: 'Upload documents'
    },
    title: 'createAccount.eligibility.title',
    subtitle: '',
    formTitle: 'createAccount.eligibility.primary',
    sections: []
  },
  {
    step: {
      label: 'createAccount.stepTitle.review',
      inactiveIconPath: '/icons/create-account/check.svg',
      activeIconPath: '/icons/create-account/check_active.svg',
      complete: false,
      isValid: false,
      alt: 'Check and verify'
    },
    title: 'createAccount.confirm.title',
    subtitle: '',
    formTitle: 'createAccount.confirm.primary',
    sections: []
  }
]

export default steps
