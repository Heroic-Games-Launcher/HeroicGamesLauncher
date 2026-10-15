import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import SettingsContext from '../SettingsContext'

const Eglv2Sync = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform, refreshLibrary, showDialogModal } =
    useContext(ContextProvider)
  const [eglv2Sync, setEglv2Sync] = useSetting('eglv2Sync', false)

  // The new Epic Games Launcher's Linux build runs Windows games through
  // Proton; on Windows/macOS, EGS Sync covers this
  if (!isDefault || platform !== 'linux') return <></>

  async function toggle() {
    const enable = !eglv2Sync
    setEglv2Sync(enable)
    if (!enable) return

    const result = await window.api.syncWithNewEgl()
    void refreshLibrary({ runInBackground: true })
    if (!result?.skipped.length) return
    showDialogModal({
      showDialog: true,
      title: t('setting.eglv2-sync.title', 'Epic Games Launcher sync'),
      message: (
        <>
          <p>
            {t('setting.eglv2-sync.skipped', "These games weren't synced:")}
          </p>
          <ul>
            {result.skipped.map(({ title, reason }) => (
              <li key={title}>
                {title}: {reason}
              </li>
            ))}
          </ul>
        </>
      )
    })
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="eglv2Sync"
        value={eglv2Sync}
        handleChange={() => void toggle()}
        title={t(
          'setting.eglv2-sync.toggle',
          'Sync installed games with the new Epic Games Launcher'
        )}
      />
      <InfoIcon
        text={t(
          'help.eglv2-sync',
          'Epic games you install in Heroic show up in the new Epic Games Launcher and vice versa, sharing the same files so nothing is downloaded twice. Uninstalls, updates and moves are synced too. Changes made in Heroic appear in the Epic Games Launcher the next time it starts, and changes made there appear in Heroic the next time it starts or refreshes its library.'
        )}
      />
    </div>
  )
}

export default Eglv2Sync
