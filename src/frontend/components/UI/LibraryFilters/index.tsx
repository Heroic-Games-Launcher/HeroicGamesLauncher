import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { PlatformsFilters } from 'frontend/types'
import ContextProvider from 'frontend/state/ContextProvider'
import type { Runner } from 'common/types'
import Dropdown from '../Dropdown'
import StoreLogos from '../StoreLogos'
import { Button, Chip, FilterSection, Icon } from 'frontend/components/UI'
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
          <Icon glyph={SlidersHorizontal} size="md" />
          <span>{t('header.filters', 'Filters')}</span>
        </>
      }
      className="libraryFilters"
      data-tour="library-filters"
      popUpOnHover
    >
      <FilterSection label={t('header.stores', 'Stores')}>
        {stores
          .filter((s) => s.show)
          .map((s) => (
            <Chip
              key={s.key}
              active={storesFilters[s.key]}
              onClick={() => toggleStore(s.key)}
              icon={
                <span className="filterChipIcon">
                  <StoreLogos runner={s.runner} className="filterChipLogo" />
                </span>
              }
            >
              {s.label}
            </Chip>
          ))}
      </FilterSection>

      <FilterSection label={t('header.platforms', 'Platforms')}>
        {platforms
          .filter((p) => p.show)
          .map((p) => (
            <Chip
              key={p.key}
              active={platformsFilters[p.key]}
              onClick={() => togglePlatform(p.key)}
              icon={
                <span
                  className={`filterPlatformTag filterPlatformTag--${p.key}`}
                >
                  {p.tag}
                </span>
              }
            >
              {p.label}
            </Chip>
          ))}
      </FilterSection>

      <FilterSection label={t('header.display', 'Display')}>
        <Chip
          active={showFavourites}
          onClick={() => setShowFavourites(!showFavourites)}
          icon={<Icon glyph={Heart} size="md" />}
        >
          <span>{t('header.show_favourites_only', 'Favorites only')}</span>
        </Chip>
        <Chip
          active={showInstalledOnly}
          onClick={() => setShowInstalledOnly(!showInstalledOnly)}
          icon={<Icon glyph={Package} size="md" />}
        >
          <span>{t('header.show_installed_only', 'Installed only')}</span>
        </Chip>
        <Chip
          active={showUpdatesOnly}
          onClick={() => setShowUpdatesOnly(!showUpdatesOnly)}
          icon={<Icon glyph={RefreshCw} size="md" />}
        >
          <span>{t('header.show_updates_only', 'With updates')}</span>
        </Chip>
        <Chip
          active={showSupportOfflineOnly}
          onClick={() => setShowSupportOfflineOnly(!showSupportOfflineOnly)}
          icon={<Icon glyph={WifiOff} size="md" />}
        >
          <span>
            {t('header.show_support_offline_only', 'Offline-supported')}
          </span>
        </Chip>
        <Chip
          active={showThirdPartyManagedOnly}
          onClick={() =>
            setShowThirdPartyManagedOnly(!showThirdPartyManagedOnly)
          }
          icon={<Icon glyph={Clock} size="md" />}
        >
          <span>
            {t('header.show_third_party_managed_only', 'Third-party only')}
          </span>
        </Chip>
        <Chip
          active={showHidden}
          onClick={() => setShowHidden(!showHidden)}
          icon={<Icon glyph={showHidden ? Eye : EyeOff} size="md" />}
        >
          <span>{t('header.hidden', 'Hidden')}</span>
        </Chip>
        <Chip
          active={showNonAvailable}
          onClick={() => setShowNonAvailable(!showNonAvailable)}
          icon={<Icon glyph={Eye} size="md" />}
        >
          <span>{t('header.non_available', 'Non-available')}</span>
        </Chip>
      </FilterSection>

      <div className="FilterActions">
        <Button variant="ghost" size="sm" onClick={() => resetFilters()}>
          {t('header.reset', 'Reset all')}
        </Button>
      </div>
    </Dropdown>
  )
}
