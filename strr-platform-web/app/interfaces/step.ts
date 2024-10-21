export interface Step {
  i18nPrefix?: string // i.e 'xxx.step' (NOTE: this expects specific i18n step structure beyond this path)
  icon?: string
  complete: boolean
  isValid: boolean
  // below can be ommitted if using i18nPrefix + icon
  alt?: string
  activeIconPath?: string
  inactiveIconPath?: string
  label?: string
}
