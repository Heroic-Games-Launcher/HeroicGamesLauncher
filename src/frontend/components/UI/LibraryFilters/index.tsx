import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { PlatformsFilters } from 'frontend/types'
import ContextProvider from 'frontend/state/ContextProvider'
import Dropdown from '../Dropdown'
import FilterOption, { FilterOptionList } from '../FilterOption'
import { Button, CountBadge, FilterSection, Icon } from 'frontend/components/UI'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import './index.css'

type StoreKey =
  | 'legendary'
  | 'gog'
  | 'nile'
  | 'zoom'
  | 'sideload'
  | 'itchio'
  | 'steam'

export default function LibraryFilters() {
  const { t } = useTranslation()
  const { platform, epic, gog, amazon, zoom, itchio, steam } =
    useContext(ContextProvider)
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
    setShowUpdatesOnly,
    showSteamOwnedOnly,
    setShowSteamOwnedOnly
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

  const onlyStore = (store: StoreKey) => {
    const next = { ...storesFilters }
    for (const key of Object.keys(next) as StoreKey[]) {
      next[key] = key === store
    }
    setStoresFilters(next)
  }

  const onlyPlatform = (plat: keyof PlatformsFilters) => {
    const next = { ...platformsFilters }
    for (const key of Object.keys(next) as (keyof PlatformsFilters)[]) {
      next[key] = key === plat
    }
    setPlatformsFilters(next)
  }

  const capitalize = (text: string) =>
    text.charAt(0).toLocaleUpperCase() + text.slice(1)

  const onlyLabel = t('header.only', 'only')

  const resetFilters = () => {
    setStoresFilters({
      legendary: true,
      gog: true,
      nile: true,
      sideload: true,
      zoom: true,
      itchio: true,
      steam: true
    })
    setPlatformsFilters({ win: true, linux: true, mac: true, browser: true })
    setShowHidden(true)
    setShowNonAvailable(true)
    setShowFavourites(false)
    setShowInstalledOnly(false)
    setShowSupportOfflineOnly(false)
    setShowThirdPartyManagedOnly(false)
    setShowUpdatesOnly(false)
    setShowSteamOwnedOnly(false)
  }

  type StoreDef = {
    key: StoreKey
    label: string
    show: boolean
  }
  const stores: StoreDef[] = [
    {
      key: 'legendary',
      label: 'Epic Games',
      show: !!epic.username
    },
    { key: 'gog', label: 'GOG', show: !!gog.username },
    {
      key: 'steam',
      label: 'Steam',
      show: steam.enabled
    },
    {
      key: 'nile',
      label: 'Amazon Games',
      show: !!amazon.user_id
    },
    {
      key: 'zoom',
      label: 'ZOOM',
      show: !!(zoom.enabled && zoom.username)
    },
    {
      key: 'itchio',
      label: 'itch.io',
      show: !!itchio.username
    },
    {
      key: 'sideload',
      label: t('Other', 'Other'),
      show: true
    }
  ]

  type PlatformDef = {
    key: keyof PlatformsFilters
    label: string
    show: boolean
  }
  const platforms: PlatformDef[] = [
    { key: 'win', label: t('platforms.win', 'windows'), show: true },
    {
      key: 'linux',
      label: t('platforms.linux', 'linux'),
      show: platform === 'linux'
    },
    {
      key: 'mac',
      label: t('platforms.mac', 'mac'),
      show: platform === 'darwin'
    },
    {
      key: 'browser',
      label: t('platforms.browser', 'browser'),
      show: true
    }
  ]

  const displayOptions = [
    {
      key: 'favourites',
      label: t('header.show_favourites_only', 'Favorites only'),
      checked: showFavourites,
      toggle: () => setShowFavourites(!showFavourites),
      show: true
    },
    {
      key: 'installed',
      label: t('header.show_installed_only', 'Installed only'),
      checked: showInstalledOnly,
      toggle: () => setShowInstalledOnly(!showInstalledOnly),
      show: true
    },
    {
      key: 'updates',
      label: t('header.show_updates_only', 'With updates'),
      checked: showUpdatesOnly,
      toggle: () => setShowUpdatesOnly(!showUpdatesOnly),
      show: true
    },
    {
      key: 'steamOwned',
      label: t('header.show_steam_owned_only', 'Steam owned only'),
      checked: showSteamOwnedOnly,
      toggle: () => setShowSteamOwnedOnly(!showSteamOwnedOnly),
      show: steam.enabled
    },
    {
      key: 'offline',
      label: t('header.show_support_offline_only', 'Offline-supported'),
      checked: showSupportOfflineOnly,
      toggle: () => setShowSupportOfflineOnly(!showSupportOfflineOnly),
      show: true
    },
    {
      key: 'thirdParty',
      label: t('header.show_third_party_managed_only', 'Third-party only'),
      checked: showThirdPartyManagedOnly,
      toggle: () => setShowThirdPartyManagedOnly(!showThirdPartyManagedOnly),
      show: true
    },
    {
      key: 'hidden',
      label: t('header.hidden', 'Hidden'),
      checked: showHidden,
      toggle: () => setShowHidden(!showHidden),
      show: true
    },
    {
      key: 'nonAvailable',
      label: t('header.non_available', 'Non-available'),
      checked: showNonAvailable,
      toggle: () => setShowNonAvailable(!showNonAvailable),
      show: true
    }
  ]

  const activeFilterCount =
    stores.filter((s) => s.show && !storesFilters[s.key]).length +
    platforms.filter((p) => p.show && !platformsFilters[p.key]).length +
    [
      showFavourites,
      showInstalledOnly,
      showUpdatesOnly,
      showSupportOfflineOnly,
      showThirdPartyManagedOnly,
      steam.enabled && showSteamOwnedOnly
    ].filter(Boolean).length

  return (
    <Dropdown
      buttonClass="pill"
      title={
        <>
          <Icon glyph={SlidersHorizontal} size="md" />
          <span className="dropdownButton__label">
            {t('header.filters', 'Filters')}
          </span>
          <CountBadge
            count={activeFilterCount}
            label={t('header.filters_applied', {
              count: activeFilterCount,
              defaultValue_one: '{{count}} filter applied',
              defaultValue_other: '{{count}} filters applied'
            })}
          />
          <Icon glyph={ChevronDown} size="sm" />
        </>
      }
      className="libraryFilters"
      dataTour="library-filters"
    >
      <FilterSection label={t('header.stores', 'Stores')}>
        <FilterOptionList>
          {stores
            .filter((s) => s.show)
            .map((s) => (
              <FilterOption
                key={s.key}
                label={s.label}
                checked={storesFilters[s.key]}
                onChange={() => toggleStore(s.key)}
                onOnly={() => onlyStore(s.key)}
                onlyLabel={onlyLabel}
              />
            ))}
        </FilterOptionList>
      </FilterSection>

      <FilterSection label={t('header.platforms', 'Platforms')}>
        <FilterOptionList>
          {platforms
            .filter((p) => p.show)
            .map((p) => (
              <FilterOption
                key={p.key}
                label={capitalize(p.label)}
                checked={platformsFilters[p.key]}
                onChange={() => togglePlatform(p.key)}
                onOnly={() => onlyPlatform(p.key)}
                onlyLabel={onlyLabel}
              />
            ))}
        </FilterOptionList>
      </FilterSection>

      <FilterSection label={t('header.display', 'Display')}>
        <FilterOptionList>
          {displayOptions
            .filter((option) => option.show)
            .map((option) => (
              <FilterOption
                key={option.key}
                label={option.label}
                checked={option.checked}
                onChange={option.toggle}
              />
            ))}
        </FilterOptionList>
      </FilterSection>

      <div className="FilterActions">
        <Button variant="ghost" size="sm" onClick={() => resetFilters()}>
          {t('header.reset', 'Reset all')}
        </Button>
      </div>
    </Dropdown>
  )
}
