import './index.css'

import React, { useContext } from 'react'

import { GameInfo, InstallParams } from 'common/types'
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
  params: InstallParams
  current: boolean
  finished?: boolean
}

const DownloadManagerItem = ({ params, current, finished = false }: Props) => {
  const { epic, gog } = useContext(ContextProvider)
  const library = [...epic.library, ...gog.library]
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const { appName, runner, path, platformToInstall } = params
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

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    const { runner, appName } = params

    if (finished) {
      return navigate(`/gamepage/${runner}/${appName}`, {
        state: { fromGameCard: true }
      })
    }

    current ? stopInstallation() : window.api.removeFromDMQueue(appName)
  }

  const mainActionIcon = () => {
    if (finished) {
      return (
        <div className="iconsWrapper">
          <OpenInNewIcon titleAccess={t('Open')} />
        </div>
      )
    }

    return current ? (
      <StopIcon />
    ) : (
      <RemoveCircleIcon
        style={{ color: 'var(--background-lighter)' }}
        fontSize="large"
      />
    )
  }

  const mainIconTitle = () => {
    return current ? 'Cancel installation' : 'Remove from download manager'
  }

  return (
    <div className="downloadManagerListItem">
      <span className="downloadManagerTitleList">
        {library.find((val) => val.app_name === appName)?.title}
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
