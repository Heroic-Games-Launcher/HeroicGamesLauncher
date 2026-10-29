import './index.css'

import { useContext, useEffect, useState } from 'react'

import { DMQueueElement, DownloadManagerState } from 'common/types'
import {
  CircleCheck,
  CircleX,
  Clock,
  Download,
  Gamepad2,
  Pause,
  Play,
  Trash2,
  X
} from 'lucide-react'
import classNames from 'classnames'
import {
  Badge,
  Button,
  CachedImage,
  Icon,
  ProgressBar,
  StoreBadge,
  Tooltip
} from 'frontend/components/UI'
import { handleStopInstallation } from 'frontend/helpers/library'
import { getGameInfo, getIntlLocale, getStoreName } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'
import { useNavigate } from 'react-router-dom'

type Props = {
  element: DMQueueElement
  current: boolean
  state?: DownloadManagerState
  position?: number
  variant?: 'row' | 'hero'
  handleClearItem?: (appName: string) => void
}

/*
  Keys read from the `translation` namespace through `t2`, listed here so the
  i18n extractor keeps them:
  t('queue.label.downloading', 'Downloading')
  t('queue.label.paused', 'Paused')
  t('queue.label.finished', 'Completed')
  t('download-manager.ETA', 'Estimated time')
  t('download-manager.install-type.install', 'Install')
  t('download-manager.install-type.update', 'Update')
*/

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric'
}

function convertToTime(time: number, language: string) {
  const date = time ? new Date(time) : new Date()
  const locale = getIntlLocale(language)
  const hour = new Intl.DateTimeFormat(locale, options).format(date)
  return {
    hour,
    date: date.toLocaleDateString(locale),
    fullDate: date.toLocaleString(locale)
  }
}

const DownloadManagerItem = ({
  element,
  current,
  state,
  position,
  variant = 'row',
  handleClearItem
}: Props) => {
  const { amazon, epic, gog, showDialogModal } = useContext(ContextProvider)
  const { t, i18n } = useTranslation('gamepage')
  const { t: t2 } = useTranslation('translation')
  const isPaused = state && ['idle', 'paused'].includes(state)
  const isHero = variant === 'hero'

  const navigate = useNavigate()

  const library = [...epic.library, ...gog.library, ...amazon.library]

  const { params, addToQueueTime, endTime, type, startTime } = element
  const {
    appName,
    runner,
    path,
    gameInfo: DmGameInfo,
    size,
    platformToInstall
  } = params

  const [gameInfo, setGameInfo] = useState(DmGameInfo)

  useEffect(() => {
    const getNewInfo = async () => {
      const newInfo = await getGameInfo(appName, runner)
      if (newInfo && newInfo.runner !== 'sideload') {
        setGameInfo(newInfo)
      }
    }
    getNewInfo()
  }, [element])

  const {
    art_cover,
    art_square,
    install: { is_dlc }
  } = gameInfo || {}

  const [progress] = hasProgress(appName, runner)
  const { status } = element
  const finished = status === 'done'
  const canceled = status === 'error' || (status === 'abort' && !current)

  const stopInstallation = async () => {
    if (!gameInfo) {
      return
    }
    const folder_name = gameInfo.folder_name
    if (!folder_name) return

    return handleStopInstallation(
      appName,
      path,
      t,
      progress,
      runner,
      showDialogModal
    )
  }

  const goToGamePage = () => {
    if (is_dlc) {
      return
    }
    return navigate(`/gamepage/${runner}/${appName}`, {
      state: { fromDM: true, gameInfo: gameInfo }
    })
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (finished) {
      return goToGamePage()
    } else if (canceled && handleClearItem) {
      handleClearItem(appName)
    }

    if (current) stopInstallation()
    else window.api.removeFromDMQueue(appName)
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleSecondaryActionClick = () => {
    if (isPaused) {
      window.api.resumeCurrentDownload()
    } else if (state === 'running') {
      window.api.pauseCurrentDownload()
    }
  }

  const mainActionIcon = () => {
    if (finished) {
      return <Icon glyph={Play} size="lg" />
    }

    if (canceled) {
      return <Icon glyph={Trash2} size="lg" />
    }

    return <Icon glyph={X} size="lg" />
  }

  const mainActionVariant = () => {
    if (finished) {
      return 'secondary'
    }

    return current ? 'dangerSubtle' : 'ghost'
  }

  const secondaryActionIcon = () => {
    if (isPaused) {
      return <Icon glyph={Play} size="lg" />
    }

    return <Icon glyph={Pause} size="lg" />
  }

  const getTime = () => {
    if (finished) {
      return convertToTime(endTime, i18n.language)
    }
    if (current) {
      return convertToTime(startTime, i18n.language)
    }
    return convertToTime(addToQueueTime, i18n.language)
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

  const secondaryIconTitle = () => {
    if (isPaused) {
      return t('queue.label.resume', 'Resume download')
    }

    return t('queue.label.pause', 'Pause download')
  }

  const statusBadge = () => {
    if (isHero) {
      return isPaused ? (
        <Badge variant="warning" glyph={Pause}>
          {t2('queue.label.paused', 'Paused')}
        </Badge>
      ) : (
        <Badge variant="accent" glyph={Download}>
          {t2('queue.label.downloading', 'Downloading')}
        </Badge>
      )
    }

    if (finished) {
      return (
        <Badge variant="success" glyph={CircleCheck}>
          {t2('queue.label.finished', 'Completed')}
        </Badge>
      )
    }

    if (canceled) {
      return (
        <Badge variant="error" glyph={CircleX}>
          {t('queue.label.canceled', 'Canceled')}
        </Badge>
      )
    }

    return null
  }

  const currentApp = library.find(
    (val) => val.app_name === appName && val.runner === runner
  )

  // sideloaded games are not part of the store libraries, so fall back to the
  // information the queue element was created with
  const title = currentApp?.title || gameInfo?.title || DmGameInfo?.title

  if (!title) {
    return null
  }

  const cover = art_cover || art_square

  const translatedTypes = {
    install: t2('download-manager.install-type.install', 'Install'),
    update: t2('download-manager.install-type.update', 'Update')
  }

  const { fullDate, hour, date } = getTime()
  const platform = platformToInstall === 'osx' ? 'Mac' : platformToInstall
  const details = [size, platform].filter(Boolean).join(' · ')
  const eta = isPaused ? undefined : progress.eta

  return (
    <div
      className={classNames('DownloadItem', `DownloadItem--${variant}`, {
        'DownloadItem--canceled': canceled
      })}
    >
      <div className="DownloadItem__game">
        {position !== undefined && (
          <span className="DownloadItem__position">{position}</span>
        )}
        <span
          role={is_dlc ? undefined : 'button'}
          tabIndex={is_dlc ? undefined : 0}
          onClick={() => goToGamePage()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              goToGamePage()
            }
          }}
          className={classNames('DownloadItem__cover', {
            'DownloadItem__cover--static': is_dlc
          })}
          title={title}
        >
          {cover ? (
            <CachedImage src={cover} alt={title} />
          ) : (
            <Icon glyph={Gamepad2} size="lg" />
          )}
        </span>
        <div className="DownloadItem__text">
          <div className="DownloadItem__titleRow">
            <span
              role={is_dlc ? undefined : 'button'}
              tabIndex={is_dlc ? undefined : 0}
              onClick={() => goToGamePage()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  goToGamePage()
                }
              }}
              className={classNames('DownloadItem__title', {
                'DownloadItem__title--static': is_dlc
              })}
            >
              {title}
            </span>
            {statusBadge()}
          </div>
          <span className="DownloadItem__details" title={path}>
            {details}
          </span>
          {isHero && (
            <div className="DownloadItem__progress">
              <ProgressBar
                size="md"
                showValue
                tone={isPaused ? 'warning' : 'success'}
                value={progress.percent}
                label={t2('queue.label.downloading', 'Downloading')}
              />
              <span className="DownloadItem__progressMeta">
                {progress.bytes}
                {eta && (
                  <span
                    className="DownloadItem__eta"
                    title={t2('download-manager.ETA', 'Estimated time')}
                  >
                    <Icon glyph={Clock} size="xs" />
                    {eta}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <span className="DownloadItem__type">
        <Badge variant={type === 'update' ? 'info' : 'neutral'}>
          {translatedTypes[type]}
        </Badge>
      </span>

      <span className="DownloadItem__store">
        <StoreBadge runner={runner} title={getStoreName(runner, t2('Other'))} />
      </span>

      <span className="DownloadItem__time" title={fullDate}>
        {isHero && <Icon glyph={Clock} size="sm" />}
        <span className="DownloadItem__date">{date}</span>
        <span className="DownloadItem__hour">{hour}</span>
      </span>

      <span className="DownloadItem__actions">
        {current && (
          <Tooltip content={secondaryIconTitle()}>
            <Button
              variant="ghost"
              size={isHero ? 'md' : 'sm'}
              onClick={handleSecondaryActionClick}
              aria-label={secondaryIconTitle()}
              icon={secondaryActionIcon()}
            />
          </Tooltip>
        )}
        {finished && is_dlc ? (
          <span className="DownloadItem__noAction">—</span>
        ) : (
          <Tooltip content={mainIconTitle()}>
            <Button
              variant={mainActionVariant()}
              size={isHero ? 'md' : 'sm'}
              onClick={handleMainActionClick}
              aria-label={mainIconTitle()}
              icon={mainActionIcon()}
            />
          </Tooltip>
        )}
      </span>
    </div>
  )
}

export default DownloadManagerItem
