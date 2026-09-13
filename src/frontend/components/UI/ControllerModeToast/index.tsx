import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGamepad, faKeyboard } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'

import './index.scss'

const SHOW_MS = 2500

type ModeDetail = { raw: boolean; manual: boolean }

// Steam-style toast when the Steam Controller switches between gamepad
// mode and keyboard/mouse (lizard) mode, see helpers/steamController.ts
export default function ControllerModeToast() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ModeDetail | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer = 0
    const onMode = (e: Event) => {
      setMode((e as CustomEvent<ModeDetail>).detail)
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), SHOW_MS)
    }
    window.addEventListener('steamcontroller-mode', onMode)
    return () => {
      window.removeEventListener('steamcontroller-mode', onMode)
      window.clearTimeout(timer)
    }
  }, [])

  if (!mode) return null

  return (
    <div
      className={classNames('controllerModeToast', { visible })}
      role="status"
      aria-live="polite"
    >
      <FontAwesomeIcon icon={mode.raw ? faGamepad : faKeyboard} />
      <div className="controllerModeToast__text">
        <span className="controllerModeToast__title">
          {mode.raw
            ? t('controller.mode.gamepad', 'Gamepad mode')
            : t('controller.mode.lizard', 'Keyboard & mouse mode')}
        </span>
        <span className="controllerModeToast__hint">
          {t('controller.mode.hint', 'Hold Start for 1s to switch')}
        </span>
      </div>
    </div>
  )
}
