import { useNavigate } from 'react-router-dom'

import {
  useCancelOnHold,
  useComboShortPress,
  useGamepadComboHold
} from '../../hooks'
import { BTN_R2, BTN_SELECT } from '../../controller'

// View+R2: short press switches between Heroic and the game, 3 s hold
// brings Heroic forward and enters Console Mode
export default function ConsoleComboListener() {
  const navigate = useNavigate()
  const { startHold, stopHold } = useCancelOnHold({
    active: true,
    holdMs: 3000,
    onCancel: () => {
      window.api.focusMainWindow()
      navigate('/console')
    }
  })
  const shortPress = useComboShortPress(() =>
    window.api.toggleMainWindowFocus()
  )
  useGamepadComboHold([BTN_SELECT, BTN_R2], (held) => {
    if (held) {
      shortPress.down()
      startHold()
    } else {
      shortPress.up()
      stopHold()
    }
  })
  return null
}
