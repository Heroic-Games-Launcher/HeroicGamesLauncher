import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { getGameInfo } from 'frontend/helpers'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { useInstallProgress } from 'frontend/state/InstallProgress'
import { DownloadManagerState, Runner } from 'common/types'
import './index.css'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import Badge from '@mui/material/Badge'
import Icon from '../../../Icon'
import ProgressBar from '../../../ProgressBar'

type Props = {
  appName: string
  runner: Runner
  state?: DownloadManagerState
}

export default React.memo(function CurrentDownload({
  appName,
  runner,
  state
}: Props) {
  const [progress] = hasProgress(appName, runner)
  const liveProgress = useInstallProgress((s) => s[`${appName}_${runner}`])
  const isPaused = state ? ['idle', 'paused'].includes(state) : false
  const hasStarted =
    Boolean(liveProgress?.downSpeed) || Boolean(liveProgress?.percent)
  const isPreparing = !isPaused && !hasStarted
  const [gameTitle, setGameTitle] = useState('')
  const { libraryStatus } = useContext(ContextProvider)
  const { t } = useTranslation()

  useEffect(() => {
    const getGameTitle = async () => {
      // Hack for EOS Overlay. Not sure if this can be done better
      let title
      if (
        appName === '98bc04bc842e4906993fd6d6644ffb8d' &&
        runner === 'legendary'
      ) {
        title = 'EOS Overlay'
      } else {
        title = (await getGameInfo(appName, runner))!.title
      }
      setGameTitle(title)
    }
    getGameTitle()
  }, [appName])

  function getStatus() {
    if (isPaused) {
      return t('queue.label.paused', 'Paused')
    }
    if (isPreparing) {
      return t('status.preparing', 'Preparing…')
    }
    return progress.percent && progress.percent > 98
      ? t('status.processing', 'Processing files, please wait')
      : t('status.installing', 'Installing')
  }

  if (!libraryStatus.length) {
    return null
  }

  return (
    <Link to={`/download-manager`} className="currentDownload">
      <span className="statusIcon" title={`${getStatus()} - ${gameTitle}`}>
        <Badge
          badgeContent={`${Math.round(progress.percent ?? 0)}%`}
          color="primary"
        >
          <Icon glyph={Download} size="xl" />
        </Badge>
      </span>

      <div className="full-size">
        <span className="gameTitle">{gameTitle ?? 'GameName'}</span>
        <span className="downloadStatus">{getStatus()}</span>
        <ProgressBar
          tone={isPaused ? 'warning' : 'success'}
          showValue
          value={isPreparing ? undefined : progress.percent}
          label={getStatus()}
        />
      </div>
    </Link>
  )
})
