import './index.css'

import React, { useContext, useEffect } from 'react'

import { DMQueueElement } from 'common/types'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import { handleStopInstallation } from 'frontend/helpers/library'
import { getGameInfo, getInstallInfo, size } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'
import { useNavigate } from 'react-router-dom'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'

type Props = {
  element: DMQueueElement
  current: boolean
}

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric'
}

function convertToTime(time: number) {
  const date = new Date(time)
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

const DownloadManagerItem = ({ element, current }: Props) => {
  const { epic, gog, showDialogModal } = useContext(ContextProvider)
  const library = [...epic.library, ...gog.library]
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()

  const { params, addToQueueTime, endTime, type, startTime } = element
  const { appName, runner, path, platformToInstall, gameInfo } = params
  const { art_cover, art_square } = gameInfo

  const [installInfo, setInstallInfo] = React.useState<
    Partial<LegendaryInstallInfo | GogInstallInfo>
  >({})

  const [progress] = hasProgress(appName)
  const { status } = element
  const finished = status === 'done'
  const canceled = status === 'error' && !current

  useEffect(() => {
    const getInfo = async () => {
      const { platformToInstall } = params
      const info = await getInstallInfo(appName, runner, platformToInstall)
      if (info) {
        setInstallInfo(info)
      }
    }
    getInfo()
  }, [appName])

  const stopInstallation = async () => {
    const gameInfo = await getGameInfo(appName, runner)
    if (!gameInfo) {
      return
    }
    const folder_name = gameInfo.folder_name

    return handleStopInstallation(
      appName,
      [path, folder_name],
      t,
      progress,
      runner,
      showDialogModal
    )
  }

  const goToGamePage = () => {
    return navigate(`/gamepage/${runner}/${appName}`, {
      state: { fromDM: true, gameInfo: gameInfo }
    })
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (finished) {
      return
    }

    current ? stopInstallation() : window.api.removeFromDMQueue(appName)
  }

  const mainActionIcon = () => {
    if (finished) {
      return (
        <SvgButton
          className="playIcon"
          onClick={() => goToGamePage()}
          title={`${t('label.playing.start')} (${title})`}
        >
          <PlayIcon />
        </SvgButton>
      )
    }

    if (canceled) {
      return (
        <SvgButton
          className="downIcon"
          onClick={() => goToGamePage()}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon />
        </SvgButton>
      )
    }

    return current ? (
      <StopIcon />
    ) : (
      <RemoveCircleIcon style={{ color: 'var(--accent)' }} fontSize="large" />
    )
  }

  const getTime = () => {
    if (finished) {
      return convertToTime(endTime)
    }
    if (current) {
      return convertToTime(startTime)
    }
    return convertToTime(addToQueueTime)
  }

  const mainIconTitle = () => {
    const { status } = element
    if (status === 'done' || status === 'error') {
      return t('Open')
    }

    return current
      ? t('button.cancel')
      : t('queue.label.remove', 'Remove from download manager')
  }

  const getStatusColor = () => {
    if (element.status === 'done') {
      return 'var(--success)'
    }

    if (canceled) {
      return 'var(--danger)'
    }

    return current ? 'var(--text-default)' : 'var(--accent)'
  }

  const currentApp = library.find((val) => val.app_name === appName)

  if (!currentApp) {
    return null
  }

  const { title } = currentApp
  const downloadSize =
    installInfo?.manifest?.download_size &&
    size(Number(installInfo?.manifest?.download_size))

  return (
    <div className="downloadManagerListItem">
      <span
        role="button"
        onClick={() => goToGamePage()}
        className="downloadManagerTitleList"
        style={{ color: getStatusColor() }}
      >
        <CachedImage src={art_cover ?? art_square} alt={title} />
        <span className="titleSize">
          {title}
          <span title={path}>
            {downloadSize ?? ''}
            {canceled ? ` (${t('queue.label.canceled', 'Canceled')})` : ''}
          </span>
        </span>
      </span>
      <span>{getTime()}</span>
      <span style={{ textTransform: 'capitalize' }}>{type}</span>
      <span>{platformToInstall}</span>
      <span className="icons">
        {
          <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
            {mainActionIcon()}
          </SvgButton>
        }
      </span>
    </div>
  )
}

export default React.memo(DownloadManagerItem)
