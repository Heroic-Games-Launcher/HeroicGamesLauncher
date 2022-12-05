import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const Shortcuts = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const supportsShortcuts = isWin || isLinux

  const [addDesktopShortcuts, setAddDesktopShortcuts] = useSetting(
    'addDesktopShortcuts',
    false
  )
  const [addStartMenuShortcuts, setAddStartMenuShortcuts] = useSetting(
    'addStartMenuShortcuts',
    false
  )
  const [addSteamShortcuts, setAddSteamShortcuts] = useSetting(
    'addSteamShortcuts',
    false
  )

  if (!isDefault) {
    return <></>
  }

  return (
    <>
      {supportsShortcuts && (
        <>
          <ToggleSwitch
            htmlId="shortcutsToDesktop"
            value={addDesktopShortcuts}
            handleChange={() => setAddDesktopShortcuts(!addDesktopShortcuts)}
            title={t(
              'setting.adddesktopshortcuts',
              'Add desktop shortcuts automatically'
            )}
          />
          <ToggleSwitch
            htmlId="shortcutsToMenu"
            value={addStartMenuShortcuts}
            handleChange={() =>
              setAddStartMenuShortcuts(!addStartMenuShortcuts)
            }
            title={t(
              'setting.addgamestostartmenu',
              'Add games to start menu automatically'
            )}
          />
        </>
      )}
      <ToggleSwitch
        htmlId="shortcutsToSteam"
        value={addSteamShortcuts}
        handleChange={() => setAddSteamShortcuts(!addSteamShortcuts)}
        title={t('setting.addgamestosteam', 'Add games to Steam automatically')}
      />
    </>
  )
}

export default Shortcuts
