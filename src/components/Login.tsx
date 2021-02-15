import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { legendary, loginPage, sidInfoPage } from '../helper'
import { IpcRenderer } from 'electron'
const { ipcRenderer } = window.require('electron')
const renderer: IpcRenderer = ipcRenderer
const storage: Storage = window.localStorage
interface Props {
  refresh: () => void
}

export default function Login({ refresh }: Props) {
  const { t, i18n } = useTranslation('login')

  const [input, setInput] = useState('')
  const [status, setStatus] = useState({
    loading: false,
    message: '',
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
      message: t('status.logging', 'Logging In...'),
    })

    await legendary(`auth --sid ${sid}`).then(async (res) => {
      if (res !== 'error') {
        setStatus({
          loading: true,
          message: t('status.loading', 'Loading Game list, please wait'),
        })

        await renderer.invoke('writeLibrary').then(() => refresh())
      }

      setStatus({ loading: true, message: t('status.error', 'Error') })
      setTimeout(() => {
        setStatus({ ...status, loading: false })
      }, 2500)
    })
  }

  return (
    <div className="Login">
      <div className="loginWrapper">
        <div className="heroicLogo">
          <span className="logo" />
          <div className="heroicText">
            <span className="heroicTitle">Heroic</span>
            <span className="heroicSubTitle">Games Launcher</span>
          </div>
        </div>
        <div className="loginFormWrapper">
          <span className="loginInstructions">
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
                  <i style={{ marginLeft: '4px' }} className="material-icons">
                    info
                  </i>
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
          </span>
          <div className="loginForm">
            <input
              className="loginInput"
              id="sidInput"
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('input.placeholder', 'Paste the SID number here')}
            />
            {loading && (
              <p className="message">
                {message}
                <span className="material-icons">autorenew</span>{' '}
              </p>
            )}
            <button
              onClick={() => handleLogin(input)}
              className="button login"
              disabled={loading || input.length < 30}
            >
              {t('button.login', 'Login')}
            </button>
          </div>
          <span style={{ color: 'white', marginTop: '4px' }}>
            <span
              className={cx({
                ['selectedLanguage']: currentLanguage === 'en',
                ['language']: currentLanguage !== 'en',
              })}
              onClick={() => handleChangeLanguage('en')}
            >
              English 🇬🇧 -{' '}
            </span>
            <span
              className={cx({
                ['selectedLanguage']: currentLanguage === 'pt',
                ['language']: currentLanguage !== 'pt',
              })}
              onClick={() => handleChangeLanguage('pt')}
            >
              Português 🇧🇷 -{' '}
            </span>
            <span
              className={cx({
                ['selectedLanguage']: currentLanguage === 'de',
                ['language']: currentLanguage !== 'de',
              })}
              onClick={() => handleChangeLanguage('de')}
            >
              Deutsch 🇩🇪 -{' '}
            </span>
            <span
              className={cx({
                ['selectedLanguage']: currentLanguage === 'fr',
                ['language']: currentLanguage !== 'fr',
              })}
              onClick={() => handleChangeLanguage('fr')}
            >
              Français 🇫🇷
            </span>
            <span
              className={cx({
                ['selectedLanguage']: currentLanguage === 'ru',
                ['language']: currentLanguage !== 'ru',
              })}
              onClick={() => handleChangeLanguage('ru')}
            >
              Russian 🇷🇺
            </span>
          </span>
        </div>
      </div>
      <span className="loginBackground"></span>
    </div>
  )
}
