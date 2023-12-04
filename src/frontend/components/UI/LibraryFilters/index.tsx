import React, { useContext } from 'react'
import ToggleSwitch from '../ToggleSwitch'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { Category } from 'frontend/types'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

const RunnerToStore = {
  legendary: 'Epic Games',
  gog: 'GOG',
  nile: 'Amazon Games',
  sideload: 'Other'
}

export default function LibraryFilters() {
  const { t } = useTranslation()
  const { platform, epic, gog, amazon } = useContext(ContextProvider)
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
    toggleStoreFilter,
    platformsFilters,
    togglePlatformFilter
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

  // t('platforms.browser', 'Browser')
  // t('platforms.linux', 'Linux')
  // t('platforms.mac', 'Mac')
  // t('platforms.win', 'Windows')
  const platformToggle = (plat: string) => {
    return (
      <ToggleSwitch
        key={plat}
        htmlId={plat}
        handleChange={() => togglePlatformFilter(plat)}
        value={platformsFilters[plat]}
        title={t(`platforms.${plat}`)}
      />
    )
  }

  // t('Epic Games', 'Epic Games')
  // t('GOG', 'GOG')
  // t('Amazon Games', 'Amazon Games')
  // t('Other', 'Other')
  const storeToggle = (store: string) => {
    return (
      <ToggleSwitch
        key={store}
        htmlId={store}
        handleChange={() => toggleStoreFilter(store as Category)}
        value={storesFilters[store]}
        title={t(RunnerToStore[store])}
      />
    )
  }

  return (
    <div className="libraryFilters">
      <button className="button is-primary">
        {t('header.filters', 'Filters')}
      </button>
      <div className="dropdown">
        {epic.username && storeToggle('legendary')}
        {gog.username && storeToggle('gog')}
        {amazon.username && storeToggle('nile')}
        {storeToggle('sideload')}

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
      </div>
    </div>
  )
}
