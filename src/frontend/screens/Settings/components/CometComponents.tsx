import { CachedOutlined } from '@mui/icons-material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CometComponents = () => {
  const { t } = useTranslation()

  const [isUpdating, setUpdating] = useState(false)

  async function updateCometComponents() {
    if (isUpdating) return

    setUpdating(true)
    await window.api.updateCometComponents().finally(() => setUpdating(false))
  }

  return (
    <>
      <h3>{t('setting.gog.overlay', 'GOG Overlay')}</h3>

      <div className="footerFlex">
        <button className="button is-primary" onClick={updateCometComponents}>
          <CachedOutlined />
          <span>
            {isUpdating
              ? t('setting.eosOverlay.updating', 'Updating...')
              : t('setting.eosOverlay.checkForUpdates', 'Check for updates')}
          </span>
        </button>
      </div>
    </>
  )
}

export default CometComponents
