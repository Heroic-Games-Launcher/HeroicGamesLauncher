import { WineVersionInfo } from 'common/types'
import {
  CircleStop,
  Download,
  FolderOpen,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { Button, Icon, Tooltip } from 'frontend/components/UI'
import useWineManagerState from '../../state'
import './index.css'

interface Props {
  wineVersion: WineVersionInfo
}

export default function WineVersionActions({ wineVersion }: Props) {
  const { t } = useTranslation()
  const { version, isInstalled, hasUpdate, installDir } = wineVersion
  const state = useWineManagerState(
    useShallow((state) => state[wineVersion.version])
  )

  const isBusy =
    state?.status === 'downloading' || state?.status === 'unzipping'

  const install = async () => window.api.installWineVersion(wineVersion)
  const remove = () => window.api.removeWineVersion(wineVersion)
  const openInstallDir = () => {
    if (installDir) window.api.showItemInFolder(installDir)
  }

  if (isBusy) {
    return (
      <div className="WineVersionActions">
        <Tooltip content={t('generic.abort', 'Abort')}>
          <Button
            variant="dangerSubtle"
            size="sm"
            aria-label={t('generic.abort', 'Abort')}
            onClick={() => window.api.abort(version)}
            icon={<Icon glyph={CircleStop} size="md" />}
          />
        </Tooltip>
      </div>
    )
  }

  if (!isInstalled) {
    return (
      <div className="WineVersionActions">
        <Tooltip content={t('generic.install', 'Install')}>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t('generic.install', 'Install')}
            onClick={install}
            icon={<Icon glyph={Download} size="md" className="downIcon" />}
          />
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="WineVersionActions">
      <Tooltip content={t('wine.manager.open_folder', 'Open Folder')}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('wine.manager.open_folder', 'Open Folder')}
          onClick={openInstallDir}
          icon={<Icon glyph={FolderOpen} size="md" />}
        />
      </Tooltip>
      {hasUpdate && (
        <Tooltip content={t('wine.manager.update', 'Update')}>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t('wine.manager.update', 'Update')}
            onClick={install}
            icon={<Icon glyph={RefreshCw} size="md" />}
          />
        </Tooltip>
      )}
      <Tooltip content={t('generic.uninstall', 'Uninstall')}>
        <Button
          variant="dangerSubtle"
          size="sm"
          aria-label={t('generic.uninstall', 'Uninstall')}
          onClick={remove}
          icon={<Icon glyph={Trash2} size="md" />}
        />
      </Tooltip>
    </div>
  )
}
