import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import {
  CustomWineProton,
  DownloadProtonToSteam
} from 'frontend/screens/Settings/components'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import { UpdateComponent, ToggleSwitch } from 'frontend/components/UI'
import { TypeCheckedStoreFrontend } from 'frontend/helpers/electronStores'
import { WineManagerUISettings } from 'common/types'
import { Dispatch, SetStateAction, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  onClose: () => void
  wineManagerSettings: WineManagerUISettings[]
  setWineManagerSettings: Dispatch<SetStateAction<WineManagerUISettings[]>>
}

export default function WineManagerSettingsModal({
  onClose,
  wineManagerSettings,
  setWineManagerSettings
}: Props) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const contextValues = useSettingsContext({ appName: 'default' })

  if (!contextValues) {
    return <UpdateComponent />
  }

  return (
    <SettingsContext.Provider value={contextValues}>
      <Dialog onClose={onClose} showCloseButton={true}>
        <DialogHeader>
          <h3>{t('wine.manager.settings', 'Wine Manager Settings')}</h3>
        </DialogHeader>
        <DialogContent className="wineManagerSettingsContent">
          <div className="wineSettingsModalWrapper">
            <div className="wineManagerRepositoriesSettings">
              <h4>{t('wine.manager.repositories', 'Repositories')}</h4>
              <div className="repositoriesList">
                {wineManagerSettings
                  .filter((repo) => {
                    const linuxRepos = ['protonge', 'winege']
                    const macRepos = [
                      'gpt',
                      'winecrossover',
                      'winestagingmacos'
                    ]
                    if (platform === 'linux') {
                      return linuxRepos.includes(repo.value)
                    }
                    return macRepos.includes(repo.value)
                  })
                  .map((repo: WineManagerUISettings) => (
                    <div key={repo.value} className="repositoryItem">
                      <ToggleSwitch
                        htmlId={`repo-${repo.value}`}
                        title={repo.type}
                        value={repo.enabled}
                        handleChange={() => {
                          const newSettings = wineManagerSettings.map(
                            (r: WineManagerUISettings) =>
                              r.value === repo.value
                                ? { ...r, enabled: !r.enabled }
                                : r
                          )
                          setWineManagerSettings(newSettings)
                          const store = new TypeCheckedStoreFrontend(
                            'wineManagerConfigStore',
                            { cwd: 'store' }
                          )
                          store.set('wine-manager-settings', newSettings)
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
            <CustomWineProton />
            <DownloadProtonToSteam />
          </div>
        </DialogContent>
      </Dialog>
    </SettingsContext.Provider>
  )
}
