import './index.scss'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import { useTranslation } from 'react-i18next'
import {
  amazonLoginPath,
  epicLoginPath,
  gogLoginPath,
  zoomLoginPath
} from '../..'
import { useNavigate } from 'react-router-dom'
import Button from 'frontend/components/UI/Button'

interface LoginWarningProps {
  warnLoginForStore: null | 'epic' | 'gog' | 'amazon' | 'zoom'
  onClose: () => void
}

const LoginWarning = function ({
  warnLoginForStore,
  onClose
}: LoginWarningProps) {
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()

  if (!warnLoginForStore) {
    return null
  }

  let textContent = ''
  let loginPath = ''
  if (warnLoginForStore === 'epic') {
    textContent = t(
      'not_logged_in.epic',
      "You are not logged in with an Epic account in Heroic. Don't use the store page to login, click the following button instead:"
    )
    loginPath = epicLoginPath
  } else if (warnLoginForStore === 'gog') {
    textContent = t(
      'not_logged_in.gog',
      "You are not logged in with a GOG account in Heroic. Don't use the store page to login, click the following button instead:"
    )
    loginPath = gogLoginPath
  } else if (warnLoginForStore === 'amazon') {
    textContent = t(
      'not_logged_in.amazon',
      "You are not logged in with an Amazon account in Heroic. Don't use the store page to login, click the following button instead:"
    )
    loginPath = amazonLoginPath
  } else if (warnLoginForStore === 'zoom') {
    textContent = t(
      'not_logged_in.zoom',
      "You are not logged in with a Zoom account in Heroic. Don't use the store page to login, click the following button instead:"
    )
    loginPath = zoomLoginPath
  }

  return (
    <Modal
      onClose={onClose}
      size="sm"
      className="notLoggedIn"
      showCloseButton={true}
    >
      <ModalHeader>
        {t('not_logged_in.title', 'You are NOT logged in')}
      </ModalHeader>
      <ModalContent>
        <p>{textContent}</p>
        <Button
          className="notLoggedIn__loginButton"
          onClick={() => {
            onClose()
            navigate(loginPath)
          }}
        >
          {t('not_logged_in.login', 'Log in')}
        </Button>
      </ModalContent>
    </Modal>
  )
}

export default LoginWarning
