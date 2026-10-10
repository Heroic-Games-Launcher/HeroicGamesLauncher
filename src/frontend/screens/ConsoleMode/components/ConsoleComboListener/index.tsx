import { useNavigate } from 'react-router-dom'

import { isConsoleEntryDisabled } from 'frontend/helpers/gamepad'
import { useCancelOnHold, useGamepadComboHold } from '../../hooks'
import { BTN_R2, BTN_SELECT } from '../../controller'

// View+R2 hold enters Console Mode
export default function ConsoleComboListener() {
  const navigate = useNavigate()
  const { startHold, stopHold } = useCancelOnHold({
    active: true,
    holdMs: 3000,
    onCancel: () => {
      // Focus only after full hold
      window.api.focusMainWindow()
      navigate('/console')
    }
  })
  // Allowed when console override is on
  useGamepadComboHold(
    [BTN_SELECT, BTN_R2],
    (held) => (held ? startHold() : stopHold()),
    true,
    isConsoleEntryDisabled
  )
  return null
}
