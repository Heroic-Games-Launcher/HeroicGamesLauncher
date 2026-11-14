import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Tour, { TourStep } from '../../../../components/Tour/Tour'
import { useTour } from '../../../../state/TourContext'
import ContextProvider from 'frontend/state/ContextProvider'

export const SIDEBAR_TOUR_ID = 'sidebar-tour'

interface SidebarTourProps {
  hasCurrentDownload?: boolean
  isCollapsed?: boolean
}

const SidebarTour: React.FC<SidebarTourProps> = ({
  hasCurrentDownload = false,
  isCollapsed = false
}) => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()
  const { epic, gog, amazon, zoom, itchio, platform, isRTL, disableDiscounts } =
    useContext(ContextProvider)

  // Check if the user is logged into any store
  const isLoggedIn = Boolean(
    epic.username ||
    gog.username ||
    amazon.user_id ||
    (zoom.enabled && zoom.username) ||
    itchio.username
  )
  const isWin = platform === 'win32'

  // Set position based on RTL
  const position = isRTL ? 'left' : 'right'

  const steps: TourStep[] = [
    {
      element: '[data-tour="sidebar-brand"]',
      intro: t(
        'tour.sidebar.welcome.intro',
        'Welcome to Heroic! This sidebar is your main navigation. It groups your library, stores, downloads, settings and community links.'
      ),
      title: t('tour.sidebar.welcomeTitle', 'Welcome to Heroic'),
      position
    },
    ...(!isCollapsed
      ? [
          {
            element: '[data-tour="sidebar-general-label"]',
            intro: t(
              'tour.sidebar.general',
              'The General section groups the places you will use every day.'
            ),
            title: t('tour.sidebar.generalTitle', 'General'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-library"]',
      intro: t(
        'tour.sidebar.library',
        'Library brings together every game from your connected stores — Epic, GOG, Amazon, itch.io, ZOOM — plus anything you add yourself.'
      ),
      title: t('tour.sidebar.libraryTitle', 'Library'),
      position
    },
    {
      element: '[data-tour="sidebar-stores"]',
      intro: t(
        'tour.sidebar.stores',
        'Stores opens the built-in store browser. While you are inside a store, a submenu lists Epic, GOG, itch.io, Amazon Luna and ZOOM.'
      ),
      title: t('tour.sidebar.storesTitle', 'Stores'),
      position
    },
    ...(!disableDiscounts
      ? [
          {
            element: '[data-tour="sidebar-discounts"]',
            intro: t(
              'tour.sidebar.deals',
              'Deals collects current discounts and lets you filter them by store, price, genre, rating and more.'
            ),
            title: t('tour.sidebar.dealsTitle', 'Deals'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-downloads"]',
      intro: t(
        'tour.sidebar.downloads',
        'Downloads opens the download manager: what is installing now, what is queued and what has already finished. The badge counts active downloads.'
      ),
      title: t('tour.sidebar.downloadsTitle', 'Downloads'),
      position
    },
    ...(!isWin
      ? [
          {
            element: '[data-tour="sidebar-wine"]',
            intro: t(
              'tour.sidebar.wine',
              'Wine manager downloads and organizes the Wine, Proton and CrossOver builds used to run Windows games on Linux and macOS.'
            ),
            title: t('tour.sidebar.wineTitle', 'Wine manager'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-accessibility"]',
      intro: t(
        'tour.sidebar.accessibility',
        'Accessibility groups font, contrast, animation and navigation options so you can adapt Heroic to your needs.'
      ),
      title: t('tour.sidebar.accessibilityTitle', 'Accessibility'),
      position
    },
    {
      element: '[data-tour="sidebar-console"]',
      intro: t(
        'tour.sidebar.console',
        'Console mode switches to a TV-friendly layout that works well with a gamepad.'
      ),
      title: t('tour.sidebar.consoleTitle', 'Console mode'),
      position
    },
    {
      element: '[data-tour="sidebar-settings"]',
      intro: t(
        'tour.sidebar.settings',
        'Settings holds launcher preferences and per-game defaults, split into General, Game defaults, Advanced, System information and Log.'
      ),
      title: t('tour.sidebar.settingsTitle', 'Settings'),
      position
    },
    ...(!isLoggedIn
      ? [
          {
            element: '[data-tour="sidebar-login"]',
            intro: t(
              'tour.sidebar.login',
              'Stores login is where you connect your Epic, GOG, Amazon, itch.io and ZOOM accounts. Sign in to see your games here.'
            ),
            title: t('tour.sidebar.loginTitle', 'Stores login'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-quit"]',
      intro: t(
        'tour.sidebar.quit',
        'Quit closes Heroic safely and gives the launcher time to finish background work.'
      ),
      title: t('tour.sidebar.quitTitle', 'Quit'),
      position
    },
    ...(isLoggedIn && !isCollapsed
      ? [
          {
            element: '[data-tour="sidebar-accounts-label"]',
            intro: t(
              'tour.sidebar.accountsLabel',
              'The Accounts section appears once you are signed in to at least one store.'
            ),
            title: t('tour.sidebar.accountsTitle', 'Accounts'),
            position
          } satisfies TourStep
        ]
      : []),
    ...(isLoggedIn
      ? [
          {
            element: '[data-tour="sidebar-manage-accounts"]',
            intro: t(
              'tour.sidebar.accountsManage',
              'Manage opens the account selector, where you can switch accounts, sign in to more stores or log out.'
            ),
            title: t('tour.sidebar.accountsManageTitle', 'Manage accounts'),
            position
          } satisfies TourStep
        ]
      : []),
    ...(!isCollapsed
      ? [
          {
            element: '[data-tour="sidebar-community-label"]',
            intro: t(
              'tour.sidebar.communityIntro',
              'The Community section links Heroic documentation, chat and ways to support the project.'
            ),
            title: t('tour.sidebar.communitySectionTitle', 'Community'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-docs"]',
      intro: t(
        'tour.sidebar.docs',
        'Documentation opens the Heroic wiki with setup guides, troubleshooting and Linux tips.'
      ),
      title: t('tour.sidebar.docsTitle', 'Documentation'),
      position
    },
    {
      element: '[data-tour="sidebar-discord"]',
      intro: t(
        'tour.sidebar.discord',
        'Discord opens the community server for help, chat and news from the developers.'
      ),
      title: t('tour.sidebar.discordTitle', 'Discord'),
      position
    },
    {
      element: '[data-tour="sidebar-support"]',
      intro: t(
        'tour.sidebar.support',
        'Support us explains how donations and affiliate links keep Heroic going, at no extra cost to you.'
      ),
      title: t('tour.sidebar.supportTitle', 'Support us'),
      position
    },
    ...(hasCurrentDownload
      ? [
          {
            element: '[data-tour="sidebar-current-download"]',
            intro: t(
              'tour.sidebar.currentDownload',
              'While a game is downloading or updating, this card shows its progress and status. Click it to open the download manager.'
            ),
            title: t('tour.sidebar.currentDownloadTitle', 'Download progress'),
            position
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="sidebar-version"]',
      intro: t(
        'tour.sidebar.version',
        'The version number opens the changelog. The question-mark button beside it restarts this tour at any time.'
      ),
      title: t('tour.sidebar.versionTitle', 'Version and tours'),
      position
    }
  ]

  return (
    <Tour
      tourId={SIDEBAR_TOUR_ID}
      steps={steps}
      enabled={isTourActive(SIDEBAR_TOUR_ID)}
    />
  )
}

export default SidebarTour
