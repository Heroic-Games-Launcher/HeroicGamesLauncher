import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { useGlobalConfig } from 'frontend/hooks/config'
import SettingsContext from '../SettingsContext'

const Shortcuts = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const supportsDesktopShortcut = isWin || isLinux

  const [
    addDesktopShortcuts,
    setAddDesktopShortcuts,
    ,
    desktopShortcutsSetToDefault,
    desktopShortcutsResetToDefault
  ] = useGlobalConfig('addDesktopShortcuts')
  const [
    addStartMenuShortcuts,
    setAddStartMenuShortcuts,
    ,
    startMenuShortcutsSetToDefault,
    startMenuShortctusResetToDefault
  ] = useGlobalConfig('addStartMenuShortcuts')
  const [
    addSteamShortcuts,
    setAddSteamShortcuts,
    ,
    steamShortcutsSetToDefault,
    steamShortctusResetToDefault
  ] = useGlobalConfig('addSteamShortcuts')

  if (!isDefault) {
    return <></>
  }

  let menuShortcutsLabel = t(
    'setting.addgamestostartmenu',
    'Add games to start menu automatically'
  )
  if (!isLinux && !isWin) {
    menuShortcutsLabel = t(
      'setting.addgamestoapplications',
      'Add games to Applications automatically'
    )
  }

  return (
    <>
      {supportsDesktopShortcut && (
        <ToggleSwitch
          htmlId="shortcutsToDesktop"
          value={addDesktopShortcuts}
          handleChange={async () =>
            setAddDesktopShortcuts(!addDesktopShortcuts)
          }
          title={t(
            'setting.adddesktopshortcuts',
            'Add desktop shortcuts automatically'
          )}
          isSetToDefaultValue={desktopShortcutsSetToDefault}
          resetToDefaultValue={desktopShortcutsResetToDefault}
        />
      )}

      <ToggleSwitch
        htmlId="shortcutsToMenu"
        value={addStartMenuShortcuts}
        handleChange={async () =>
          setAddStartMenuShortcuts(!addStartMenuShortcuts)
        }
        title={menuShortcutsLabel}
        isSetToDefaultValue={startMenuShortcutsSetToDefault}
        resetToDefaultValue={startMenuShortctusResetToDefault}
      />

      <ToggleSwitch
        htmlId="shortcutsToSteam"
        value={addSteamShortcuts}
        handleChange={async () => setAddSteamShortcuts(!addSteamShortcuts)}
        title={t('setting.addgamestosteam', 'Add games to Steam automatically')}
        isSetToDefaultValue={steamShortcutsSetToDefault}
        resetToDefaultValue={steamShortctusResetToDefault}
      />
    </>
  )
}

export default Shortcuts
