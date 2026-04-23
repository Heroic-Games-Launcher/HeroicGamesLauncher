import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { ExperimentalFeatures as IExperimentalFeatures } from 'common/types'

const ExperimentalFeatures = () => {
  const FEATURES: (keyof IExperimentalFeatures)[] = [
    'enableHelp',
    'cometSupport',
    'zoomPlatform'
  ]

  const { t } = useTranslation()
  const [experimentalFeatures, setExperimentalFeatures] = useSetting(
    'experimentalFeatures',
    {
      enableHelp: false,
      cometSupport: true,
      zoomPlatform: false
    }
  )
  const {
    handleExperimentalFeatures,
    epic,
    gog,
    amazon,
    zoom,
    sideloadedLibrary
  } = useContext(ContextProvider)
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [exportMessage, setExportMessage] = useState('')

  const toggleFeature = (feature: keyof IExperimentalFeatures) => {
    const newFeatures = {
      ...experimentalFeatures,
      [feature]: !experimentalFeatures[feature]
    }
    setExperimentalFeatures(newFeatures) // update settings
    handleExperimentalFeatures(newFeatures) // update global state
  }

  const handleExportLibrary = async () => {
    setExportStatus('loading')
    setExportMessage('')

    try {
      const filePath = await window.api.saveDialog({
        title: t(
          'setting.experimental_features.exportLibrary.selectFolder',
          'Select location to save library export'
        ),
        defaultPath: `heroic_library_${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })

      if (!filePath) {
        setExportStatus('idle')
        return
      }

      // Collect all games from frontend state
      const allGames = [
        ...epic.library,
        ...gog.library,
        ...amazon.library,
        ...zoom.library,
        ...sideloadedLibrary
      ]

      const result = await window.api.exportLibrary({
        filePath,
        games: allGames
      })

      if (result.success) {
        setExportStatus('success')
        setExportMessage(
          t(
            'setting.experimental_features.exportLibrary.success',
            'Library exported to: {{path}}',
            { path: result.filePath }
          )
        )
      } else {
        setExportStatus('error')
        setExportMessage(
          t(
            'setting.experimental_features.exportLibrary.error',
            'Export failed: {{error}}',
            { error: result.error }
          )
        )
      }
    } catch (err: unknown) {
      setExportStatus('error')
      setExportMessage((err as Error).message || 'An error occurred during export')
    }

    setTimeout(() => {
      setExportStatus('idle')
      setExportMessage('')
    }, 5000)
  }

  /*
    Translations:
    t('setting.experimental_features.enableNewDesign', 'New design')
    t('setting.experimental_features.enableHelp', 'Help component')
    t('setting.experimental_features.cometSupport', 'Comet support')
    t('setting.experimental_features.zoomPlatform', 'Zoom Platform support (only Linux)')
  */

  return (
    <>
      <h3>
        {t('settings.experimental_features.title', 'Experimental Features')}
      </h3>
      {FEATURES.map((feature) => {
        return (
          <div key={feature}>
            <ToggleSwitch
              htmlId={feature}
              value={experimentalFeatures[feature]}
              handleChange={() => toggleFeature(feature)}
              title={t(`setting.experimental_features.${feature}`, feature)}
            />
          </div>
        )
      })}
      <div className="exportLibraryWrapper">
        <button
          id="export-library-button"
          className={`button outline ${exportStatus === 'loading' ? 'is-loading' : ''}`}
          onClick={handleExportLibrary}
          disabled={exportStatus === 'loading'}
        >
          {exportStatus === 'loading'
            ? t(
                'setting.experimental_features.exportLibrary.exporting',
                'Exporting...'
              )
            : t(
                'setting.experimental_features.exportLibrary.button',
                'Export Library'
              )}
        </button>
        {exportMessage && (
          <p
            className={`exportLibraryMessage exportLibraryMessage--${exportStatus}`}
          >
            {exportMessage}
          </p>
        )}
      </div>
    </>
  )
}

export default ExperimentalFeatures
