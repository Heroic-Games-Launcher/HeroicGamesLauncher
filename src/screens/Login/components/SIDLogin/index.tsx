import React, { useState } from 'react'
import Info from '@mui/icons-material/Info'
import { useTranslation } from 'react-i18next'
import { loginPage, sidInfoPage } from 'src/helpers'
import './index.css'
import { Autorenew } from '@mui/icons-material'

const { ipcRenderer, clipboard } = window.require('electron')

interface Props {
  backdropClick: () => void
  refresh: () => void
}

export default function SIDLogin({ backdropClick, refresh }: Props) {
  const { t } = useTranslation('login')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState({
    loading: false,
    message: ''
  })

  const { loading, message } = status

  const handleLogin = async (sid: string) => {
    await ipcRenderer.invoke('login', sid).then(async (res) => {
      setStatus({
        loading: true,
        message: t('status.loading', 'Loading Game list, please wait')
      })
      ipcRenderer.send('logInfo', 'Called Login')
      console.log(res)
      if (res !== 'error') {
        await ipcRenderer.invoke('getUserInfo')
        setStatus({ loading: false, message: '' })
        backdropClick()
        refresh()
      } else {
        setStatus({ loading: true, message: t('status.error', 'Error') })
        setTimeout(() => {
          setStatus({ ...status, loading: false })
        }, 2500)
      }
    })
  }
  return (
    <div className="SIDLoginModal">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="sid-modal">
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
        <input
          type="text"
          className="sid-input"
          value={input}
          onAuxClick={() => setInput(clipboard.readText('clipboard'))}
          onChange={(e) => setInput(e.target.value)}
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
    </div>
  )
}
