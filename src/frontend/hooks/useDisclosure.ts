import { useLocalObservable } from 'mobx-react'

export default function useDisclosure(defaultValue = false) {
  const popup = useLocalObservable(() => ({
    opened: defaultValue,
    props: {},
    open(props = {}) {
      popup.props = props
      popup.opened = true
    },
    close() {
      if (!popup.opened) return

      popup.opened = false
    },
    toggle() {
      popup.opened = !popup.opened
    },
    setValue(value: boolean) {
      if (value === popup.opened) return
      popup.opened = value
    }
  }))

  return popup
}
