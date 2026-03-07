import './index.css'

import { WineVersionInfo } from 'common/types'
import DownIcon from 'frontend/assets/down-icon.svg?react'
import StopIcon from 'frontend/assets/stop-icon.svg?react'
import React, { useMemo } from 'react'
import classNames from 'classnames'
import {
  faRepeat,
  faFolderOpen,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
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
  type,
  release_notes_link
}: WineVersionInfo) => {
  const { t } = useTranslation()
  const state = useWineManagerState(useShallow((state) => state[version]))

  const isDownloading = state?.status === 'downloading'
  const unZipping = state?.status === 'unzipping'
  const percentage = state && 'percentage' in state ? state.percentage : 0

  const progressStyle = useMemo(() => {
    if ((isDownloading || unZipping) && percentage !== undefined) {
      return { '--progress': `${percentage}%` } as React.CSSProperties
    }
    return {}
  }, [isDownloading, unZipping, percentage])

  if (!version || !downsize) {
    return null
  }

  async function openInstallDir() {
    if (installDir) window.api.showItemInFolder(installDir)
  }

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

  const renderStatus = () => {
    if (unZipping) {
      return t('wine.manager.unzipping', 'Unzipping')
    }
    if (isInstalled) {
      return size(disksize)
    }
    return size(downsize)
  }

  const openReleaseNotes = () => {
    window.api.openWebviewPage(release_notes_link)
  }

  return (
    <div
      className={classNames('wineItem', {
        downloading: isDownloading || unZipping
      })}
      style={progressStyle}
    >
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
      <div className="size">
        {renderStatus()}
        {(isDownloading || unZipping) && (
          <span className="percentageText"> {percentage.toFixed(1)}%</span>
        )}
      </div>
      <div className="actions">
        {isDownloading || unZipping ? (
          <SvgButton
            onClick={() => window.api.abort(version)}
            title={t('generic.abort', 'Abort')}
          >
            <StopIcon />
          </SvgButton>
        ) : isInstalled ? (
          <>
            <SvgButton
              title={t('wine.manager.open_folder', 'Open Folder')}
              onClick={openInstallDir}
            >
              <FontAwesomeIcon icon={faFolderOpen} />
            </SvgButton>

            {hasUpdate && (
              <SvgButton
                title={t('wine.manager.update', 'Update')}
                onClick={install}
              >
                <FontAwesomeIcon icon={faRepeat} />
              </SvgButton>
            )}

            <SvgButton
              title={t('generic.uninstall', 'Uninstall')}
              onClick={remove}
              className="uninstall"
            >
              <FontAwesomeIcon icon={faTrash} />
            </SvgButton>
          </>
        ) : (
          <SvgButton onClick={install} title={t('generic.install', 'Install')}>
            <DownIcon className="downIcon" />
          </SvgButton>
        )}
      </div>
    </div>
  )
}

export default WineItem
