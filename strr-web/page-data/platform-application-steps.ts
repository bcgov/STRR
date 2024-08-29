import { FormPageI } from '~/interfaces/form/form-page-i'

const steps: FormPageI[] = [
  {
    step: {
      label: 'platformApplication.stepper.step1.label',
      inactiveIconPath: '/icons/create-account/add_person.svg',
      activeIconPath: '/icons/create-account/add_person_active.svg',
      complete: false,
      isValid: false,
      alt: 'Add contact information'
    },
    title: 'platformApplication.contact.title',
    subtitle: 'platformApplication.contact.subtitle',
    formTitle: 'platformApplication.contact.primary',
    sections: []
  },
  {
    step: {
      label: 'platformApplication.stepper.step2.label',
      inactiveIconPath: '/icons/domain-add.svg',
      activeIconPath: '/icons/domain-add-active.svg',
      complete: false,
      isValid: false,
      alt: 'Add business details'
    },
    title: 'platformApplication.details.title',
    subtitle: 'platformApplication.details.subtitle',
    formTitle: 'platformApplication.details.primary',
    sections: []
  },
  {
    step: {
      label: 'platformApplication.stepper.step3.label',
      inactiveIconPath: '/icons/aod.svg',
      activeIconPath: '/icons/aod-active.svg',
      complete: false,
      isValid: false,
      alt: 'add platform information'
    },
    title: 'platformApplication.eligibility.title',
    subtitle: '',
    formTitle: 'platformApplication.eligibility.primary',
    sections: []
  },
  {
    step: {
      label: 'platformApplication.stepper.step4.label',
      inactiveIconPath: '/icons/create-account/check.svg',
      activeIconPath: '/icons/create-account/check_active.svg',
      complete: false,
      isValid: false,
      alt: 'review and confirm'
    },
    title: 'platformApplication.confirm.title',
    subtitle: '',
    formTitle: 'platformApplication.confirm.primary',
    sections: []
  }
]

export default steps
