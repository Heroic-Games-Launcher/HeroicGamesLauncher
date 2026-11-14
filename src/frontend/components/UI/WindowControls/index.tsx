import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SvgButton from '../SvgButton'
import Icon from '../Icon'
import { Minus, Square, X } from 'lucide-react'
import RestoreIcon from './RestoreWindow'
import './index.scss'

export default function WindowControls() {
  const [maximized, setMaximized] = useState<boolean>()
  const { t } = useTranslation()

  useEffect(() => {
    // get initial window state since app might start maximized
    window.api.isMaximized().then((val) => setMaximized(val))
  }, [])
  // need to subscribe to maximized/unmaximized events to update our state
  // since double clicking on draggable areas will also maximize/unmaximize the window
  useEffect(() => window.api.handleMaximized(() => setMaximized(true)), [])
  useEffect(() => window.api.handleUnmaximized(() => setMaximized(false)), [])

  const handleMinimize = () => window.api.minimizeWindow()

  const handleMaximize = () =>
    maximized ? window.api.unmaximizeWindow() : window.api.maximizeWindow()

  const handleClose = () => window.api.closeWindow()

  return (
    <div className="windowControls">
      <SvgButton
        className="minimize"
        title={t('window.minimize', 'Minimize window')}
        onClick={handleMinimize}
      >
        <Icon glyph={Minus} size="lg" />
      </SvgButton>
      <SvgButton
        className="maximize"
        title={
          maximized
            ? t('window.restore', 'Restore window')
            : t('window.maximize', 'Maximize window')
        }
        onClick={handleMaximize}
      >
        {maximized ? <RestoreIcon /> : <Icon glyph={Square} size="md" />}
      </SvgButton>
      <SvgButton
        className="close"
        title={t('window.close', 'Close')}
        onClick={handleClose}
      >
        <Icon glyph={X} size="lg" />
      </SvgButton>
    </div>
  )
}
