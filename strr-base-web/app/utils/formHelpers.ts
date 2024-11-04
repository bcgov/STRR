import type { Form, FormError } from '#ui/types'
import type { ZodSchema } from 'zod'

export const getOwnershipTypeDisplay = (ownershipType: string | null, t: (key: string) => string) => {
  switch (ownershipType) {
    case 'CO_OWN':
      return t('coOwner')
    case 'OWN':
      return t('owner')
    case 'RENT':
      return t('rent')
    default:
      return ownershipType ?? '-'
  }
}

export const hasFormErrors = (form: Form<any> | undefined, paths: string[]) => {
  for (const path of paths) {
    if (form && form.getErrors(path)?.length) {
      return true
    }
  }
  return false
}

export const validateSchemaAgainstState = (schema: ZodSchema<any>, state: any, formId: string) => {
  const result = schema.safeParse(state)

  if (result.success) {
    return {
      formId,
      success: true,
      errors: []
    }
  } else {
    return {
      formId,
      success: false,
      errors: result.error.issues
    }
  }
}

export const validateForm = async (form: Form<any> | undefined, isComplete: boolean): Promise<
  FormError<string>[] | undefined
> => {
  if (form && isComplete) {
    try {
      await form.validate()
    } catch {
      return toValue(form.errors)
    }
  }
}

export const focusAndScroll = (element: HTMLInputElement) => {
  element.focus()
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export const focusAndScrollToInputByName = (inputName: string) => {
  const el = document.querySelector(`input[name='${inputName}']`) as HTMLInputElement | null
  if (!el) { return }

  if (el.hasAttribute('readonly')) {
    // some elements (eg: UInputMenu) display the form group name on a readonly input
    // get actual input and apply focus
    const visibleInput = el.closest('div')?.querySelector('input:not([readonly])') as HTMLInputElement | null
    if (visibleInput) {
      focusAndScroll(visibleInput)
    }
  } else {
    focusAndScroll(el)
  }
}
