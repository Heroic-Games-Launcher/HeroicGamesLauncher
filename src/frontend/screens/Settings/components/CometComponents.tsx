import { CachedOutlined } from '@mui/icons-material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CometComponents = () => {
  const { t } = useTranslation()

  const [isUpdating, setUpdating] = useState(false)

  async function updateCometComponents() {
    setUpdating(true)
    await window.api.updateCometComponents()
    setUpdating(false)
  }

  return (
    <>
      <h3>{t('setting.comet.components', 'Comet Components')}</h3>

      <div className="footerFlex">
        <button className="button is-primary" onClick={updateCometComponents}>
          <CachedOutlined />
          <span>
            {isUpdating
              ? t('status.updating', 'Updating')
              : t('setting.eosOverlay.checkForUpdates', 'Check for updates')}
          </span>
        </button>
      </div>
    </>
  )
}

export default CometComponents
