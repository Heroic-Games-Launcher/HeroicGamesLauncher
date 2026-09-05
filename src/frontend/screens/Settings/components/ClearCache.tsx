import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { CleaningServicesOutlined } from '@mui/icons-material'

const ClearCache = () => {
  const { refreshLibrary } = useContext(ContextProvider)
  const { t } = useTranslation()

  async function clearHeroicCache() {
    const storage: Storage = window.localStorage
    storage.removeItem('updates')
    window.api.clearCache(true)
    return refreshLibrary({ runInBackground: true })
  }

  async function clearImagesCacheOnly() {
    await window.api.clearImagesCache()
    refreshLibrary({ runInBackground: true })
  }

  return (
    <>
      <h3 className="settingSubheader">
        {t('settings.advanced.title.clearCache', 'Clear Cache')}
      </h3>
      <InfoBox text={t('settings.advanced.details', 'Details')}>
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
        {t(
          'settings.advanced.clearCache.helpImages',
          'A separate button below clears only the downloaded game cover artwork cache, forcing pristine re-downloads with rate limiting.'
        )}
      </InfoBox>
      <button
        className="button is-footer is-danger"
        onClick={async () => clearHeroicCache()}
      >
        <div className="button-icontext-flex">
          <div className="button-icon-flex">
            <CleaningServicesOutlined />
          </div>
          <span className="button-icon-text">
            {t('settings.clear-cache', 'Clear Heroic Cache')}
          </span>
        </div>
      </button>
      <button
        className="button is-footer is-danger"
        onClick={async () => clearImagesCacheOnly()}
      >
        <div className="button-icontext-flex">
          <div className="button-icon-flex">
            <CleaningServicesOutlined />
          </div>
          <span className="button-icon-text">
            {t(
              'settings.clear-images-cache',
              'Clear Images Cache (Re-download covers)'
            )}
          </span>
        </div>
      </button>
    </>
  )
}

export default ClearCache
