import './index.css'

import React from 'react'

import { WineVersionInfo } from 'common/types'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { faRepeat, faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { SvgButton } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'

import { size } from 'frontend/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import useWineManagerState from '../../state'
import { useShallow } from 'zustand/react/shallow'

const WineItem = ({
  version,
  date,
  downsize,
  disksize,
  download,
  checksum,
  isInstalled,
  hasUpdate,
  installDir,
  type
}: WineVersionInfo) => {
  const { t } = useTranslation()
  const state = useWineManagerState(useShallow((state) => state[version]))

  if (!version || !downsize) {
    return null
  }

  const isDownloading = state?.status === 'downloading'
  const unZipping = state?.status === 'unzipping'

  async function install() {
    return window.api.installWineVersion({
      version,
      date,
      downsize,
      disksize,
      download,
      checksum,
      isInstalled,
      hasUpdate,
      type,
      installDir
    })
  }

  async function remove() {
    window.api.removeWineVersion({
      version,
      date,
      downsize,
      disksize,
      download,
      checksum,
      isInstalled,
      hasUpdate,
      installDir,
      type
    })
  }

  function openInstallDir() {
    installDir !== undefined ? window.api.showItemInFolder(installDir) : {}
  }

  const renderStatus = () => {
    let status
    if (isDownloading) {
      const percentStringified = `${state.percentage.toFixed(2)}%`

      status = (
        <p className="progress">
          {percentStringified}
          <br />({state.eta})
        </p>
      )
    } else if (unZipping) {
      status = t('wine.manager.unzipping', 'Unzipping')
    } else if (isInstalled) {
      status = size(disksize)
    } else {
      status = size(downsize)
    }
    return status
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (isDownloading || unZipping) {
      window.api.abort(version)
    } else if (isInstalled) {
      remove()
    } else {
      install()
    }
  }

  const mainActionIcon = () => {
    if (isInstalled || isDownloading || unZipping) {
      return <StopIcon />
    } else {
      return <DownIcon className="downIcon" />
    }
  }

  const mainIconTitle = () => {
    if (isDownloading || unZipping) {
      return `Cancel ${version} ${hasUpdate ? 'update' : 'installation'}`
    } else if (isInstalled) {
      return `Uninstall ${version}`
    } else {
      return `Install ${version}`
    }
  }

  return (
    <div className="wineManagerListItem">
      <span className="wineManagerTitleList">{version}</span>
      <div className="wineManagerListDate">{date}</div>
      <div className="wineManagerListSize">{renderStatus()}</div>
      <span className="icons">
        {isInstalled && (
          <SvgButton
            className="material-icons settings folder"
            onClick={openInstallDir}
            title={`Open containing folder for ${version}`}
          >
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setinstallpathbutton"
            />
          </SvgButton>
        )}

        {hasUpdate && (
          <SvgButton
            className="material-icons settings folder"
            onClick={install}
            title={`Update ${version}`}
          >
            <FontAwesomeIcon
              icon={faRepeat}
              data-testid="setinstallpathbutton"
            />
          </SvgButton>
        )}

        <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
          {mainActionIcon()}
        </SvgButton>
      </span>
    </div>
  )
}

export default WineItem
