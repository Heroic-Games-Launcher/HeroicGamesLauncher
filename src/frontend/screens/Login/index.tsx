import React, { useContext, useEffect, useState } from 'react'
import './index.scss'
import Runner from './components/Runner'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { ReactComponent as EpicLogo } from 'frontend/assets/epic-logo.svg'
import { ReactComponent as GOGLogo } from 'frontend/assets/gog-logo.svg'
import { ReactComponent as HeroicLogo } from 'frontend/assets/heroic-icon.svg'
import { ReactComponent as AmazonLogo } from 'frontend/assets/amazon-logo.svg'

import { LanguageSelector, UpdateComponent } from '../../components/UI'
import { FlagPosition } from '../../components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'
import ContextProvider from '../../state/ContextProvider'
import { Systeminformation } from 'systeminformation'

export const epicLoginPath = '/loginweb/legendary'
export const gogLoginPath = '/loginweb/gog'
export const amazonLoginPath = '/loginweb/nile'

export default React.memo(function NewLogin() {
  const { epic, gog, amazon, refreshLibrary } = useContext(ContextProvider)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)
  const [isEpicLoggedIn, setIsEpicLoggedIn] = useState(Boolean(epic.username))
  const [isGogLoggedIn, setIsGogLoggedIn] = useState(Boolean(gog.username))
  const [isAmazonLoggedIn, setIsAmazonLoggedIn] = useState(
    Boolean(amazon.user_id)
  )

  const [systemInfo, setSystemInfo] = useState<Systeminformation.OsData | null>(
    null
  )

  useEffect(() => {
    window.api.getOSInfo().then((info) => setSystemInfo(info))
  }, [])

  let oldMac = false
  let oldMacMessage = ''
  if (systemInfo?.platform === 'darwin') {
    const version = parseInt(systemInfo.release.split('.')[0])
    if (version < 12) {
      oldMac = true
      oldMacMessage = t(
        'login.old-mac',
        'Your macOS version is {{version}}. macOS 12 or newer is required to log in.',
        { version: systemInfo.release }
      )
    }
  }

  const loginMessage = t(
    'login.message',
    'Login with your platform. You can login to more than one platform at the same time.'
  )

  useEffect(() => {
    setLoading(false)
  }, [epic, gog])

  useEffect(() => {
    setIsEpicLoggedIn(Boolean(epic.username))
    setIsGogLoggedIn(Boolean(gog.username))
    setIsAmazonLoggedIn(Boolean(amazon.user_id))
  }, [epic.username, gog.username, amazon.user_id, t])

  async function handleLibraryClick() {
    await refreshLibrary({ runInBackground: false })
    navigate('/library')
  }

  return (
    <div className="loginPage">
      {loading && (
        <div>
          <UpdateComponent />
        </div>
      )}
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

            {!loading && (
              <LanguageSelector
                flagPossition={FlagPosition.PREPEND}
                showWeblateLink={true}
              />
            )}
          </div>

          <p className="runnerMessage">{loginMessage}</p>
          {oldMac && <p className="disabledMessage">{oldMacMessage}</p>}

          <div className="runnerGroup">
            <Runner
              class="epic"
              buttonText={t('login.epic', 'Epic Games Login')}
              loginUrl={epicLoginPath}
              icon={() => <EpicLogo />}
              isLoggedIn={isEpicLoggedIn}
              user={epic.username}
              logoutAction={epic.logout}
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
              isLoggedIn={isGogLoggedIn}
              user={gog.username}
              logoutAction={gog.logout}
              disabled={oldMac}
            />
            <Runner
              class="nile"
              buttonText={t('login.amazon', 'Amazon Login')}
              icon={() => <AmazonLogo />}
              loginUrl={amazonLoginPath}
              isLoggedIn={isAmazonLoggedIn}
              user={amazon.username || 'Unknown'}
              logoutAction={amazon.logout}
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
