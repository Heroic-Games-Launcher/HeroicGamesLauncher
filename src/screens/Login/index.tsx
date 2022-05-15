import React, { useContext, useEffect, useState } from 'react'
import './index.css'
import EpicLogo from '../../assets/epic-logo.svg'
import Runner from './components/Runner'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import GOGLogo from 'src/assets/gog-logo.svg'
import { LanguageSelector, UpdateComponent } from 'src/components/UI'
import { FlagPosition } from 'src/components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'
import ContextProvider from 'src/state/ContextProvider'

export default function NewLogin() {
  const { epic, gog } = useContext(ContextProvider)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [epic, gog])

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
        {!loading && <LanguageSelector flagPossition={FlagPosition.PREPEND} />}
        <div className="runnerList">
          <Runner
            class="epic"
            loginUrl="/loginweb/legendary"
            icon={() => <img src={EpicLogo} alt="Epic" />}
            isLoggedIn={Boolean(epic.username)}
            user={epic.username}
            logoutAction={epic.logout}
            alternativeLoginAction={() => {
              setShowSidLogin(true)
            }}
          />
          <Runner
            class="gog"
            icon={() => <img src={GOGLogo} alt="GOG" />}
            loginUrl="/loginweb/gog"
            isLoggedIn={Boolean(gog.username)}
            user={gog.username}
            logoutAction={gog.logout}
          />
        </div>
        {(epic.username || gog.username) && (
          <button onClick={() => navigate('/')} className="goToLibrary">
            {t('button.go_to_library', 'Go to Library')}
          </button>
        )}
      </div>
    </div>
  )
}
