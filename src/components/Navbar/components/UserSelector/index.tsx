import React from 'react'
import { useTranslation } from 'react-i18next'
import ArrowDropDown from '@material-ui/icons/ArrowDropDown'
import {
  legendary,
  openAboutWindow,
  handleQuit,
  handleKofi,
  openDiscordLink,
} from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

export default function UserSelector() {
  const { t } = useTranslation()

  const { user, refresh, refreshLibrary } = React.useContext(ContextProvider)
  const handleLogout = async () => {
    if (confirm('are you sure?')) {
      await legendary(`auth --delete`)
      await legendary(`cleanup`)
      refresh()
    }
  }

  return (
    <div className="UserSelector">
      <span className="userName">
        {user}
        <ArrowDropDown className="material-icons" />
      </span>
      <div onClick={() => refreshLibrary()} className="userName hidden">
        {t('userselector.refresh')}
      </div>
      <div onClick={() => handleKofi()} className="userName hidden">
        {t('userselector.support')}
      </div>
      <div onClick={() => openDiscordLink()} className="userName hidden">
        {t('userselector.discord', 'Discord')}
      </div>
      <div onClick={() => openAboutWindow()} className="userName hidden">
        {t('userselector.about')}
      </div>
      <div onClick={() => handleLogout()} className="userName hidden">
        {t('userselector.logout')}
      </div>
      <div onClick={() => handleQuit()} className="userName hidden">
        {t('userselector.quit')}
      </div>
    </div>
  )
}
