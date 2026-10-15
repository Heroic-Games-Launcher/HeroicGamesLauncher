import { useContext, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { getGameInfo } from 'frontend/helpers'

import SettingsContext from '../../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { Button, SettingRow, Winetricks } from 'frontend/components/UI'

export default function Tools() {
  const { t } = useTranslation()
  const [winecfgRunning, setWinecfgRunning] = useState(false)
  const [winetricksRunning, setWinetricksRunning] = useState(false)
  const [runExeRunning, setRunExeRunning] = useState(false)
  const { appName, runner, isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWindows = platform === 'win32'

  if (isDefault || isWindows || !runner) {
    return <></>
  }

  const callTools = async (tool: 'winecfg' | 'runExe', exe?: string) => {
    const toolStates = {
      winecfg: setWinecfgRunning,
      runExe: setRunExeRunning
    }

    if (tool in toolStates) {
      toolStates[tool](true)
    }

    await window.api.callTool({
      tool,
      exe,
      appName,
      runner
    })

    if (tool in toolStates) {
      toolStates[tool](false)
    }
  }

  const handleRunExe = async () => {
    let exe = ''
    const gameinfo = await getGameInfo(appName, runner)
    if (!gameinfo) return
    const defaultPath =
      gameinfo.runner === 'sideload' ? undefined : gameinfo.install.install_path

    const path = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title', 'Select EXE to Run'),
      defaultPath
    })
    if (path) {
      exe = path
      callTools('runExe', exe)
    }
  }

  function openWinetricksDialog() {
    setWinetricksRunning(true)
  }

  function winetricksDialogClosed() {
    setWinetricksRunning(false)
  }

  return (
    <>
      {winetricksRunning && (
        <Winetricks onClose={winetricksDialogClosed} runner={runner} />
      )}

      <SettingRow
        label="Winecfg"
        description={t(
          'setting.winecfg.description',
          'Open the Wine configuration panel for this prefix'
        )}
      >
        <Button
          data-testid="wineCFG"
          variant="secondary"
          disabled={winecfgRunning}
          onClick={async () => callTools('winecfg')}
        >
          {winecfgRunning
            ? t('setting.tools.running', 'Running...')
            : t('setting.tools.open', 'Open')}
        </Button>
      </SettingRow>

      <SettingRow
        label="Winetricks"
        description={t(
          'setting.winetricks.description',
          'Install Windows libraries and components into this prefix'
        )}
      >
        <Button
          data-testid="wineTricks"
          variant="secondary"
          onClick={() => openWinetricksDialog()}
        >
          {t('setting.tools.open', 'Open')}
        </Button>
      </SettingRow>

      <SettingRow
        label={t('setting.runexe.title')}
        description={t(
          'setting.runexe.description',
          'Run any executable inside this prefix, such as an installer'
        )}
      >
        <Button
          variant="secondary"
          disabled={runExeRunning}
          onClick={handleRunExe}
        >
          {runExeRunning
            ? t('setting.tools.running', 'Running...')
            : t('setting.tools.selectExe', 'Select EXE')}
        </Button>
      </SettingRow>
    </>
  )
}
