export interface ConnectBtnControlItem {
  action: () => any
  label: string
  class?: string
  color?: string
  icon?: string
  loading?: boolean
  variant?: string
  trailing?: boolean
  disabled?: boolean
  locked?: boolean // stays disabled when the loading state is reset
}

export interface ConnectBtnControl {
  leftButtons: ConnectBtnControlItem[],
  rightButtons: ConnectBtnControlItem[]
}
