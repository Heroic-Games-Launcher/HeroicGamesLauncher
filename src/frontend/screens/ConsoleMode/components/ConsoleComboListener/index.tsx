import { useNavigate } from 'react-router-dom'

import { useCancelOnHold, useGamepadComboHold } from '../../hooks'
import { BTN_R2, BTN_SELECT } from '../../controller'

// View+R2 hold enters Console Mode
export default function ConsoleComboListener() {
  const navigate = useNavigate()
  const { startHold, stopHold } = useCancelOnHold({
    active: true,
    holdMs: 3000,
    onCancel: () => navigate('/console')
  })
  useGamepadComboHold([BTN_SELECT, BTN_R2], (held) =>
    held ? startHold() : stopHold()
  )
  return null
}
