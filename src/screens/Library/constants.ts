import { TFunction } from 'react-i18next'

export function getLibraryTitle(
  category: string,
  filter: string,
  t: TFunction<'translation'>
) {
  if (category === 'legendary' || category === 'gog') {
    return t('title.allGames', 'All Games')
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
