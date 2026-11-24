import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import Tour, { TourStep } from '../../../../components/Tour/Tour'
import { useTour } from '../../../../state/TourContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { buildLibraryTourSteps } from 'frontend/screens/Library/components/libraryTourSteps'

export const SIDEBAR_TOUR_ID = 'sidebar-tour'

interface SidebarTourProps {
  isCollapsed?: boolean
}

const SidebarTour: React.FC<SidebarTourProps> = ({ isCollapsed = false }) => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()
  const location = useLocation()
  const { epic, gog, amazon, zoom, itchio, steam, sideloadedLibrary, isRTL } =
    useContext(ContextProvider)

  const position = isRTL ? 'left' : 'right'
  const isLibrary = location.pathname === '/'
  const hasGames = Boolean(
    epic.library.length ||
    gog.library.length ||
    amazon.library.length ||
    zoom.library.length ||
    itchio.library.length ||
    steam.library.length ||
    sideloadedLibrary.length
  )

  const steps: TourStep[] = [
    {
      element: '[data-tour="sidebar-brand"]',
      intro: t(
        'tour.sidebar.welcome.intro',
        'Welcome to Heroic! This sidebar is your main navigation on every screen.'
      ),
      title: t('tour.sidebar.welcomeTitle', 'Welcome to Heroic'),
      position
    },
    {
      element: isCollapsed
        ? '[data-tour="sidebar-library"]'
        : '[data-tour="sidebar-general-label"]',
      intro: t(
        'tour.sidebar.general',
        'General is where you access your Library, game Stores (including login), Deals, Downloads, Accessibility and Heroic Settings, with Quit at the bottom.'
      ),
      title: t('tour.sidebar.generalTitle', 'General'),
      position
    },
    {
      element: isCollapsed
        ? '[data-tour="sidebar-community"]'
        : '[data-tour="sidebar-community-label"]',
      intro: t(
        'tour.sidebar.communityIntro',
        'Community opens the Heroic documentation, the Discord server and the Support us page.'
      ),
      title: t('tour.sidebar.communitySectionTitle', 'Community'),
      position
    },
    ...(isLibrary ? buildLibraryTourSteps({ t, hasGames }) : []),
    {
      element: '[data-tour="sidebar-version"]',
      intro: t(
        'tour.sidebar.version',
        'Click the version to read the changelog; the question-mark button beside it replays this tour.'
      ),
      title: t('tour.sidebar.versionTitle', 'Version and help'),
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
