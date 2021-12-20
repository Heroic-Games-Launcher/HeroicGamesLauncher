import './index.css'

import React, { useState } from 'react'

import { loginPage, sidInfoPage } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import LanguageSelector, {
  FlagPosition
} from 'src/components/UI/LanguageSelector'

import { Clipboard, IpcRenderer } from 'electron'
import Autorenew from '@material-ui/icons/Autorenew'
import Info from '@material-ui/icons/Info'
import logo from 'src/assets/heroic-icon.png'

const storage: Storage = window.localStorage

interface Props {
  refresh: (checkUpdates: boolean) => Promise<void>
}

export default function Login({ refresh }: Props) {
  const { t, i18n } = useTranslation('login')
  const { ipcRenderer, clipboard } = window.require('electron') as {
    ipcRenderer: IpcRenderer
    clipboard: Clipboard
  }

  const [input, setInput] = useState('')
  const [status, setStatus] = useState({
    loading: false,
    message: ''
  })
  const { loading, message } = status

  const handleChangeLanguage = (language: string) => {
    storage.setItem('language', language)
    i18n.changeLanguage(language)
  }

  const currentLanguage = i18n.language

  const handleLogin = async (sid: string) => {
    setStatus({
      loading: true,
      message: t('status.logging', 'Logging In...')
    })

    await ipcRenderer.invoke('login', sid).then(async (res) => {
      ipcRenderer.send('logInfo', 'Called Login')
      console.log(res)
      if (res !== 'error') {
        setStatus({
          loading: true,
          message: t('status.loading', 'Loading Game list, please wait')
        })
        await ipcRenderer.invoke('getUserInfo')
        await ipcRenderer.invoke('refreshLibrary', true)
        await ipcRenderer.invoke('refreshWineGE')
        return refresh(true)
      }

      setStatus({ loading: true, message: t('status.error', 'Error') })
      setTimeout(() => {
        setStatus({ ...status, loading: false })
      }, 2500)
    })
  }

  return (
    <div className="Login">
      <div className="aboutWrapper">
        <div className="aboutContainer">
          <div className="heroicLogo">
            <img className="logo" src={logo} width="50px" height="50px" />
            <div className="heroicText">
              <span className="heroicTitle">Heroic</span>
              <span className="heroicSubTitle">Games Launcher</span>
            </div>
          </div>
          <div className="loginInstructions">
            <strong>{t('welcome', 'Welcome!')}</strong>
            <p>
              {t(
                'message.part1',
                'In order for you to be able to log in and install your games, we first need you to follow the steps below:'
              )}
            </p>
            <ol>
              <li>
                {`${t('message.part2')} `}
                <span onClick={() => loginPage()} className="epicLink">
                  {t('message.part3')}
                </span>
                {`${t('message.part4')} `}
                <span onClick={() => sidInfoPage()} className="sid">
                  {`${t('message.part5')}`}
                  <Info
                    style={{ marginLeft: '4px' }}
                    className="material-icons"
                  />
                </span>
                .
              </li>
              <li>
                {`${t('message.part6')} `}
                <span onClick={() => sidInfoPage()} className="sid">
                  {`${t('message.part7')}`}
                </span>
                {` ${t('message.part8')}`}
              </li>
            </ol>
          </div>
        </div>
        <LanguageSelector
          handleLanguageChange={handleChangeLanguage}
          currentLanguage={currentLanguage}
          flagPossition={FlagPosition.PREPEND}
          className="settingSelect language-login"
        />
        <div className="loginBackground"></div>
      </div>
      <div className="loginFormWrapper">
        <div className="loginForm">
          <span className="pastesidtext">
            {t('input.placeholder', 'Paste the SID number here')}
          </span>
          <input
            className="loginInput"
            id="sidInput"
            onChange={(event) => setInput(event.target.value)}
            onAuxClick={() => setInput(clipboard.readText('clipboard'))}
            value={input}
          />
          {loading && (
            <p className="message">
              {message}
              <Autorenew className="material-icons" />{' '}
            </p>
          )}
          <button
            onClick={() => handleLogin(input)}
            className="button is-primary"
            disabled={loading || input.length < 30}
          >
            {t('button.login', 'Login')}
          </button>
        </div>
        <div className="helpWrapper">
          <p className="helpTitle">{t('info.needHelp', 'Need Help?')}</p>
          <div className="buttonWrapper">
            <button
              onClick={() => ipcRenderer.send('openWikiLink')}
              className="button is-primary"
            >
              Wiki
            </button>
            <button
              onClick={() => ipcRenderer.send('openDiscordLink')}
              className="button is-tertiary"
            >
              Discord
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
