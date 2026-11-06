import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Icon, InfoTooltip, SettingRow } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { Brush } from 'lucide-react'

const ClearCache = () => {
  const { refreshLibrary } = useContext(ContextProvider)
  const { t } = useTranslation()

  async function clearHeroicCache() {
    const storage: Storage = window.localStorage
    storage.removeItem('updates')
    window.api.clearCache(true)
    return refreshLibrary({ runInBackground: true })
  }

  const details = (
    <>
      {t(
        'settings.advanced.clearCache.help1',
        'This action will clear the following caches:'
      )}
      <ul>
        <li>
          {t(
            'settings.advanced.clearCache.help2',
            'Third-party game info (scores, steam compatibility, howlongtobeat, pcgamingwiki, applegamingwiki)'
          )}
        </li>
        <li>
          {t(
            'settings.advanced.clearCache.help3',
            'Legendary library info (list of games, install dialog info, game info)'
          )}
        </li>
        <li>
          {t(
            'settings.advanced.clearCache.help4',
            'GOG library info (list of games, install dialog info, api info -i.e: requirements-)'
          )}
        </li>
        <li>
          {t(
            'settings.advanced.clearCache.help5',
            'Amazon library info (list of games, install dialog info)'
          )}
        </li>
      </ul>
      {t('settings.advanced.clearCache.help6', 'This will NOT delete:')}
      <ul>
        <li>{t('settings.advanced.clearCache.help7', 'Store login')}</li>
        <li>{t('settings.advanced.clearCache.help8', 'Installed games')}</li>
        <li>{t('settings.advanced.clearCache.help9', 'Games settings')}</li>
        <li>
          {t('settings.advanced.clearCache.help10', 'Heroic configuration')}
        </li>
      </ul>
    </>
  )

  return (
    <SettingRow
      label={t('settings.advanced.title.clearCache', 'Clear Cache')}
      labelAfter={
        <InfoTooltip
          content={details}
          label={t('settings.advanced.title.clearCache', 'Clear Cache')}
        />
      }
      description={t(
        'settings.advanced.clearCache.description',
        'Drops the cached game and store data so Heroic fetches it again. Your games, logins and settings are kept.'
      )}
    >
      <Button
        variant="dangerSubtle"
        icon={<Icon glyph={Brush} size="md" />}
        onClick={async () => clearHeroicCache()}
      >
        {t('settings.clear-cache', 'Clear Heroic Cache')}
      </Button>
    </SettingRow>
  )
}

export default ClearCache
