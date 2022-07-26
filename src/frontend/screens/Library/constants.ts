import { TFunction } from 'react-i18next'

export function getLibraryTitle(
  category: string,
  filter: string,
  t: TFunction<'translation'>
) {
  switch (category) {
    case 'all':
      return t('title.allGames', 'All Games')
    case 'legendary':
      return t('Epic Games', 'Epic Games')
    case 'gog':
      return t('GOG', 'GOG')
    case 'unreal':
      return t('title.allUnreal', 'Unreal - Everything')
  }

  switch (filter) {
    case 'asset':
      return t('title.unrealAssets', 'Unreal - Assets')
    case 'plugin':
      return t('title.unrealPlugins', 'Unreal - Plugins')
    case 'project':
      return t('title.unrealProjects', 'Unreal - Projects')
    default:
      return t('title.allUnreal', 'Unreal - Everything')
  }
}
