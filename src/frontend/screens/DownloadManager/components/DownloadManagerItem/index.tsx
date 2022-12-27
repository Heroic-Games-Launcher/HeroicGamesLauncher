import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { DMQueueElement } from 'common/types'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import { handleStopInstallation } from 'frontend/helpers/library'
import { getGameInfo, getStoreName } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'
import { useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'

type Props = {
  element?: DMQueueElement
  current: boolean
}

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric'
}

function convertToTime(time: number) {
  const date = time ? new Date(time) : new Date()
  const hour = new Intl.DateTimeFormat(undefined, options).format(date)
  return { hour, fullDate: date.toLocaleString() }
}

const DownloadManagerItem = ({ element, current }: Props) => {
  const { epic, gog, showDialogModal } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation('translation')

  const navigate = useNavigate()

  if (!element) {
    return (
      <h5 style={{ paddingTop: 'var(--space-xs' }}>
        {t2('queue.label.empty', 'Nothing to download')}
      </h5>
    )
  }

  const library = [...epic.library, ...gog.library]

  const { params, addToQueueTime, endTime, type, startTime } = element
  const { appName, runner, path, gameInfo: DmGameInfo, size } = params

  const [gameInfo, setGameInfo] = useState(DmGameInfo)

  useEffect(() => {
    const getNewInfo = async () => {
      const newInfo = await getGameInfo(appName, runner)
      if (newInfo) {
        setGameInfo(newInfo)
      }
    }
    getNewInfo()
  }, [element])

  const { art_cover, art_square } = gameInfo || {}

  const [progress] = hasProgress(appName)
  const { status } = element
  const finished = status === 'done'
  const canceled = status === 'error' || (status === 'abort' && !current)

  const stopInstallation = async () => {
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
    if (finished || canceled) {
      return goToGamePage()
    }

    current ? stopInstallation() : window.api.removeFromDMQueue(appName)
  }

  const mainActionIcon = () => {
    if (finished) {
      return <PlayIcon />
    }

    if (canceled) {
      return <DownIcon />
    }

    return <StopIcon />
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
      ? t('button.cancel', 'Cancel')
      : t('queue.label.remove', 'Remove from Downloads')
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
  const cover = art_cover || art_square

  const translatedTypes = {
    install: t2('download-manager.install-type.install', 'Install'),
    update: t2('download-manager.install-type.update', 'Update')
  }

  const { hour, fullDate } = getTime()

  return (
    <div className="downloadManagerListItem">
      <span
        role="button"
        onClick={() => goToGamePage()}
        className="downloadManagerTitleList"
        style={{ color: getStatusColor() }}
      >
        {cover && <CachedImage src={cover} alt={title} />}
        <span className="titleSize">
          {title}
          <span title={path}>
            {size ?? ''}
            {canceled ? ` (${t('queue.label.canceled', 'Canceled')})` : ''}
          </span>
        </span>
      </span>
      <span title={fullDate}>{hour}</span>
      <span>{translatedTypes[type]}</span>
      <span>{getStoreName(runner, t2('Other'))}</span>
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

export default DownloadManagerItem
