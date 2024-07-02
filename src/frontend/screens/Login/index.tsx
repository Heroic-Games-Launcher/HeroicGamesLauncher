import React, { useState } from 'react'
import './index.scss'
import Runner from './components/Runner'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import EpicLogo from 'frontend/assets/epic-logo.svg?react'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import HeroicLogo from 'frontend/assets/heroic-icon.svg?react'
import AmazonLogo from 'frontend/assets/amazon-logo.svg?react'

import { LanguageSelector } from '../../components/UI'
import { FlagPosition } from '../../components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'
import { useAwaited } from '../../hooks/useAwaited'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

export const epicLoginPath = '/loginweb/legendary'
export const gogLoginPath = '/loginweb/gog'
export const amazonLoginPath = '/loginweb/nile'

export default React.memo(function NewLogin() {
  const { t } = useTranslation()
  const {
    refreshLibrary,
    epicUsername,
    epicLogout,
    gogUsername,
    gogLogout,
    amazonUsername,
    amazonUserId,
    amazonLogout
  } = useShallowGlobalState(
    'refreshLibrary',
    'epicUsername',
    'epicLogout',
    'gogUsername',
    'gogLogout',
    'amazonUserId',
    'amazonUsername',
    'amazonLogout'
  )

  hasHelp(
    'login',
    t('help.title.login', 'Login'),
    <p>{t('help.content.login', 'Log in into the different stores.')}</p>
  )

  const navigate = useNavigate()
  const [showSidLogin, setShowSidLogin] = useState(false)

  const systemInfo = useAwaited(window.api.systemInfo.get)

  let oldMac = false
  let oldMacMessage = ''
  if (systemInfo?.OS.platform === 'darwin') {
    const version = parseInt(systemInfo.OS.version.split('.')[0])
    if (version < 12) {
      oldMac = true
      oldMacMessage = t(
        'login.old-mac',
        'Your macOS version is {{version}}. macOS 12 or newer is required to log in.',
        { version: systemInfo.OS.version }
      )
    }
  }

  const loginMessage = t(
    'login.message',
    'Login with your platform. You can login to more than one platform at the same time.'
  )

  async function handleLibraryClick() {
    await refreshLibrary({ runInBackground: false })
    navigate('/')
  }

  return (
    <div className="loginPage">
      {showSidLogin && (
        <SIDLogin
          backdropClick={() => {
            setShowSidLogin(false)
          }}
        />
      )}
      <div className="loginBackground"></div>

      <div className="loginContentWrapper">
        <div className="runnerList">
          <div className="runnerHeader">
            <HeroicLogo className="runnerHeaderIcon" />
            <div className="runnerHeaderText">
              <h1 className="title">Heroic</h1>
              <h2 className="subtitle">Games Launcher</h2>
            </div>

            {
              <LanguageSelector
                flagPossition={FlagPosition.PREPEND}
                showWeblateLink={true}
              />
            }
          </div>

          <p className="runnerMessage">{loginMessage}</p>
          {oldMac && <p className="disabledMessage">{oldMacMessage}</p>}

          <div className="runnerGroup">
            <Runner
              class="epic"
              buttonText={t('login.epic', 'Epic Games Login')}
              loginUrl={epicLoginPath}
              icon={() => <EpicLogo />}
              isLoggedIn={!!epicUsername}
              user={epicUsername}
              logoutAction={epicLogout}
              alternativeLoginAction={() => {
                setShowSidLogin(true)
              }}
              disabled={oldMac}
            />
            <Runner
              class="gog"
              buttonText={t('login.gog', 'GOG Login')}
              icon={() => <GOGLogo />}
              loginUrl={gogLoginPath}
              isLoggedIn={!!gogUsername}
              user={gogUsername}
              logoutAction={gogLogout}
              disabled={oldMac}
            />
            <Runner
              class="nile"
              buttonText={t('login.amazon', 'Amazon Login')}
              icon={() => <AmazonLogo />}
              loginUrl={amazonLoginPath}
              isLoggedIn={!!amazonUserId}
              user={amazonUsername || 'Unknown'}
              logoutAction={amazonLogout}
              disabled={oldMac}
            />
          </div>
        </div>
        <button
          onClick={async () => handleLibraryClick()}
          className="goToLibrary"
        >
          {t('button.go_to_library', 'Go to Library')}
        </button>
      </div>
    </div>
  )
})
