import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { handleQuit } from 'frontend/helpers'
import SvgButton from '../SvgButton'
import {
  Minimize as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Close as CloseIcon
} from '@mui/icons-material'
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

  return (
    <div className="windowControls">
      <SvgButton
        className="minimize"
        title={t('window.minimize', 'Minimize window')}
        onClick={handleMinimize}
      >
        <MinimizeIcon />
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
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </SvgButton>
      <SvgButton
        className="close"
        title={t('window.close', 'Close')}
        onClick={handleQuit}
      >
        <CloseIcon />
      </SvgButton>
    </div>
  )
}
