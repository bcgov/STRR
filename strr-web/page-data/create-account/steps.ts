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

const createStepParams = (
  label: string,
  icon: string,
  alt: string,
  title: string,
  subtitle: string,
  formTitle: string,
  complete: boolean = false,
  isValid: boolean = false,
  sections: any[] = []
): CreateStepParamsI => ({
  label,
  icon,
  alt,
  title,
  subtitle,
  formTitle,
  complete,
  isValid,
  sections
})

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
  createStep(createStepParams(
    'propertyManager',
    'add_property_manager',
    'Add property managers',
    'propertyManager',
    'propertyManager',
    'propertyManager',
    true,
    true
  )),
  createStep(createStepParams('contact', 'add_person', 'Add contacts', 'contact', 'contact', 'contact')),
  createStep(createStepParams('property', 'add_location', 'Add properties', 'details', 'details', 'details')),
  createStep(createStepParams('eligibility', 'upload_file', 'Upload documents', 'eligibility', '', 'eligibility')),
  createStep(createStepParams('review', 'check', 'Check and verify', 'confirm', '', 'confirm'))
]

export default steps
