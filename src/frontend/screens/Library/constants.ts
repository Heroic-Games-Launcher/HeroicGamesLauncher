import { Category } from 'frontend/types'
import { TFunction } from 'i18next'

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
    case 'nile':
      return t('Amazon Games', 'Amazon Games')
    default:
      return t('Other', 'Other')
  }
}
