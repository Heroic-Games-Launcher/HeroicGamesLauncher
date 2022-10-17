import './index.css'

import React, { useContext } from 'react'

import { DMQueueElement, GameInfo } from 'common/types'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { SvgButton } from 'frontend/components/UI'
import { handleStopInstallation } from 'frontend/helpers/library'
import { getGameInfo, getStoreName } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useNavigate } from 'react-router-dom'

type Props = {
  element: DMQueueElement
  current: boolean
}

const DownloadManagerItem = ({ element, current }: Props) => {
  const { epic, gog } = useContext(ContextProvider)
  const library = [...epic.library, ...gog.library]
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const { appName, runner, path, platformToInstall } = element.params
  const [progress] = hasProgress(appName)

  const stopInstallation = async () => {
    const { folder_name }: GameInfo = await getGameInfo(appName, runner)

    return handleStopInstallation(
      appName,
      [path, folder_name],
      t,
      progress,
      runner
    )
  }

  const goToGamePage = () => {
    return navigate(`/gamepage/${runner}/${appName}`, {
      state: { fromDM: true }
    })
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (element.status === 'done') {
      return goToGamePage()
    }

    current ? stopInstallation() : window.api.removeFromDMQueue(appName)
  }

  const mainActionIcon = () => {
    const { status } = element
    if (status === 'done' || status === 'error') {
      return (
        <div className="iconsWrapper">
          <OpenInNewIcon titleAccess={t('Open')} />
        </div>
      )
    }

    return current ? (
      <StopIcon />
    ) : (
      <RemoveCircleIcon style={{ color: 'var(--accent)' }} fontSize="large" />
    )
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

    if (element.status === 'error') {
      return 'var(--danger)'
    }

    return current ? 'var(--text-default)' : 'var(--accent)'
  }

  const currentApp = library.find((val) => val.app_name === appName)

  if (!currentApp) {
    return null
  }

  const { title } = currentApp

  return (
    <div className="downloadManagerListItem">
      <span
        role="button"
        onClick={() => goToGamePage()}
        className="downloadManagerTitleList"
        style={{ color: getStatusColor() }}
      >
        {title}
      </span>
      <span>{getStoreName(runner)}</span>
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
export default DownloadManagerItem
