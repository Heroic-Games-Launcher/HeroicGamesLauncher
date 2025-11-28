import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField, ToggleSwitch, InfoBox } from 'frontend/components/UI'
import { UpdateComponent } from 'frontend/components/UI'

interface RestPlugin {
  id: string
  config?: {
    id: string
    enabled: boolean
    baseUrl: string
    token?: string
    username?: string
    lastSync?: number
  }
}

export default function RestPluginsSettings() {
  const { t } = useTranslation()
  const [plugins, setPlugins] = useState<RestPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [newPluginUrl, setNewPluginUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlugins()
  }, [])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      const result = await window.api.getRestPlugins()
      setPlugins(result)
    } catch (err) {
      console.error('Failed to load REST plugins:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlugin = async () => {
    if (!newPluginUrl.trim()) {
      setError('Please enter a plugin URL')
      return
    }

    try {
      setAdding(true)
      setError(null)
      await window.api.addRestPlugin(newPluginUrl.trim())
      setNewPluginUrl('')
      await loadPlugins()
      // Refresh library to load games from new plugin
      await window.api.refreshRestLibrary()
      await window.api.refreshLibrary('rest')
    } catch (err) {
      setError(`Failed to add plugin: ${err}`)
    } finally {
      setAdding(false)
    }
  }

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    // TODO: Implement enable/disable functionality
    console.log(`Toggle plugin ${pluginId} to ${enabled}`)
    await loadPlugins()
  }

  const handleRefreshLibrary = async () => {
    try {
      await window.api.refreshRestLibrary()
      await window.api.refreshLibrary('rest')
    } catch (err) {
      setError(`Failed to refresh library: ${err}`)
    }
  }

  if (loading) {
    return <UpdateComponent />
  }

  return (
    <div className="settingRow">
      <div className="settingRowContent">
        <span className="settingLabel">
          {t('settings.rest-plugins.title', 'REST API Plugins')}
        </span>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <TextInputField
            htmlId="new-plugin-url"
            value={newPluginUrl}
            onChange={(newValue) => setNewPluginUrl(newValue)}
            placeholder={t(
              'settings.rest-plugins.url-placeholder',
              'https://example.com/plugin'
            )}
            style={{ flex: 1 }}
          />
          <button
            className="button is-primary"
            onClick={handleAddPlugin}
            disabled={adding || !newPluginUrl.trim()}
          >
            {adding
              ? t('settings.rest-plugins.adding', 'Adding...')
              : t('settings.rest-plugins.add', 'Add Plugin')}
          </button>
        </div>

        <InfoBox text="infobox.help">
          {t(
            'settings.rest-plugins.description',
            'Add and manage REST API-based game store plugins. Plugins must expose a manifest.json file at the base URL.'
          )}
        </InfoBox>

        {plugins.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>
              {t('settings.rest-plugins.installed', 'Installed Plugins')}
            </h4>
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{plugin.id}</div>
                  {plugin.config?.baseUrl && (
                    <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                      {plugin.config.baseUrl}
                    </div>
                  )}
                </div>
                <ToggleSwitch
                  htmlId={`plugin-${plugin.id}`}
                  value={plugin.config?.enabled ?? false}
                  handleChange={(enabled) =>
                    handleTogglePlugin(plugin.id, enabled)
                  }
                  title={t('settings.rest-plugins.enable', 'Enable')}
                />
              </div>
            ))}
          </div>
        )}

        {plugins.length > 0 && (
          <button
            className="button is-secondary"
            onClick={handleRefreshLibrary}
            style={{ marginTop: '1rem' }}
          >
            {t('settings.rest-plugins.refresh', 'Refresh Library')}
          </button>
        )}
      </div>
    </div>
  )
}

