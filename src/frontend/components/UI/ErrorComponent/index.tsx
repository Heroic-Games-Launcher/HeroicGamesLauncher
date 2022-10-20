import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { faHeartCrack, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { CleaningServicesOutlined, DeleteOutline } from '@mui/icons-material'
import './index.css'
import ContextProvider from 'frontend/state/ContextProvider'

export default function ErrorComponent({ message }: { message: string }) {
  const { t } = useTranslation()
  const { refreshLibrary, showResetDialog } = useContext(ContextProvider)

  return (
    <div className="errorComponent">
      <FontAwesomeIcon icon={faHeartCrack} />
      <span className="errorText">{message}</span>
      <span className="buttonsWrapper">
        <button
          className="button is-footer"
          onClick={async () =>
            refreshLibrary({
              checkForUpdates: true,
              fullRefresh: true,
              runInBackground: false
            })
          }
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <FontAwesomeIcon className="refreshIcon" icon={faSyncAlt} />
            </div>
            <span className="button-icon-text">
              {t('generic.library.refresh', 'Refresh Library')}
            </span>
          </div>
        </button>

        <button
          className="button is-footer is-danger"
          onClick={window.api.clearCache}
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
          onClick={showResetDialog}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <DeleteOutline />
            </div>
            <span className="button-icon-text">
              {t('settings.reset-heroic', 'Reset Heroic')}
            </span>
          </div>
        </button>
      </span>
    </div>
  )
}
