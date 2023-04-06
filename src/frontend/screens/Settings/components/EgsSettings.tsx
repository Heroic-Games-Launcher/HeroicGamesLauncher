import React, { ChangeEvent, useContext, useState } from 'react'

import { useTranslation } from 'react-i18next'

import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { InfoBox, ToggleSwitch, PathSelectionBox } from 'frontend/components/UI'

const EgsSettings = () => {
  const { t } = useTranslation()
  const [isSyncing, setIsSyncing] = useState(false)
  const { platform, refreshLibrary, showDialogModal } =
    useContext(ContextProvider)
  const [egsPath, setEgsPath] = useSetting('egsLinkedPath', '')

  function handleSync(
    path_or_change_event: string | ChangeEvent<HTMLInputElement>
  ) {
    setIsSyncing(true)
    let newPath: string
    if (typeof path_or_change_event === 'string') {
      // -> We're on macOS/Linux. "unlink" denotes that EGL sync should be
      //    turned off, any other value is treated as a path to the Wine prefix
      newPath = path_or_change_event || 'unlink'
    } else {
      // -> We're on Windows. "unlink" still means "turn EGL sync off",
      //    "windows" now means "turn EGL sync on"
      newPath = path_or_change_event.target.checked ? 'windows' : 'unlink'
    }
    window.api.egsSync(newPath).then((res) => {
      if (res === 'Error') {
        showDialogModal({
          showDialog: true,
          type: 'ERROR',
          message: t('box.sync.error'),
          title: t('box.error.title', 'Error')
        })
        setEgsPath('')
      } else {
        showDialogModal({
          showDialog: true,
          message:
            newPath === 'unlink' ? t('message.unsync') : t('message.sync'),
          title: 'EGS Sync'
        })
        setEgsPath(newPath === 'unlink' ? '' : newPath)
        refreshLibrary({ fullRefresh: true, runInBackground: false })
      }
      setIsSyncing(false)
    })
  }

  // On Windows, Legendary only needs to be told to enable EGL sync
  if (platform === 'win32') {
    return (
      <ToggleSwitch
        htmlId="syncToggle"
        value={egsPath}
        handleChange={handleSync}
        title={t('setting.egs-sync')}
        disabled={isSyncing}
      />
    )
  }

  // On macOS/Linux, we have to give Legendary the path to the Wineprefix
  // the EGL is installed in
  return (
    <>
      <PathSelectionBox
        type={'directory'}
        onPathChange={handleSync}
        path={egsPath}
        placeholder={t('placeholder.egs-prefix')}
        pathDialogTitle={t('box.choose-egs-prefix')}
        canEditPath={isSyncing}
        label={t('setting.egs-sync')}
        htmlId="set_epic_sync_path"
      />
      <InfoBox text="infobox.help">{t('help.general')}</InfoBox>
    </>
  )
}

export default EgsSettings
