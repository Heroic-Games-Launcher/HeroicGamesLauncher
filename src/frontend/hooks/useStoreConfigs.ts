import { useContext } from 'react'
import { GameInfo } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'
import { StateProps } from 'frontend/state/GlobalState'

export interface StoreConfig {
  runner: 'legendary' | 'gog' | 'nile' | 'sideload'
  filterKey: 'legendary' | 'gog' | 'nile' | 'sideload'
  displayName: () => string
  store: {
    library: GameInfo[]
    username?: string
    user_id?: string
  }
  authCheck: () => boolean
  categories: string[]
}

interface CreateStoreConfigsState {
  epic: StateProps['epic']
  gog: StateProps['gog']
  amazon: StateProps['amazon']
  sideloadedLibrary: StateProps['sideloadedLibrary']
}

export function createStoreConfigs(
  state: CreateStoreConfigsState,
  t: (key: string, fallback?: string) => string
) {
  const { epic, gog, amazon, sideloadedLibrary } = state
  const storeConfigs = [
    {
      runner: 'legendary',
      filterKey: 'legendary',
      displayName: () => t('storeDisplayNames.epic', 'Epic Games'),
      store: epic,
      categories: ['all', 'legendary', 'epic'],
      authCheck: () => !!epic.username
    },
    {
      runner: 'gog',
      filterKey: 'gog',
      displayName: () => t('storeDisplayNames.gog', 'GOG'),
      store: gog,
      categories: ['all', 'gog'],
      authCheck: () => !!gog.username
    },
    {
      runner: 'nile',
      filterKey: 'nile',
      displayName: () => t('storeDisplayNames.amazon', 'Amazon Games'),
      store: amazon,
      categories: ['all', 'nile', 'amazon'],
      authCheck: () => !!amazon.user_id
    },
    {
      runner: 'sideload',
      filterKey: 'sideload',
      displayName: () => t('storeDisplayNames.other', 'Other'),
      store: { library: sideloadedLibrary },
      categories: ['all', 'sideload'],
      authCheck: () => true // sideload doesn't need authentication
    }
  ] as StoreConfig[]

  const runnerToDisplayName = (runner: string, customFallback?: string) => {
    return (
      storeConfigs.find((config) => config.runner === runner)?.displayName() ||
      customFallback ||
      t('Other')
    )
  }

  return {
    storeConfigs,
    runnerToDisplayName
  }
}

export const useStoreConfigs = () => {
  const context = useContext(ContextProvider)
  return context.storeConfigs // Now returns the combined object directly
}
