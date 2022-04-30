import React, { useEffect, useState } from 'react'
import './index.css'
import EpicLogo from '../../assets/epic-logo.svg'
import Runner from './components/Runner'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import GOGLogo from 'src/assets/gog-logo.svg'
import { LanguageSelector, UpdateComponent } from 'src/components/UI'
import { FlagPosition } from 'src/components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'
import { configStore, gogConfigStore } from 'src/helpers/electronStores'

const { ipcRenderer } = window.require('electron')

const storage: Storage = window.localStorage
export default function NewLogin() {
  const { t, i18n } = useTranslation()
  const currentLanguage = i18n.language
  const handleChangeLanguage = (language: string) => {
    storage.setItem('language', language)
    i18n.changeLanguage(language)
  }
  const navigate = useNavigate()
  const [epicLogin, setEpicLogin] = useState({})
  const [gogLogin, setGOGLogin] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)

  function refreshUserInfo() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEpicLogin(configStore.get('userInfo') as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGOGLogin(gogConfigStore.get('userData') as any)
  }

  function eventHandler() {
    setTimeout(refreshUserInfo, 1000)
    console.log('Caught signal')
  }

  useEffect(() => {
    refreshUserInfo()
    setLoading(false)
    ipcRenderer.on('updateLoginState', () => eventHandler)
    return () => {
      ipcRenderer.removeListener('updateLoginState', () => eventHandler)
    }
  }, [])

  return (
    <div className="loginPage">
      {loading && (
        <div>
          <UpdateComponent />
        </div>
      )}
      {showSidLogin && (
        <SIDLogin
          refresh={refreshUserInfo}
          backdropClick={() => {
            setShowSidLogin(false)
          }}
        />
      )}
      <div className="loginBackground"></div>

      <div className="loginContentWrapper">
        {!loading && (
          <LanguageSelector
            className="settingSelect language-login"
            handleLanguageChange={handleChangeLanguage}
            currentLanguage={currentLanguage}
            flagPossition={FlagPosition.PREPEND}
          />
        )}
        <div className="runnerList">
          <Runner
            class="epic"
            loginUrl="/login/legendary"
            icon={() => <img src={EpicLogo} alt="Epic" />}
            isLoggedIn={Boolean(epicLogin)}
            user={epicLogin}
            refresh={refreshUserInfo}
            logoutAction={() => {
              ipcRenderer.invoke('logoutLegendary')
              console.log('Logging out')
              window.location.reload()
            }}
            alternativeLoginAction={() => {
              setShowSidLogin(true)
            }}
          />
          <Runner
            class="gog"
            icon={() => <img src={GOGLogo} alt="GOG" />}
            loginUrl="/login/gog"
            isLoggedIn={Boolean(gogLogin)}
            user={gogLogin}
            refresh={refreshUserInfo}
            logoutAction={() => {
              ipcRenderer.invoke('logoutGOG')
              setGOGLogin({})
            }}
          />
        </div>
        {(epicLogin || gogLogin) && (
          <button onClick={() => navigate('/')} className="goToLibrary">
            {t('button.go_to_library', 'Go to Library')}
          </button>
        )}
      </div>
    </div>
  )
}
