import type { ButtonColor } from '#ui/types'

export interface ConnectBtnControlItem {
  action: () => any
  label: string
  class?: string
  color?: ButtonColor
  icon?: string
  loading?: boolean
  variant?: string
  trailing?: boolean
  disabled?: boolean
}

export interface ConnectBtnControl {
  leftButtons: ConnectBtnControlItem[],
  rightButtons: ConnectBtnControlItem[]
}
