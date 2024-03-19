import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess,
  faCoffee,
  faUserAlt,
  faWineGlass,
  faBarsProgress
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import { openDiscordLink } from 'frontend/helpers'

import ContextProvider from 'frontend/state/ContextProvider'
import QuitButton from '../QuitButton'
import { SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY } from 'frontend/components/UI/ExternalLinkDialog'
import SidebarItem from '../SidebarItem'

type PathSplit = [a: undefined, b: undefined, type: string]

export default function SidebarLinks() {
  const { t } = useTranslation()
  const location = useLocation() as { pathname: string }
  const [, , type] = location.pathname.split('/') as PathSplit

  const {
    amazon,
    epic,
    gog,
    platform,
    refreshLibrary,
    handleExternalLinkDialog
  } = useContext(ContextProvider)

  const inWebviewScreen =
    location.pathname.includes('store') ||
    location.pathname.includes('last-url')
  const isSettings = location.pathname.includes('settings')
  const isWin = platform === 'win32'

  const loggedIn = epic.username || gog.username || amazon.user_id

  async function handleRefresh() {
    localStorage.setItem('scrollPosition', '0')

    const shouldRefresh =
      (epic.username && !epic.library.length) ||
      (gog.username && !gog.library.length) ||
      (amazon.user_id && !amazon.library.length)
    if (shouldRefresh) {
      return refreshLibrary({ runInBackground: true })
    }
    return
  }

  function handleExternalLink(linkCallback: () => void) {
    const showExternalLinkDialog: boolean = JSON.parse(
      localStorage.getItem(SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY) ?? 'true'
    )
    if (showExternalLinkDialog) {
      handleExternalLinkDialog({ showDialog: true, linkCallback })
    } else {
      linkCallback()
    }
  }

  // By default, open Epic Store
  let defaultStore = '/epicstore'
  if (!epic.username && !gog.username && amazon.user_id) {
    // If only logged in to Amazon Games, open Amazon Gaming
    defaultStore = '/amazonstore'
  } else if (!epic.username && gog.username) {
    // Otherwise, if not logged in to Epic Games, open GOG Store
    defaultStore = '/gogstore'
  }

  // if we have a stored last-url, default to the `/last-url` route
  const lastStore = sessionStorage.getItem('last-store')
  if (lastStore) {
    defaultStore = lastStore
  }

  return (
    <div className="SidebarLinks Sidebar__section">
      {!loggedIn && (
        <SidebarItem
          icon={faUser}
          label={t('button.login', 'Login')}
          url="/login"
        />
      )}
      <SidebarItem
        isActiveFallback={location.pathname.includes('gamepage')}
        url="/library"
        icon={faGamepad}
        label={t('Library')}
        onClick={async () => handleRefresh()}
      />

      <div className="SidebarItemWithSubmenu">
        <SidebarItem
          isActiveFallback={location.pathname.includes('store')}
          url={defaultStore}
          icon={faStore}
          label={t('stores', 'Stores')}
        />
        {inWebviewScreen && (
          <div className="SidebarSubmenu">
            <SidebarItem
              className="SidebarLinks__subItem"
              url="epicstore"
              label={t('store', 'Epic Store')}
            />
            <SidebarItem
              className="SidebarLinks__subItem"
              url="/gogstore"
              label={t('gog-store', 'GOG Store')}
            />
            <SidebarItem
              className="SidebarLinks__subItem"
              url="/amazonstore"
              label={t('prime-gaming', 'Prime Gaming')}
            />
          </div>
        )}
      </div>
      <div className="divider" />
      <div className="SidebarItemWithSubmenu">
        <SidebarItem
          isActiveFallback={location.pathname.includes('settings')}
          icon={faSlidersH}
          label={t('Settings', 'Settings')}
          url="/settings/general"
        />
        {isSettings && (
          <div className="SidebarSubmenu settings">
            <SidebarItem
              url="/settings/general"
              isActiveFallback={type === 'general'}
              className="SidebarLinks__subItem"
              label={t('settings.navbar.general')}
            />

            {!isWin && (
              <SidebarItem
                url="/settings/games_settings"
                isActiveFallback={type === 'games_settings'}
                className="SidebarLinks__subItem"
                label={t(
                  'settings.navbar.games_settings_defaults',
                  'Game Defaults'
                )}
              />
            )}

            <SidebarItem
              url="/settings/advanced"
              isActiveFallback={type === 'advanced'}
              className="SidebarLinks__subItem"
              label={t('settings.navbar.advanced', 'Advanced')}
            />

            <SidebarItem
              url="/settings/systeminfo"
              isActiveFallback={type === 'systeminfo'}
              className="SidebarLinks__subItem"
              label={t(
                'settings.navbar.systemInformation',
                'System Information'
              )}
            />

            <SidebarItem
              url="/settings/log"
              isActiveFallback={type === 'log'}
              className="SidebarLinks__subItem"
              label={t('settings.navbar.log', 'Log')}
            />
          </div>
        )}
      </div>
      <SidebarItem
        url="/download-manager"
        icon={faBarsProgress}
        label={t('download-manager.link', 'Downloads')}
      />

      {!isWin && (
        <SidebarItem
          url="/wine-manager"
          icon={faWineGlass}
          label={t('wine.manager.link', 'Wine Manager')}
        />
      )}

      {loggedIn && (
        <SidebarItem
          url="/login"
          icon={faUserAlt}
          label={t('userselector.manageaccounts', 'Manage Accounts')}
        />
      )}

      <SidebarItem
        url="/accessibility"
        icon={faUniversalAccess}
        label={t('accessibility.title', 'Accessibility')}
      />

      <div className="divider" />

      <SidebarItem
        url="/wiki"
        icon={faBookOpen}
        label={t('docs', 'Documentation')}
      />

      <SidebarItem
        elementType="button"
        onClick={() => handleExternalLink(openDiscordLink)}
        icon={faDiscord}
        label={t('userselector.discord', 'Discord')}
      />

      <SidebarItem
        elementType="button"
        onClick={() => handleExternalLink(window.api.openPatreonPage)}
        icon={faPatreon}
        label="Patreon"
      />

      <SidebarItem
        elementType="button"
        onClick={() => handleExternalLink(window.api.openKofiPage)}
        icon={faCoffee}
        label="Ko-fi"
      />

      <QuitButton />
    </div>
  )
}
