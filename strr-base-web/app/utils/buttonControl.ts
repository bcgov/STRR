import type { ConnectBtnControl } from '#imports'

export function setButtonControl (buttonControl: ConnectBtnControl) {
  const route = useRoute()
  route.meta.buttonControl = buttonControl
}

export function getButtonControl (): ConnectBtnControl {
  const route = useRoute()
  return route.meta.buttonControl as ConnectBtnControl
}
