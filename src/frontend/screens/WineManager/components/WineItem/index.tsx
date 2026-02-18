import './index.css'

import { WineVersionInfo } from 'common/types'
import DownIcon from 'frontend/assets/down-icon.svg?react'
import StopIcon from 'frontend/assets/stop-icon.svg?react'
import {
  faRepeat,
  faFolderOpen,
  faEllipsisVertical,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { SvgButton, Dropdown } from 'frontend/components/UI'
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
  type,
  release_notes_link
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
      installDir,
      release_notes_link
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
      type,
      release_notes_link
    })
  }

  function openInstallDir() {
    if (installDir) window.api.showItemInFolder(installDir)
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

  const openReleaseNotes = () => {
    window.api.openWebviewPage(release_notes_link)
  }

  return (
    <div className="wineItem">
      <button
        className="version"
        title={t('wine.notes', 'Notes')}
        onClick={() => openReleaseNotes()}
      >
        {version}
      </button>
      <div className="release" title={date}>
        {date}
      </div>
      <div className="size">{renderStatus()}</div>
      <div className="actions">
        {isInstalled && !isDownloading && !unZipping ? (
          <Dropdown
            buttonClass="actionsDropdownBtn"
            title={<FontAwesomeIcon icon={faEllipsisVertical} />}
          >
            <button className="dropdownItem" onClick={openInstallDir}>
              <FontAwesomeIcon icon={faFolderOpen} />
              {t('wine.manager.open_folder', 'Open Folder')}
            </button>

            {hasUpdate && (
              <button className="dropdownItem" onClick={install}>
                <FontAwesomeIcon icon={faRepeat} />
                {t('wine.manager.update', 'Update')}
              </button>
            )}

            <button className="dropdownItem" onClick={handleMainActionClick}>
              <FontAwesomeIcon icon={faTrash} />
              {t('generic.uninstall', 'Uninstall')}
            </button>
          </Dropdown>
        ) : (
          <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
            {mainActionIcon()}
          </SvgButton>
        )}
      </div>
    </div>
  )
}

export default WineItem
