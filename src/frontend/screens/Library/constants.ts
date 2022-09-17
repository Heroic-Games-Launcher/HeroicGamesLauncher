import { GameInfo } from 'common/types'
import { Category } from 'frontend/types'
import { TFunction } from 'react-i18next'

export function getLibraryTitle(
  category: Category,
  t: TFunction<'translation'>
) {
  switch (category) {
    case 'all':
      return t('title.allGames', 'All Games')
    case 'legendary':
      return t('Epic Games', 'Epic Games')
    case 'gog':
      return t('GOG', 'GOG')
  }
}

export type SideloadCard = GameInfo & { onClick: () => void; isEmpty: boolean }
export const emptyCard: SideloadCard = {
  title: 'Add Game',
  isEmpty: true,
  onClick: () => console.log('sideload'),
  is_installed: false,
  is_linux_native: false,
  is_mac_native: false,
  install: {
    is_dlc: false,
    install_path: '',
    install_size: '0'
  },
  runner: 'sideload',
  store_url: '',
  app_name: 'sideload',
  art_cover: '',
  art_square: 'fallback',
  cloud_save_enabled: false,
  developer: '',
  extra: {
    about: { description: '', longDescription: '' },
    reqs: []
  },
  folder_name: '',
  namespace: '',
  save_folder: '',
  canRunOffline: false
}
