import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { legendary, loginPage, sidInfoPage } from '../helper'
import Autorenew from '@material-ui/icons/Autorenew'
import Info from '@material-ui/icons/Info'
import LanguageSelector, { FlagPosition } from './UI/LanguageSelector'
const storage: Storage = window.localStorage
interface Props {
  refresh: () => Promise<void>
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

        await legendary(`list-games`)
        refresh()
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
                <Autorenew className="material-icons" />{' '}
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
          <span
            style={{
              paddingRight: '22px',
              marginBottom: '22px',
              display: 'flex',
              justifyContent: 'flex-end',
              width: '100%',
            }}
          >
            <LanguageSelector
              handleLanguageChange={handleChangeLanguage}
              currentLanguage={currentLanguage}
              flagPossition={FlagPosition.PREPEND}
              className="settingSelect language-login"
            />
          </span>
        </div>
      </div>
      <span className="loginBackground"></span>
    </div>
  )
}
