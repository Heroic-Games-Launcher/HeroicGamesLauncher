import {
  BookOpen,
  Gamepad2,
  Settings as SettingsIcon,
  Store,
  Accessibility,
  Heart,
  Wine,
  Download,
  Tag
} from 'lucide-react'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { openDiscordLink } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import QuitButton from '../QuitButton'
import { SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY } from 'frontend/components/UI/ExternalLinkDialog'
import SidebarItem from '../SidebarItem'
import { Icon } from 'frontend/components/UI'

export default function SidebarLinks() {
  const { t } = useTranslation()
  const location = useLocation() as { pathname: string }

  const {
    amazon,
    epic,
    gog,
    zoom,
    itchio,
    platform,
    disableDiscounts,
    refreshLibrary,
    libraryStatus,
    handleExternalLinkDialog
  } = useContext(ContextProvider)

  const activeDownloads = libraryStatus.filter(
    (st) => st.status === 'installing' || st.status === 'queued'
  ).length

  const isSettings = location.pathname.includes('settings')
  const isWin = platform === 'win32'

  async function handleRefresh() {
    localStorage.setItem('scrollPosition', '0')

    const shouldRefresh =
      (epic.username && !epic.library.length) ||
      (gog.username && !gog.library.length) ||
      (amazon.user_id && !amazon.library.length) ||
      (zoom.username && !zoom.library.length) ||
      (itchio.username && !itchio.library.length)
    if (shouldRefresh) {
      return refreshLibrary({ runInBackground: true })
    }
    return
  }

  function handleExternalLink(linkCallback: () => void) {
    const showDialogSetting = localStorage.getItem(
      SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY
    )
    const showExternalLinkDialog = showDialogSetting
      ? (JSON.parse(showDialogSetting) as boolean)
      : true

    if (showExternalLinkDialog) {
      handleExternalLinkDialog({ showDialog: true, linkCallback })
    } else {
      linkCallback()
    }
  }

  return (
    <div
      className="SidebarLinks Sidebar__section scrollbar--none"
      data-tour="sidebar-menu"
    >
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute' }}
      >
        <defs>
          <linearGradient
            id="heroicSupportGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#4fe6f0" />
            <stop offset="52%" stopColor="#5f8ef6" />
            <stop offset="100%" stopColor="#7c5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="Sidebar__sectionLabel">{t('General', 'General')}</div>
      <SidebarItem
        isActiveFallback={location.pathname.includes('gamepage')}
        url="/"
        icon={<Icon glyph={Gamepad2} />}
        label={t('Library')}
        onClick={async () => handleRefresh()}
        dataTour="sidebar-library"
      />

      <SidebarItem
        isActiveFallback={
          location.pathname.includes('store') ||
          location.pathname.includes('login')
        }
        url="/login"
        icon={<Icon glyph={Store} />}
        label={t('stores', 'Stores')}
        dataTour="sidebar-stores"
      />
      {!disableDiscounts && (
        <SidebarItem
          url="/discounts"
          icon={<Icon glyph={Tag} />}
          label={t('discounts.sidebar', 'Deals')}
          dataTour="sidebar-discounts"
        />
      )}

      <SidebarItem
        url="/download-manager"
        icon={<Icon glyph={Download} />}
        label={t('download-manager.link', 'Downloads')}
        badge={activeDownloads > 0 ? activeDownloads : undefined}
        dataTour="sidebar-downloads"
      />

      {!isWin && (
        <SidebarItem
          url="/wine-manager"
          icon={<Icon glyph={Wine} />}
          label={t('wine.manager.link', 'Wine manager')}
          dataTour="sidebar-wine"
        />
      )}

      <SidebarItem
        url="/accessibility"
        icon={<Icon glyph={Accessibility} />}
        label={t('accessibility.title', 'Accessibility')}
        dataTour="sidebar-accessibility"
      />

      <SidebarItem
        isActiveFallback={isSettings}
        icon={<Icon glyph={SettingsIcon} />}
        label={t('Settings', 'Settings')}
        url="/settings/general"
        dataTour="sidebar-settings"
      />

      <QuitButton dataTour="sidebar-quit" />

      <div className="Sidebar__sectionLabel">{t('Community', 'Community')}</div>

      <SidebarItem
        url="/wiki"
        icon={<Icon glyph={BookOpen} />}
        label={t('docs', 'Documentation')}
        dataTour="sidebar-docs"
      />

      <div data-tour="sidebar-community">
        <SidebarItem
          elementType="button"
          onClick={() => handleExternalLink(openDiscordLink)}
          icon={<FontAwesomeIcon icon={faDiscord} />}
          label={t('userselector.discord', 'Discord')}
        />

        <SidebarItem
          url="/support"
          icon={
            <Icon
              glyph={Heart}
              className="Sidebar__supportIcon"
              fill="url(#heroicSupportGradient)"
            />
          }
          label={t('support.title', 'Support Us')}
          dataTour="sidebar-support"
        />
      </div>
    </div>
  )
}
