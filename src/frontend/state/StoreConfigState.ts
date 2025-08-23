import { GameInfo } from 'common/types'
import { StateProps } from 'frontend/state/GlobalState'
import { create } from 'zustand'

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

interface StoreConfigsStore {
  storeConfigs: StoreConfig[]
  runnerToDisplayName: (runner: string, customFallback?: string) => string
  updateStoreConfigs: (
    state: CreateStoreConfigsState,
    t: (key: string, fallback?: string) => string
  ) => void
}

export const storeConfigsStore = create<StoreConfigsStore>((set, get) => ({
  storeConfigs: [],
  runnerToDisplayName: (runner: string, customFallback?: string) => {
    const { storeConfigs } = get()
    return (
      storeConfigs.find((config) => config.runner === runner)?.displayName() ||
      customFallback ||
      'Other'
    )
  },
  updateStoreConfigs: (
    state: CreateStoreConfigsState,
    t: (key: string, fallback?: string) => string
  ) => {
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
    ]

    set({ storeConfigs: storeConfigs as StoreConfig[] })
  }
}))
