import type { BadgeColor, ButtonColor } from '#ui/types'

export interface TodoButton {
  label: string
  action: Function
  colour?: ButtonColor
  icon?: string
}

export interface Todo {
  id: string
  title: string
  buttons?: TodoButton[]
  subtitle?: string
  icon?: string
  iconClass?: string
  detail?: string
  badge?: string
  badgeColor?: BadgeColor
}
