import type { ButtonVariant } from '#ui/types'

export interface ConnectBtnControlItem {
  action: () => any
  label: string
  class?: string
  color?: string
  icon?: string
  loading?: boolean
  variant?: ButtonVariant
  trailing?: boolean
  disabled?: boolean
}

export interface ConnectBtnControl {
  leftButtons: ConnectBtnControlItem[],
  rightButtons: ConnectBtnControlItem[]
}
