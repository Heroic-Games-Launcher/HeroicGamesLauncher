import React, { useContext, useEffect, useState } from 'react'
import './index.scss'
import { useTranslation } from 'react-i18next'

import { Alert, UpdateComponent } from '../../components/UI'
import StoreCard from './components/StoreCard'
import SIDLogin from './components/SIDLogin'
import ItchioLogin from './components/ItchioLogin'
import SteamLogin from './components/SteamLogin'
import ContextProvider from '../../state/ContextProvider'
import { useAwaited } from '../../hooks/useAwaited'
import { hasHelp } from 'frontend/hooks/hasHelp'

export const epicLoginPath = '/loginweb/legendary'
export const gogLoginPath = '/loginweb/gog'
export const amazonLoginPath = '/loginweb/nile'
export const zoomLoginPath = '/loginweb/zoom'
export const itchioLoginPath = '/loginweb/itchio'

export default React.memo(function NewLogin() {
  const { epic, gog, amazon, zoom, itchio, steam, disableGOGAffiliate } =
    useContext(ContextProvider)
  const { t } = useTranslation()

  hasHelp(
    'login',
    t('help.title.login', 'Login'),
    <p>{t('help.content.login', 'Log in into the different stores.')}</p>
  )

  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)
  const [showItchioLogin, setShowItchioLogin] = useState(false)
  const [showSteamLogin, setShowSteamLogin] = useState(false)
  const [isEpicLoggedIn, setIsEpicLoggedIn] = useState(Boolean(epic.username))
  const [isGogLoggedIn, setIsGogLoggedIn] = useState(Boolean(gog.username))
  const [isAmazonLoggedIn, setIsAmazonLoggedIn] = useState(
    Boolean(amazon.user_id)
  )
  const [isZoomLoggedIn, setIsZoomLoggedIn] = useState(Boolean(zoom.username))
  const [isItchioLoggedIn, setIsItchioLoggedIn] = useState(
    Boolean(itchio.username)
  )
  const [isSteamLoggedIn, setIsSteamLoggedIn] = useState(
    Boolean(steam.users?.[0])
  )

  const steamUser = steam.users[0]

  const systemInfo = useAwaited(window.api.systemInfo.get)

  let oldMac = false
  let oldMacMessage = ''
  if (systemInfo?.OS.platform === 'darwin') {
    const version = parseInt(systemInfo.OS.version.split('.')[0])
    if (version < 12) {
      oldMac = true
      oldMacMessage = t(
        'login.old-mac',
        'Your macOS version is {{version}}. macOS 12 or newer is required to log in.',
        { version: systemInfo.OS.version }
      )
    }
  }

  useEffect(() => {
    setLoading(false)
  }, [epic, gog])

  useEffect(() => {
    setIsEpicLoggedIn(Boolean(epic.username))
    setIsGogLoggedIn(Boolean(gog.username))
    setIsAmazonLoggedIn(Boolean(amazon.user_id))
    setIsZoomLoggedIn(Boolean(zoom.username))
    setIsItchioLoggedIn(Boolean(itchio.username))
    setIsSteamLoggedIn(Boolean(steam.users?.[0]))
  }, [
    epic.username,
    gog.username,
    amazon.user_id,
    zoom.username,
    itchio.username,
    steam.users
  ])

  if (loading) {
    return <UpdateComponent />
  }

  return (
    <div className="storesPage">
      {showSidLogin && (
        <SIDLogin
          backdropClick={() => {
            setShowSidLogin(false)
          }}
        />
      )}
      {showItchioLogin && (
        <ItchioLogin
          backdropClick={() => {
            setShowItchioLogin(false)
          }}
        />
      )}
      {showSteamLogin && (
        <SteamLogin
          backdropClick={() => {
            setShowSteamLogin(false)
          }}
        />
      )}

      <header className="storesPage__hero">
        <h1 className="storesPage__title">{t('stores', 'Stores')}</h1>
        <p className="storesPage__subtitle">
          {t(
            'login.message',
            'Login with your platform. You can login to more than one platform at the same time.'
          )}
        </p>
      </header>

      {oldMac && <p className="disabledMessage">{oldMacMessage}</p>}

      <div className="storeCardGrid">
        <StoreCard
          storeKey="gog"
          runner="gog"
          title={t('login.title_gog', 'GOG')}
          description={t(
            'login.description_gog',
            'Buy and play DRM free games from GOG.com.'
          )}
          isLoggedIn={isGogLoggedIn}
          user={gog.username}
          loginUrl={gogLoginPath}
          storeRoute="/store/gog"
          logout={gog.logout}
          notice={
            disableGOGAffiliate ? (
              <Alert variant="info">
                {t(
                  'login.gog_support',
                  'GOG affiliate links are disabled. Enable them to help support Heroic when you buy games here.'
                )}
              </Alert>
            ) : undefined
          }
          disabled={oldMac}
        />
        <StoreCard
          storeKey="epic"
          runner="legendary"
          title={t('login.title_epic', 'Epic Games')}
          description={t(
            'login.description_epic',
            'Buy and play games from the Epic Games Store.'
          )}
          isLoggedIn={isEpicLoggedIn}
          user={epic.username}
          loginUrl={epicLoginPath}
          storeRoute="/store/epic"
          logout={epic.logout}
          alternativeLoginAction={() => setShowSidLogin(true)}
          disabled={oldMac}
        />
        <StoreCard
          storeKey="nile"
          runner="nile"
          title={t('login.title_amazon', 'Amazon Games')}
          description={t(
            'login.description_amazon',
            'Claim and play games with Amazon Prime Gaming.'
          )}
          isLoggedIn={isAmazonLoggedIn}
          user={amazon.username || 'Unknown'}
          loginUrl={amazonLoginPath}
          storeRoute="/store/amazon"
          logout={amazon.logout}
          disabled={oldMac}
        />
        <StoreCard
          storeKey="itchio"
          runner="itchio"
          title={t('login.title_itchio', 'itch.io')}
          description={t(
            'login.description_itchio',
            'Discover and play indie games from itch.io.'
          )}
          isLoggedIn={isItchioLoggedIn}
          user={itchio.username || 'Unknown'}
          loginUrl={itchioLoginPath}
          storeRoute="/store/itchio"
          logout={itchio.logout}
          alternativeLoginAction={() => setShowItchioLogin(true)}
          disabled={oldMac}
        />
        {zoom.enabled && (
          <StoreCard
            storeKey="zoom"
            runner="zoom"
            title={t('login.title_zoom', 'Zoom Platform')}
            description={t(
              'login.description_zoom',
              'Buy and play DRM free games from Zoom Platform.'
            )}
            isLoggedIn={isZoomLoggedIn}
            user={zoom.username}
            loginUrl={zoomLoginPath}
            storeRoute="/store/zoom"
            logout={zoom.logout}
            disabled={oldMac}
          />
        )}
        {steam.enabled && (
          <StoreCard
            storeKey="steam"
            runner="steam"
            title={t('login.title_steam', 'Steam')}
            description={t(
              'login.description_steam',
              'Buy and play games from Steam.'
            )}
            isLoggedIn={isSteamLoggedIn}
            user={steamUser?.username || 'Unknown'}
            storeRoute="/store/steam"
            logout={
              steamUser
                ? () => steam.logoutUser(steamUser.steamId)
                : steam.logout
            }
            loginAction={() => setShowSteamLogin(true)}
            disabled={oldMac}
          />
        )}
      </div>
    </div>
  )
})
