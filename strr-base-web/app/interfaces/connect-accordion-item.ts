import type { AccordionItem } from '#ui/types'

export interface ConnectAccordionItemValue {
  class?: string
  icon?: string
  iconClass?: string
  label?: string
  address?: ConnectAddress
  text?: string
}

export interface ConnectAccordionItem extends AccordionItem {
  class?: string,
  iconAvatar?: string,
  showAvatar: boolean,
  values: ConnectAccordionItemValue[]
}
