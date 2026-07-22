import { useEffect, useState } from 'react'
import './index.scss'
import { ProgressDialog } from '../ProgressDialog'
import WinetricksSearchBar from './WinetricksSearch'
import { useTranslation } from 'react-i18next'
import type { GameHandle } from 'frontend/helpers/ipc'

interface Props {
  onClose: () => void
  game: GameHandle
}

export default function Winetricks({ onClose, game }: Props) {
  const { t } = useTranslation()

  const [loadingInstalled, setLoadingInstalled] = useState(true)
  const [loadingAvailable, setLoadingAvailable] = useState(true)

  // keep track of all installed components for a game/app
  const [installed, setInstalled] = useState<string[]>([])
  async function listInstalled() {
    setLoadingInstalled(true)
    try {
      const components = await window.api.winetricksListInstalled(game)
      setInstalled(components)
    } catch {
      setInstalled([])
    }
    setLoadingInstalled(false)
  }
  useEffect(() => {
    listInstalled()
  }, [])

  const [allComponents, setAllComponents] = useState<string[]>([])
  useEffect(() => {
    async function listComponents() {
      setLoadingAvailable(true)
      try {
        const components = await window.api.winetricksListAvailable(game)
        setAllComponents(components)
      } catch {
        setAllComponents([])
      }
      setLoadingAvailable(false)
    }

    listComponents()
  }, [])

  // handles the installation of components
  const [installing, setInstalling] = useState(false)
  const [installingComponent, setInstallingComponent] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  function install(component: string) {
    window.api.winetricksInstall(game, component)
  }

  useEffect(() => {
    async function onInstallingChange(component: string) {
      if (component === '') {
        listInstalled()
      }
      setInstalling(false)
    }

    async function onWinetricksProgress(payload: {
      messages: string[]
      installingComponent: string
    }) {
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
    window.api.callTool(game, 'winetricks')
  }

  const dialogContent = (
    <>
      {!loadingInstalled && (
        <div className="installWrapper">
          {!installing && allComponents.length !== 0 && (
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
          {loadingAvailable && (
            <span>
              {t(
                'winetricks.loading-available',
                'Loading available components ...'
              )}
            </span>
          )}
          {!loadingAvailable && allComponents.length === 0 && (
            <span>
              {t('winetricks.no-components', 'No available components')}
            </span>
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
        {loadingInstalled && <span>{t('winetricks.loading', 'Loading')}</span>}
        {!loadingInstalled && installed.length === 0 && (
          <span>
            {t(
              'winetricks.nothingYet',
              'Nothing was installed by Winetricks yet'
            )}
          </span>
        )}
        {!loadingInstalled && <span>{installed.join(', ')}</span>}
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
