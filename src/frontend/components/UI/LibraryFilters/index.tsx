import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { PlatformsFilters } from 'frontend/types'
import ContextProvider from 'frontend/state/ContextProvider'
import type { Runner } from 'common/types'
import Dropdown from '../Dropdown'
import StoreLogos from '../StoreLogos'
import {
  SlidersHorizontal,
  Heart,
  Clock,
  Eye,
  EyeOff,
  WifiOff,
  Package,
  RefreshCw
} from 'lucide-react'
import './index.css'

type StoreKey = 'legendary' | 'gog' | 'nile' | 'zoom' | 'sideload'

export default function LibraryFilters() {
  const { t } = useTranslation()
  const { platform, epic, gog, amazon, zoom } = useContext(ContextProvider)
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

  const toggleStore = (store: StoreKey) => {
    setStoresFilters({ ...storesFilters, [store]: !storesFilters[store] })
  }

  const togglePlatform = (plat: keyof PlatformsFilters) => {
    setPlatformsFilters({
      ...platformsFilters,
      [plat]: !platformsFilters[plat]
    })
  }

  const resetFilters = () => {
    setStoresFilters({
      legendary: true,
      gog: true,
      nile: true,
      sideload: true,
      zoom: true
    })
    setPlatformsFilters({ win: true, linux: true, mac: true, browser: true })
    setShowHidden(true)
    setShowNonAvailable(true)
    setShowFavourites(false)
    setShowInstalledOnly(false)
    setShowSupportOfflineOnly(false)
    setShowThirdPartyManagedOnly(false)
    setShowUpdatesOnly(false)
  }

  type StoreDef = {
    key: StoreKey
    label: string
    runner: Runner
    show: boolean
  }
  const stores: StoreDef[] = [
    {
      key: 'legendary',
      label: 'Epic Games',
      runner: 'legendary',
      show: !!epic.username
    },
    { key: 'gog', label: 'GOG', runner: 'gog', show: !!gog.username },
    {
      key: 'nile',
      label: 'Amazon Games',
      runner: 'nile',
      show: !!amazon.user_id
    },
    {
      key: 'zoom',
      label: 'ZOOM',
      runner: 'zoom',
      show: !!(zoom.enabled && zoom.username)
    },
    {
      key: 'sideload',
      label: t('Other', 'Other'),
      runner: 'sideload',
      show: true
    }
  ]

  type PlatformDef = {
    key: keyof PlatformsFilters
    label: string
    tag: string
    show: boolean
  }
  const platforms: PlatformDef[] = [
    { key: 'win', label: t('platforms.win', 'Windows'), tag: 'W', show: true },
    {
      key: 'linux',
      label: t('platforms.linux', 'Linux'),
      tag: 'L',
      show: platform === 'linux'
    },
    {
      key: 'mac',
      label: t('platforms.mac', 'Mac'),
      tag: 'M',
      show: platform === 'darwin'
    },
    {
      key: 'browser',
      label: t('platforms.browser', 'Browser'),
      tag: 'B',
      show: true
    }
  ]

  return (
    <Dropdown
      buttonClass="pill"
      title={
        <>
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
          <span>{t('header.filters', 'Filters')}</span>
        </>
      }
      className="libraryFilters"
      data-tour="library-filters"
      popUpOnHover
    >
      <div className="filterSection">
        <div className="filterSectionLabel">{t('header.stores', 'Stores')}</div>
        <div className="filterChips">
          {stores
            .filter((s) => s.show)
            .map((s) => (
              <button
                key={s.key}
                type="button"
                className={`filterChip ${storesFilters[s.key] ? 'on' : ''}`}
                onClick={() => toggleStore(s.key)}
              >
                <span className="filterChipIcon">
                  <StoreLogos runner={s.runner} className="filterChipLogo" />
                </span>
                <span>{s.label}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="filterSection">
        <div className="filterSectionLabel">
          {t('header.platforms', 'Platforms')}
        </div>
        <div className="filterChips">
          {platforms
            .filter((p) => p.show)
            .map((p) => (
              <button
                key={p.key}
                type="button"
                className={`filterChip ${platformsFilters[p.key] ? 'on' : ''}`}
                onClick={() => togglePlatform(p.key)}
              >
                <span
                  className={`filterPlatformTag filterPlatformTag--${p.key}`}
                >
                  {p.tag}
                </span>
                <span>{p.label}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="filterSection">
        <div className="filterSectionLabel">
          {t('header.display', 'Display')}
        </div>
        <div className="filterChips">
          <button
            type="button"
            className={`filterChip ${showFavourites ? 'on' : ''}`}
            onClick={() => setShowFavourites(!showFavourites)}
          >
            <Heart size={14} strokeWidth={1.75} aria-hidden />
            <span>{t('header.show_favourites_only', 'Favorites only')}</span>
          </button>
          <button
            type="button"
            className={`filterChip ${showInstalledOnly ? 'on' : ''}`}
            onClick={() => setShowInstalledOnly(!showInstalledOnly)}
          >
            <Package size={14} strokeWidth={1.75} aria-hidden />
            <span>{t('header.show_installed_only', 'Installed only')}</span>
          </button>
          <button
            type="button"
            className={`filterChip ${showUpdatesOnly ? 'on' : ''}`}
            onClick={() => setShowUpdatesOnly(!showUpdatesOnly)}
          >
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
            <span>{t('header.show_updates_only', 'With updates')}</span>
          </button>
          <button
            type="button"
            className={`filterChip ${showSupportOfflineOnly ? 'on' : ''}`}
            onClick={() => setShowSupportOfflineOnly(!showSupportOfflineOnly)}
          >
            <WifiOff size={14} strokeWidth={1.75} aria-hidden />
            <span>
              {t('header.show_support_offline_only', 'Offline-supported')}
            </span>
          </button>
          <button
            type="button"
            className={`filterChip ${showThirdPartyManagedOnly ? 'on' : ''}`}
            onClick={() =>
              setShowThirdPartyManagedOnly(!showThirdPartyManagedOnly)
            }
          >
            <Clock size={14} strokeWidth={1.75} aria-hidden />
            <span>
              {t('header.show_third_party_managed_only', 'Third-party only')}
            </span>
          </button>
          <button
            type="button"
            className={`filterChip ${showHidden ? 'on' : ''}`}
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? (
              <Eye size={14} strokeWidth={1.75} aria-hidden />
            ) : (
              <EyeOff size={14} strokeWidth={1.75} aria-hidden />
            )}
            <span>{t('header.show_hidden', 'Show hidden')}</span>
          </button>
          <button
            type="button"
            className={`filterChip ${showNonAvailable ? 'on' : ''}`}
            onClick={() => setShowNonAvailable(!showNonAvailable)}
          >
            <Eye size={14} strokeWidth={1.75} aria-hidden />
            <span>
              {t('header.show_available_games', 'Show non-available')}
            </span>
          </button>
        </div>
      </div>

      <div className="filterActions">
        <button
          type="reset"
          className="filterReset"
          onClick={() => resetFilters()}
        >
          {t('header.reset', 'Reset all')}
        </button>
      </div>
    </Dropdown>
  )
}
