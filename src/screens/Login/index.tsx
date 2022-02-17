import React, { useContext, useEffect, useState } from 'react'
import './index.css'
import EpicLogo from '../../assets/epic-logo.svg'
import Runner from './components/Runner'
import ElectronStore from 'electron-store'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { useHistory } from 'react-router'

import ContextProvider from 'src/state/ContextProvider'
import { LanguageSelector, UpdateComponent } from 'src/components/UI'
import { FlagPosition } from 'src/components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'

const { ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')

const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const gogStore: ElectronStore = new Store({
  cwd: 'gog_store'
})
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEpicLogin(configStore.get('userInfo') as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGOGLogin(gogStore.get('userData') as any)
  }
  useEffect(() => {
    refreshUserInfo()
    setLoading(false)
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
            logoutAction={() => ipcRenderer.invoke('logoutLegendary')}
            alternativeLoginAction={() => {
              setShowSidLogin(true)
            }}
          />
          <Runner
            class="gog"
            icon={GOGLogo}
            loginUrl="/login/gog"
            isLoggedIn={Boolean(gogLogin)}
            user={gogLogin}
            refresh={refreshUserInfo}
            logoutAction={() => ipcRenderer.invoke('logoutGOG')}
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

function GOGLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fill: 'white' }}
    >
      <use xlinkHref="#icon-logo-gog">
        <symbol
          preserveAspectRatio="xMidYMax meet"
          viewBox="0 0 34 31"
          id="icon-logo-gog"
        >
          <path
            className="cls-1"
            d="M31,31H3a3,3,0,0,1-3-3V3A3,3,0,0,1,3,0H31a3,3,0,0,1,3,3V28A3,3,0,0,1,31,31ZM4,24.5A1.5,1.5,0,0,0,5.5,26H11V24H6.5a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5H11V18H5.5A1.5,1.5,0,0,0,4,19.5Zm8-18A1.5,1.5,0,0,0,10.5,5h-5A1.5,1.5,0,0,0,4,6.5v5A1.5,1.5,0,0,0,5.5,13H9V11H6.5a.5.5,0,0,1-.5-.5v-3A.5.5,0,0,1,6.5,7h3a.5.5,0,0,1,.5.5v6a.5.5,0,0,1-.5.5H4v2h6.5A1.5,1.5,0,0,0,12,14.5Zm0,13v5A1.5,1.5,0,0,0,13.5,26h5A1.5,1.5,0,0,0,20,24.5v-5A1.5,1.5,0,0,0,18.5,18h-5A1.5,1.5,0,0,0,12,19.5Zm9-13A1.5,1.5,0,0,0,19.5,5h-5A1.5,1.5,0,0,0,13,6.5v5A1.5,1.5,0,0,0,14.5,13h5A1.5,1.5,0,0,0,21,11.5Zm9,0A1.5,1.5,0,0,0,28.5,5h-5A1.5,1.5,0,0,0,22,6.5v5A1.5,1.5,0,0,0,23.5,13H27V11H24.5a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v6a.5.5,0,0,1-.5.5H22v2h6.5A1.5,1.5,0,0,0,30,14.5ZM30,18H22.5A1.5,1.5,0,0,0,21,19.5V26h2V20.5a.5.5,0,0,1,.5-.5h1v6h2V20H28v6h2ZM18.5,11h-3a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v3A.5.5,0,0,1,18.5,11Zm-4,9h3a.5.5,0,0,1,.5.5v3a.5.5,0,0,1-.5.5h-3a.5.5,0,0,1-.5-.5v-3A.5.5,0,0,1,14.5,20Z"
          ></path>
        </symbol>
      </use>
    </svg>
  )
}
