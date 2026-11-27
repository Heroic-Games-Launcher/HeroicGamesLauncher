import { useTranslation } from 'react-i18next'
import Button from 'frontend/components/UI/Button'
import {
  closeStoreStatusWarning,
  useStoreStatusWarning
} from 'frontend/state/StoreStatusWarning'
import 'frontend/screens/Login/components/SIDLogin/index.css'
import 'frontend/screens/Login/components/SteamLogin/index.css'
import './index.css'

/**
 * Warning before using abandoned games
 */
export default function StoreStatusWarning() {
  const { t } = useTranslation('gamepage')
  const gameInfo = useStoreStatusWarning((state) => state.gameInfo)

  if (!gameInfo) return null

  return (
    <div className="SIDLoginModal">
      <span className="backdrop"></span>
      <div
        className="sid-modal steam-notice-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="store-status-warning-title"
      >
        <div className="loginInstructions">
          <strong id="store-status-warning-title">
            {t('store_status_warning.title', 'Attention')}
          </strong>
          <p>
            {t(
              'store_status_warning.text',
              '{{title}} has been abandoned by Steam and its developer.\n\nOnline features may not work, and the game itself may not run.',
              { title: gameInfo.title }
            )}
          </p>
        </div>
        <div className="storeStatusWarning__buttons">
          <Button
            variant="secondary"
            onClick={() => closeStoreStatusWarning(false)}
          >
            {t('store_status_warning.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            autoFocus
            onClick={() => closeStoreStatusWarning(true)}
          >
            {t('store_status_warning.agree', 'I Agree')}
          </Button>
        </div>
      </div>
    </div>
  )
}
