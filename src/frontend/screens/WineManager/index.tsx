import './index.css'

import ContextProvider from 'frontend/state/ContextProvider'
import {
  Alert,
  Button,
  Icon,
  PageHeader,
  Panel,
  Table,
  Tabs,
  Tooltip
} from 'frontend/components/UI'
import type { TableColumn } from 'frontend/components/UI'

import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { wineDownloaderInfoStore } from 'frontend/helpers/electronStores'
import { RefreshCw, Settings } from 'lucide-react'
import { WineVersionInfo, Type, WineManagerUISettings } from 'common/types'
import SearchBar from 'frontend/components/UI/SearchBar'
import WineManagerSettingsModal from './components/WineManagerSettingsModal'
import WineVersionActions from './components/WineVersionActions'
import WineVersionSize from './components/WineVersionSize'
import { hasHelp } from 'frontend/hooks/hasHelp'
import useGlobalState from 'frontend/state/GlobalStateV2'

function formatReleaseDate(date: string, locale: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date

  const [, year, month, day] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function WineManager(): JSX.Element | null {
  const { t, i18n } = useTranslation()

  hasHelp(
    'wineManager',
    t('help.title.wineManager', 'Wine Manager'),
    <p>
      {t(
        'help.content.wineManager',
        'Install different versions of Wine, Proton, Crossover, etc.'
      )}
    </p>
  )

  const { platform, isIntelMac } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const { refreshingWineVersions, refreshWineVersions } = useGlobalState.keys(
    'refreshingWineVersions',
    'refreshWineVersions'
  )

  const repositories: WineManagerUISettings[] = useMemo(() => {
    if (isLinux) {
      return [
        { type: 'Proton-CachyOS', value: 'proton-cachyos' },
        { type: 'GE-Proton', value: 'protonge' }
      ]
    }
    return [
      { type: 'Game-Porting-Toolkit', value: 'gpt' },
      { type: 'Wine-Crossover', value: 'winecrossover' },
      { type: 'Wine-Staging-macOS', value: 'winestagingmacos' }
    ]
  }, [isLinux])

  const getDefaultRepository = (): WineManagerUISettings => {
    if (isLinux) {
      return repositories[0]
    } else if (isIntelMac) {
      return repositories[1]
    } else {
      return repositories[0]
    }
  }

  const [repository, setRepository] = useState<WineManagerUISettings>(
    getDefaultRepository()
  )

  const getWineVersions = (repo: Type) => {
    const versions = wineDownloaderInfoStore.get('wine-releases', [])

    return versions.filter((version) => version.type === repo)
  }

  const [wineVersions, setWineVersions] = useState<WineVersionInfo[]>(
    getWineVersions(repository.type)
  )

  const [search, setSearch] = useState('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const handleChangeTab = (value: string) => {
    const repo = repositories.find((setting) => setting.value === value)
    if (!repo) return

    setRepository(repo)
    setWineVersions(getWineVersions(repo.type))
    setSearch('')
  }

  useEffect(() => {
    const removeListener = window.api.handleWineVersionsUpdated(() => {
      setWineVersions(getWineVersions(repository.type))
    })
    return () => {
      removeListener()
    }
  }, [repository])

  const wineVersionExplanation = useMemo(() => {
    switch (repository.type) {
      case 'GE-Proton':
        return t(
          'wineExplanation.proton-ge',
          'GE-Proton is a Proton variant created by Glorious Eggroll. It is meant to be used along with the umu launcher (default in Heroic).'
        )
      case 'Game-Porting-Toolkit':
        return t(
          'wineExplanation.gpt',
          'Game Porting Toolkit is developed by Apple and it is recommended for Apple Silicon Macs with the M1+ chips and works best for newer games that use DX12.'
        )
      case 'Wine-Crossover':
        return t(
          'wineExplanation.wine-crossover',
          'Wine-Crossover is based on the Crossover OpenSource Wine project and is recommended for Intel Macs and for DX11 or older games.'
        )
      case 'Wine-Staging-macOS':
        return t(
          'wineExplanation.wine-staging-macos',
          'Wine-Staging-macOS is based on the mainline Wine project and is recommended for Intel Macs and for DX11 or older games, especially when paired with the DXMT tool.'
        )
      case 'Proton-CachyOS':
        return t(
          'wineExplanation.proton-cachyos',
          'Proton-CachyOS is a Proton variant maintaned by the CachyOS team. It includes extra tools like DXVK-Sarek and D7VK.'
        )
      default:
        return null
    }
  }, [repository.type, t])

  const filteredWineVersions = useMemo(() => {
    if (!search) return wineVersions

    const query = search.toLowerCase()
    return wineVersions.filter((v) => v.version.toLowerCase().includes(query))
  }, [wineVersions, search])

  const columns: TableColumn<WineVersionInfo>[] = useMemo(
    () => [
      {
        key: 'version',
        header: t('info.version', 'Wine Version'),
        width: '40%',
        render: (wineVersion) => (
          <Tooltip content={t('wine.notes', 'Notes')} asChild>
            <button
              type="button"
              className="WineManager__version"
              onClick={() =>
                window.api.openWebviewPage(wineVersion.release_notes_link)
              }
            >
              {wineVersion.version}
            </button>
          </Tooltip>
        )
      },
      {
        key: 'date',
        header: t('wine.release', 'Release Date'),
        width: '22%',
        collapseOnNarrow: true,
        className: 'WineManager__date',
        render: (wineVersion) =>
          formatReleaseDate(wineVersion.date, i18n.language)
      },
      {
        key: 'size',
        header: t('wine.size', 'Size'),
        width: '20%',
        render: (wineVersion) => <WineVersionSize {...wineVersion} />
      },
      {
        key: 'actions',
        header: t('wine.actions', 'Action'),
        width: '18%',
        align: 'end',
        render: (wineVersion) => (
          <WineVersionActions wineVersion={wineVersion} />
        )
      }
    ],
    [t, i18n.language]
  )

  const tabItems = useMemo(
    () =>
      repositories.map(({ type, value }) => ({ value, label: type as string })),
    [repositories]
  )

  return (
    <div className="WineManager">
      <PageHeader
        title={t('wine.manager.title', 'Wine Manager')}
        description={t(
          'wine.manager.subtitle',
          'Download and manage the Wine, Proton and CrossOver builds Heroic can use'
        )}
        actions={
          <>
            <SearchBar
              placeholder={t('wine.manager.search', 'Search versions...')}
              value={search}
              onInputChanged={setSearch}
            />
            <Tooltip content={t('generic.library.refresh', 'Refresh Library')}>
              <Button
                variant="ghost"
                aria-label={t('generic.library.refresh', 'Refresh Library')}
                onClick={() => refreshWineVersions(true)}
                icon={
                  <Icon
                    glyph={RefreshCw}
                    className={
                      refreshingWineVersions ? 'lucide-spin' : undefined
                    }
                  />
                }
              />
            </Tooltip>
            {isLinux && (
              <Tooltip content={t('wine.manager.settings', 'Settings')}>
                <Button
                  variant="ghost"
                  aria-label={t('wine.manager.settings', 'Settings')}
                  onClick={() => setShowSettingsModal(true)}
                  icon={<Icon glyph={Settings} />}
                />
              </Tooltip>
            )}
          </>
        }
      />

      <Tabs
        items={tabItems}
        value={repository.value}
        onChange={handleChangeTab}
        aria-label={t('wine.manager.title', 'Wine Manager')}
      />

      {wineVersionExplanation && (
        <Alert variant="info">{wineVersionExplanation}</Alert>
      )}

      <Panel padding="none" className="WineManager__panel">
        <Table
          columns={columns}
          rows={filteredWineVersions}
          rowKey={(wineVersion) => wineVersion.version}
          caption={t('wine.manager.title', 'Wine Manager')}
          loading={refreshingWineVersions}
          empty={
            search
              ? t(
                  'wine.manager.no-results',
                  'No Wine versions match your search.'
                )
              : t(
                  'wine.manager.not-found',
                  'No Wine versions found. Please click the refresh icon to try again.'
                )
          }
        />
      </Panel>

      {showSettingsModal && (
        <WineManagerSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  )
}
