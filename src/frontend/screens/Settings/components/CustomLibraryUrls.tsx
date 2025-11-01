import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { InfoBox, TextInputField, SvgButton } from 'frontend/components/UI'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import useSetting from 'frontend/hooks/useSetting'
import './CustomLibraryUrls.css'

const CustomLibraryUrls = () => {
  const { t } = useTranslation()
  const [customLibraryUrls, setCustomLibraryUrls] = useSetting(
    'customLibraryUrls',
    []
  )
  const [customLibraryConfigs, setCustomLibraryConfigs] = useSetting(
    'customLibraryConfigs',
    []
  )
  const [newUrl, setNewUrl] = useState('')
  const [newJsonConfig, setNewJsonConfig] = useState('')

  const addUrl = () => {
    if (newUrl.trim() && newUrl.match(/^https?:\/\/.+/)) {
      setCustomLibraryUrls([...customLibraryUrls, newUrl.trim()])
      setNewUrl('')
    }
  }

  const removeUrl = (index: number) => {
    const updated = customLibraryUrls.filter((_, i) => i !== index)
    setCustomLibraryUrls(updated)
  }

  const updateUrl = (index: number, value: string) => {
    const updated = [...customLibraryUrls]
    updated[index] = value
    setCustomLibraryUrls(updated)
  }

  const addJsonConfig = () => {
    if (newJsonConfig.trim()) {
      try {
        // Validate JSON
        JSON.parse(newJsonConfig.trim())
        setCustomLibraryConfigs([...customLibraryConfigs, newJsonConfig.trim()])
        setNewJsonConfig('')
      } catch (error) {
        // Handle invalid JSON - you might want to show an error message
        console.error('Invalid JSON:', error)
      }
    }
  }

  const removeJsonConfig = (index: number) => {
    const updated = customLibraryConfigs.filter((_, i) => i !== index)
    setCustomLibraryConfigs(updated)
  }

  const updateJsonConfig = (index: number, value: string) => {
    const updated = [...customLibraryConfigs]
    updated[index] = value
    setCustomLibraryConfigs(updated)
  }

  const customLibraryUrlsInfo = (
    <InfoBox text="infobox.help">
      {t(
        'options.custom_library_urls.info',
        'Add URLs to JSON files containing custom game libraries, or paste JSON content directly. The library name will be taken from the JSON file.'
      )}
      <br />
      {t(
        'options.custom_library_urls.example',
        'Example URL: https://example.com/my-games-library.json'
      )}
    </InfoBox>
  )

  return (
    <div className="Field">
      <label>
        {t('options.custom_library_urls.title', 'Custom Libraries')}
      </label>

      {customLibraryUrlsInfo}

      {/* URLs Section */}
      <h4>{t('options.custom_library_urls.urls', 'Library URLs')}</h4>

      {/* Existing URLs */}
      {customLibraryUrls.map((url: string, index: number) => (
        <div key={index} className="customLibraryUrl">
          <TextInputField
            htmlId={`customLibraryUrl-${index}`}
            value={url}
            onChange={(value) => updateUrl(index, value)}
            placeholder="https://example.com/library.json"
            extraClass="customLibraryUrlInput"
          />
          <SvgButton onClick={() => removeUrl(index)} className="removeButton">
            <RemoveCircleIcon />
          </SvgButton>
        </div>
      ))}

      {/* Add new URL */}
      <div className="customLibraryUrl addNew">
        <TextInputField
          htmlId="newCustomLibraryUrl"
          value={newUrl}
          onChange={setNewUrl}
          placeholder="https://example.com/library.json"
          extraClass="customLibraryUrlInput"
          onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && addUrl()}
        />
        <SvgButton onClick={addUrl} className="addButton">
          <AddBoxIcon />
        </SvgButton>
      </div>

      {/* JSON Configs Section */}
      <h4>
        {t('options.custom_library_urls.configs', 'Direct JSON Configurations')}
      </h4>

      {/* Existing JSON configs */}
      {customLibraryConfigs.map((config: string, index: number) => (
        <div key={index} className="customLibraryConfig">
          <textarea
            id={`customLibraryConfig-${index}`}
            value={config}
            onChange={(e) => updateJsonConfig(index, e.target.value)}
            placeholder='{"name": "My Library", "games": [...]}'
            className="customLibraryConfigTextarea"
            rows={4}
          />
          <SvgButton
            onClick={() => removeJsonConfig(index)}
            className="removeButton"
          >
            <RemoveCircleIcon />
          </SvgButton>
        </div>
      ))}

      {/* Add new JSON config */}
      <div className="customLibraryConfig addNew">
        <textarea
          id="newCustomLibraryConfig"
          value={newJsonConfig}
          onChange={(e) => setNewJsonConfig(e.target.value)}
          placeholder='{"name": "My Library", "games": [...]}'
          className="customLibraryConfigTextarea"
          rows={4}
        />
        <SvgButton onClick={addJsonConfig} className="addButton">
          <AddBoxIcon />
        </SvgButton>
      </div>
    </div>
  )
}

export default CustomLibraryUrls
