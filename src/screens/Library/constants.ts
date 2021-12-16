import { TFunction } from 'react-i18next'

export function getLibraryTitle(
  category: string,
  filter: string,
  t: TFunction<'translation'>
) {
  if (category === 'games') {
    switch (filter) {
    case 'installed':
      return t('title.installedGames', 'Installed Games')
    case 'updates':
      return t('title.updates', 'Pending Updates')
    case 'downloading':
      return t('title.downloading', 'Downloading')
    case 'uninstalled':
      return t('title.notInstalledGames', 'Not Installed')
    default:
      return t('title.allGames', 'All Games')
    }
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
