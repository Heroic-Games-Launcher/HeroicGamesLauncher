import React, { useContext, useEffect, useState } from 'react'
import './index.scss'
import { ProgressDialog } from '../ProgressDialog'
import WinetricksSearchBar from './WinetricksSearch'
import { useTranslation } from 'react-i18next'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

interface Props {
  onClose: () => void
}

export default function Winetricks({ onClose }: Props) {
  const { appName, runner } = useContext(SettingsContext)
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)

  // keep track of all installed components for a game/app
  const [installed, setInstalled] = useState<string[]>([])
  async function listInstalled() {
    setLoading(true)
    try {
      const components = await window.api.winetricksListInstalled(
        runner!,
        appName
      )
      setInstalled(components)
    } catch {
      setInstalled([])
    }
    setLoading(false)
  }
  useEffect(() => {
    listInstalled()
  }, [])

  const [allComponents, setAllComponents] = useState<string[]>([])
  useEffect(() => {
    async function listComponents() {
      try {
        const components = await window.api.winetricksListAvailable(
          runner!,
          appName
        )
        setAllComponents(components)
      } catch {
        setAllComponents([])
      }
    }
    listComponents()
  }, [])

  // handles the installation of components
  const [installing, setInstalling] = useState(false)
  const [installingComponent, setInstallingComponent] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  function install(component: string) {
    window.api.winetricksInstall(runner!, appName, component)
  }

  useEffect(() => {
    async function onInstallingChange(
      e: Electron.IpcRendererEvent,
      component: string
    ) {
      if (component === '') {
        listInstalled()
      }
      setInstalling(false)
    }

    async function onWinetricksProgress(
      e: Electron.IpcRendererEvent,
      payload: { messages: string[]; installingComponent: string }
    ) {
      // this conditionals help to show the correct state if the dialog
      // is closed during an installation and then re-opened
      if (payload.installingComponent.length) {
        setInstalling(payload.messages[0] !== 'Done')
      }
      if (installingComponent !== payload.installingComponent) {
        setInstallingComponent(payload.installingComponent)
      }
      setLogs((currentLogs) => [...currentLogs, ...payload.messages])
    }

    const removeListener1 =
      window.api.handleProgressOfWinetricks(onWinetricksProgress)

    const removeListener2 =
      window.api.handleWinetricksInstalling(onInstallingChange)

    return () => {
      removeListener1()
      removeListener2()
    }
  }, [])

  function launchWinetricks() {
    window.api.callTool({
      tool: 'winetricks',
      appName,
      runner: runner!
    })
  }

  const dialogContent = (
    <>
      {!loading && (
        <div className="installWrapper">
          {!installing && (
            <div className="actions">
              <WinetricksSearchBar
                allComponents={allComponents}
                installed={installed}
                onInstallClicked={install}
              />
              <button
                className="button outline"
                onClick={async () => launchWinetricks()}
                disabled={installing}
              >
                {t('winetricks.openGUI', 'Open Winetricks GUI')}
              </button>
            </div>
          )}
          {installing && (
            <p>
              {t(
                'winetricks.installing',
                'Installation in progress: {{component}}',
                { component: installingComponent }
              )}
            </p>
          )}
        </div>
      )}

      <div className="installedWrapper">
        <b>{t('winetricks.installed', 'Installed components:')}</b>
        {loading && <span>{t('winetricks.loading', 'Loading')}</span>}
        {!loading && installed.length === 0 && (
          <span>
            {t(
              'winetricks.nothingYet',
              'Nothing was installed by Winetricks yet'
            )}
          </span>
        )}
        {!loading && <span>{installed.join(', ')}</span>}
      </div>
    </>
  )

  return (
    <ProgressDialog
      title="Winetricks"
      progress={logs}
      showCloseButton={true}
      onClose={onClose}
      className="winetricksDialog"
    >
      {dialogContent}
    </ProgressDialog>
  )
}
