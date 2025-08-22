import { ReactNode, useContext } from 'react'
import ToggleSwitch from '../ToggleSwitch'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { Category, PlatformsFilters } from 'frontend/types'
import ContextProvider from 'frontend/state/ContextProvider'
import type { Runner } from 'common/types'
import { StoreConfig } from 'frontend/state/StoreConfigState'
import { useStoreConfigs } from 'frontend/hooks/useStoreConfigs'
import './index.css'

export default function LibraryFilters() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { storeConfigs } = useStoreConfigs()
  const {
    setShowFavourites,
    setShowHidden,
    setShowInstalledOnly,
    setShowNonAvailable,
    showFavourites,
    showHidden,
    showInstalledOnly,
    showNonAvailable,
    storesFilters,
    setStoresFilters,
    platformsFilters,
    setPlatformsFilters,
    showSupportOfflineOnly,
    setShowSupportOfflineOnly,
    showThirdPartyManagedOnly,
    setShowThirdPartyManagedOnly,
    showUpdatesOnly,
    setShowUpdatesOnly
  } = useContext(LibraryContext)

  const toggleShowHidden = () => {
    setShowHidden(!showHidden)
  }

  const toggleShowNonAvailable = () => {
    setShowNonAvailable(!showNonAvailable)
  }

  const toggleOnlyFavorites = () => {
    setShowFavourites(!showFavourites)
  }

  const toggleOnlyInstalled = () => {
    setShowInstalledOnly(!showInstalledOnly)
  }

  const toggleOnlySupportOffline = () => {
    setShowSupportOfflineOnly(!showSupportOfflineOnly)
  }

  const toggleThirdParty = () => {
    setShowThirdPartyManagedOnly(!showThirdPartyManagedOnly)
  }

  const toggleUpdatesOnly = () => {
    setShowUpdatesOnly(!showUpdatesOnly)
  }

  const toggleStoreFilter = (store: Runner) => {
    const currentValue = storesFilters[store]
    const newFilters = { ...storesFilters, [store]: !currentValue }
    setStoresFilters(newFilters)
  }

  const togglePlatformFilter = (plat: keyof PlatformsFilters) => {
    const currentValue = platformsFilters[plat]
    const newFilters = { ...platformsFilters, [plat]: !currentValue }
    setPlatformsFilters(newFilters)
  }

  const setPlatformOnly = (plat: string) => {
    let newFilters = { win: false, linux: false, mac: false, browser: false }
    newFilters = { ...newFilters, [plat]: true }
    setPlatformsFilters(newFilters)
  }
  const setStoreOnly = (store: Category) => {
    let newFilters = Object.fromEntries(
      storeConfigs.map((config) => [config.filterKey, false])
    )
    newFilters = { ...newFilters, [store]: true }
    setStoresFilters(newFilters)
  }

  const ToggleWithOnly = ({
    onOnlyClicked,
    children
  }: {
    onOnlyClicked: () => void
    children: ReactNode
  }) => (
    <div className="toggleWithOnly">
      {children}
      <button className="only" onClick={() => onOnlyClicked()}>
        {t('header.only', 'only')}
      </button>
    </div>
  )

  // t('platforms.browser', 'Browser')
  // t('platforms.linux', 'Linux')
  // t('platforms.mac', 'Mac')
  // t('platforms.win', 'Windows')
  const platformToggle = (plat: keyof PlatformsFilters) => {
    const onOnlyClick = () => {
      setPlatformOnly(plat)
    }

    return (
      <ToggleWithOnly key={plat} onOnlyClicked={onOnlyClick}>
        <ToggleSwitch
          key={plat}
          htmlId={plat}
          handleChange={() => togglePlatformFilter(plat)}
          value={platformsFilters[plat]}
          title={t(`platforms.${plat}`)}
        />
      </ToggleWithOnly>
    )
  }

  const storeToggle = (storeConfig: StoreConfig) => {
    const onOnlyClick = () => {
      setStoreOnly(storeConfig.filterKey)
    }

    return (
      <ToggleWithOnly key={storeConfig.filterKey} onOnlyClicked={onOnlyClick}>
        <ToggleSwitch
          key={storeConfig.filterKey}
          htmlId={storeConfig.filterKey}
          handleChange={() => toggleStoreFilter(storeConfig.filterKey)}
          value={storesFilters[storeConfig.filterKey]}
          title={storeConfig.displayName()}
        />
      </ToggleWithOnly>
    )
  }

  const resetFilters = () => {
    const newFilters = Object.fromEntries(
      storeConfigs.map((config) => [config.filterKey, true])
    )

    setStoresFilters(newFilters)
    setPlatformsFilters({
      win: true,
      linux: true,
      mac: true,
      browser: true
    })
    setShowHidden(true)
    setShowNonAvailable(true)
    setShowFavourites(false)
    setShowInstalledOnly(false)
    setShowSupportOfflineOnly(false)
    setShowThirdPartyManagedOnly(false)
    setShowUpdatesOnly(false)
  }

  return (
    <div className="libraryFilters" data-tour="library-filters">
      <button className="selectStyle">{t('header.filters', 'Filters')}</button>
      <div className="dropdown">
        {storeConfigs
          .filter((config) => config.authCheck())
          .map((config) => storeToggle(config))}

        <hr />

        {platformToggle('win')}
        {platform === 'linux' && platformToggle('linux')}
        {platform === 'darwin' && platformToggle('mac')}
        {platformToggle('browser')}

        <hr />

        <ToggleSwitch
          key="show-hidden"
          htmlId="show-hidden"
          handleChange={() => toggleShowHidden()}
          value={showHidden}
          title={t('header.show_hidden', 'Show Hidden')}
        />
        <ToggleSwitch
          key="show-non-available"
          htmlId="show-non-available"
          handleChange={() => toggleShowNonAvailable()}
          value={showNonAvailable}
          title={t('header.show_available_games', 'Show non-Available games')}
        />
        <ToggleSwitch
          key="only-favorites"
          htmlId="only-favorites"
          handleChange={() => toggleOnlyFavorites()}
          value={showFavourites}
          title={t('header.show_favourites_only', 'Show Favourites only')}
        />
        <ToggleSwitch
          key="only-installed"
          htmlId="only-installed"
          handleChange={() => toggleOnlyInstalled()}
          value={showInstalledOnly}
          title={t('header.show_installed_only', 'Show Installed only')}
        />
        <ToggleSwitch
          key="only-support-offline"
          htmlId="only-support-offline"
          handleChange={() => toggleOnlySupportOffline()}
          value={showSupportOfflineOnly}
          title={t(
            'header.show_support_offline_only',
            'Show offline-supported only'
          )}
        />
        <ToggleSwitch
          key="only-third-party-managed"
          htmlId="only-third-party-managed"
          handleChange={() => toggleThirdParty()}
          value={showThirdPartyManagedOnly}
          title={t(
            'header.show_third_party_managed_only',
            'Show third-party managed only'
          )}
        />
        <ToggleSwitch
          key="only-updates-available"
          htmlId="only-updates-available"
          handleChange={() => toggleUpdatesOnly()}
          value={showUpdatesOnly}
          title={t('header.show_updates_only', 'Show games with updates only')}
        />
        <hr />
        <button
          type="reset"
          className="button is-primary"
          onClick={() => resetFilters()}
        >
          {t('header.reset', 'Reset')}
        </button>
      </div>
    </div>
  )
}
