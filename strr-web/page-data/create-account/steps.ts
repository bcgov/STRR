import { FormPageI } from '~/interfaces/form/form-page-i'

interface CreateStepParamsI {
  label: string
  icon: string
  alt: string
  title: string
  subtitle: string
  formTitle: string
  complete: boolean
  isValid: boolean
  sections?: any[]
}

const createStep = ({
  label,
  icon,
  alt,
  title,
  subtitle,
  formTitle,
  complete,
  isValid,
  sections = []
}: CreateStepParamsI): FormPageI => ({
  step: {
    label: `createAccount.stepTitle.${label}`,
    inactiveIconPath: `/icons/create-account/${icon}.svg`,
    activeIconPath: `/icons/create-account/${icon}_active.svg`,
    complete,
    isValid,
    alt
  },
  title: title ? `createAccount.${title}.title` : '',
  subtitle: subtitle ? `createAccount.${subtitle}.subtitle` : '',
  formTitle: formTitle ? `createAccount.${formTitle}.primary` : '',
  sections
})

const steps: FormPageI[] = [
  createStep({
    label: 'propertyManager',
    icon: 'add_property_manager',
    alt: 'Add property managers',
    title: 'propertyManager',
    subtitle: 'propertyManager',
    formTitle: 'propertyManager',
    // TODO: remove
    complete: true,
    isValid: true
  }),
  createStep({
    label: 'contact',
    icon: 'add_person',
    alt: 'Add contacts',
    title: 'contact',
    subtitle: 'contact',
    formTitle: 'contact',
    complete: false,
    isValid: false
  }),
  createStep({
    label: 'property',
    icon: 'add_location',
    alt: 'Add properties',
    title: 'details',
    subtitle: 'details',
    formTitle: 'details',
    complete: false,
    isValid: false
  }),
  createStep({
    label: 'eligibility',
    icon: 'upload_file',
    alt: 'Upload documents',
    title: 'eligibility',
    subtitle: '',
    formTitle: 'eligibility',
    complete: false,
    isValid: false
  }),
  createStep({
    label: 'review',
    icon: 'check',
    alt: 'Check and verify',
    title: 'confirm',
    subtitle: '',
    formTitle: 'confirm',
    complete: false,
    isValid: false
  })
]

export default steps
