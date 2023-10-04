import { GameInfo } from 'common/types'
import { configStore, libraryStore } from 'frontend/helpers/electronStores'
import { atom } from 'recoil'

export interface EpicState {
  library: GameInfo[]
  username?: string
}

export const epicState = atom({
  key: 'epicState',
  default: {
    library: libraryStore.get('library', []),
    username: configStore.get_nodefault('userInfo.displayName')
  } as EpicState
})
