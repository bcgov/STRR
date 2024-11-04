import type { ConnectBtnControl } from '#imports'

export function setButtonControl (buttonControl: ConnectBtnControl) {
  const route = useRoute()
  route.meta.buttonControl = buttonControl
}
