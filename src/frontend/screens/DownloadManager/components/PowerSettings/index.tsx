import './index.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import { AppSettings } from 'common/types'

type AfterDownloadAction = AppSettings['afterDownloadAction']

export default function PowerSettings() {
  const { t } = useTranslation()
  const [afterDownloadAction, setAfterDownloadAction] =
    useState<AfterDownloadAction>('none')

  useEffect(() => {
    void window.api.requestAppSettings().then(({ afterDownloadAction }) => {
      setAfterDownloadAction(afterDownloadAction)
    })
  }, [])

  const updateAction = (value: AfterDownloadAction) => {
    setAfterDownloadAction(value)
    window.api.setSetting({
      appName: 'default',
      key: 'afterDownloadAction',
      value
    })
  }

  return (
    <div className="powerSettings">
      <div className="powerSettingsAction">
        <ToggleSwitch
          htmlId="afterDownloadActionEnabled"
          value={afterDownloadAction !== 'none'}
          handleChange={() =>
            updateAction(afterDownloadAction === 'none' ? 'suspend' : 'none')
          }
          title={t(
            'download-manager.post-action.enable',
            'What to do after finishing the download'
          )}
        />
        {afterDownloadAction !== 'none' && (
          <SelectField
            htmlId="afterDownloadAction"
            value={afterDownloadAction}
            onChange={(e: SelectChangeEvent) =>
              updateAction(e.target.value as AfterDownloadAction)
            }
          >
            <MenuItem value="suspend">
              {t('download-manager.post-action.suspend', 'Suspend')}
            </MenuItem>
            <MenuItem value="shutdown">
              {t('download-manager.post-action.shutdown', 'Shutdown')}
            </MenuItem>
          </SelectField>
        )}
      </div>
      <button
        className="button is-text"
        onClick={() => void window.api.turnOffScreen()}
      >
        {t('download-manager.screen-off', 'Turn Off Screen')}
      </button>
    </div>
  )
}
