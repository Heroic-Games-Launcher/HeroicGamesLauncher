import React, { useContext, useState } from 'react'
import Info from '@mui/icons-material/Info'
import { useTranslation } from 'react-i18next'
import { loginPage, sidInfoPage } from 'frontend/helpers'
import './index.css'
import { Autorenew } from '@mui/icons-material'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  backdropClick: () => void
}

export default function SIDLogin({ backdropClick }: Props) {
  const { epic } = useContext(ContextProvider)
  const { t } = useTranslation('login')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState({
    loading: false,
    message: ''
  })

  const { loading, message } = status

  const handleLogin = async (sid: string) => {
    await epic.login(sid).then(async (res) => {
      setStatus({
        loading: true,
        message: t('status.loading', 'Loading Game list, please wait')
      })
      window.api.logInfo('Called Login')
      console.log(res)
      if (res === 'done') {
        await window.api.getUserInfo()
        setStatus({ loading: false, message: '' })
        backdropClick()
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
          onAuxClick={async () => {
            const text = await window.api.clipboardReadText()
            setInput(text)
          }} // clipboard.readText('clipboard'))}
          onChange={(e) => setInput(e.target.value)}
        />
        {loading && (
          <p className="message">
            {message}
            <Autorenew className="material-icons" />{' '}
          </p>
        )}
        <button
          onClick={async () => handleLogin(input)}
          className="button is-primary"
          disabled={loading || input.length < 30}
        >
          {t('button.login', 'Login')}
        </button>
      </div>
    </div>
  )
}
