import { useContext, useMemo } from 'react'
import { Runner, GameInfo } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

export interface StoreConfig {
  runner: Runner
  filterKey: 'legendary' | 'gog' | 'nile' | 'sideload'
  displayName: string
  store: {
    library: GameInfo[]
    username?: string
    user_id?: string
  }
  authCheck: () => boolean
  categories: string[]
}

export const useStoreConfigs = () => {
  const { epic, gog, amazon, sideloadedLibrary } = useContext(ContextProvider)
  const { t } = useTranslation()

  const storeConfigs = useMemo(
    () => [
      {
        runner: 'legendary',
        filterKey: 'legendary',
        displayName: t('Epic Games'),
        store: epic,
        categories: ['all', 'legendary', 'epic'],
        authCheck: () => !!epic.username,
      },
      {
        runner: 'gog',
        filterKey: 'gog',
        displayName: t('GOG'),
        store: gog,
        categories: ['all', 'gog'],
        authCheck: () => !!gog.username,
      },
      {
        runner: 'nile',
        filterKey: 'nile',
        displayName: t('Amazon Games'),
        store: amazon,
        categories: ['all', 'nile', 'amazon'],
        authCheck: () => !!amazon.user_id,
      },
      {
        runner: 'sideload',
        filterKey: 'sideload',
        displayName: t('Other'),
        store: { library: sideloadedLibrary },
        categories: ['all', 'sideload'],
        authCheck: () => true, // sideload doesn't need authentication
      }
    ] as StoreConfig[],
    [epic, gog, amazon, sideloadedLibrary]
  )

  const runnerToDisplayName = useMemo(() => {
    return Object.fromEntries(
      storeConfigs.map(config => [config.runner, config.displayName])
    )
  }, [storeConfigs])

  return { storeConfigs, runnerToDisplayName }
}
