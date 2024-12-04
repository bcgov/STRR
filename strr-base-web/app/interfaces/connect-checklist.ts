export interface ConnectBasicChecklist {
  title: string
  items: string[]
}

export interface ConnectValidatedChecklistItem {
  label: string
  isValid: boolean
  validIcon?: string
  validIconClass?: string
  invalidIcon?: string
  invalidIconClass?: string
}

export interface ConnectValidatedChecklist {
  title: string
  isComplete: boolean
  items: ConnectValidatedChecklistItem[]
}
