import { storeConfigsStore } from 'frontend/state/StoreConfigState'
import { useStore } from 'zustand'

export const useStoreConfigs = () => {
  return useStore(storeConfigsStore)
}
