import './index.css'

import React, { useContext } from 'react'

import { GameInfo, InstallParams } from 'common/types'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { SvgButton } from 'frontend/components/UI'
import { handleStopInstallation } from 'frontend/helpers/library'
import { getGameInfo } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'

const DownloadManagerItem = (props: {
  params: InstallParams
  current: boolean
}) => {
  const { epic, gog } = useContext(ContextProvider)
  const library = [...epic.library, ...gog.library]
  const { t } = useTranslation('gamepage')
  const [progress] = hasProgress(props.params.appName)

  const stopInstallation = async () => {
    const { folder_name }: GameInfo = await getGameInfo(
      props.params.appName,
      props.params.runner
    )

    return handleStopInstallation(
      props.params.appName,
      [props.params.path, folder_name],
      t,
      progress,
      props.params.runner
    )
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    props.current
      ? stopInstallation()
      : window.api.removeFromDMQueue(props.params.appName)
  }

  const mainActionIcon = () => {
    return props.current ? (
      <StopIcon />
    ) : (
      <RemoveCircleIcon
        style={{ color: 'var(--background-lighter)' }}
        fontSize="large"
      />
    )
  }

  const mainIconTitle = () => {
    return props.current
      ? 'Cancel installation'
      : 'Remove from download manager'
  }

  return (
    <div className="downloadManagerListItem">
      <span className="downloadManagerTitleList">
        {library.find((val) => val.app_name === props.params.appName)?.title}
      </span>
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
