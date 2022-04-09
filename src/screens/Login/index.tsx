import React, { useContext, useEffect, useState } from 'react'
import './index.css'
import EpicLogo from '../../assets/epic-logo.svg'
import Runner from './components/Runner'
import ElectronStore from 'electron-store'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { useHistory } from 'react-router'

import ContextProvider from 'src/state/ContextProvider'
import GOGLogo from 'src/assets/gog-logo.svg'
import { LanguageSelector, UpdateComponent } from 'src/components/UI'
import { FlagPosition } from 'src/components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'

const { ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')

const storage: Storage = window.localStorage
export default function NewLogin() {
  const { t, i18n } = useTranslation()
  const currentLanguage = i18n.language
  const handleChangeLanguage = (language: string) => {
    storage.setItem('language', language)
    i18n.changeLanguage(language)
  }
  const history = useHistory()
  const { refreshLibrary, handleCategory } = useContext(ContextProvider)
  const [epicLogin, setEpicLogin] = useState({})
  const [gogLogin, setGOGLogin] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)

  function refreshUserInfo() {
    const configStore: ElectronStore = new Store({
      cwd: 'store'
    })
    const gogStore: ElectronStore = new Store({
      cwd: 'gog_store'
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEpicLogin(configStore.get('userInfo') as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGOGLogin(gogStore.get('userData') as any)
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
  async function continueLogin() {
    setLoading(true)
    await refreshLibrary({
      fullRefresh: true,
      runInBackground: false
    })
    //Make sure we cannot get to library that we can't see
    handleCategory(epicLogin ? 'epic' : 'gog')
    setLoading(false)
    history.push('/')
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
            icon={() => <img src={EpicLogo} />}
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
            icon={() => <img src={GOGLogo} />}
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
        <button
          onClick={continueLogin}
          className={cx('continueLogin', {
            ['disabled']: !epicLogin && !gogLogin
          })}
        >
          {t('button.continue', 'Continue')}
        </button>
      </div>
    </div>
  )
}
