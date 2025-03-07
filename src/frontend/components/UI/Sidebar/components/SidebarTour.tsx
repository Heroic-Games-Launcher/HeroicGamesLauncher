import React from 'react'
import { useTranslation } from 'react-i18next'
import Tour, { TourStep } from '../../../../components/Tour/Tour'
import { useTour } from '../../../../state/TourContext'

export const SIDEBAR_TOUR_ID = 'sidebar-tour'

const SidebarTour: React.FC = () => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()

  const steps: TourStep[] = [
    {
      element: '[data-tour="sidebar-menu"]',
      intro: t(
        'tour.sidebar.welcome.intro',
        'On the Sidebar you will find all navigation options to explore the app.'
      ),
      title: t('tour.sidebar.welcome.title', 'Sidebar Navigation')
    },
    {
      element: '[data-tour="sidebar-library"]',
      intro: t(
        'tour.sidebar.library',
        'Access your game library from different stores in one place.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-stores"]',
      intro: t(
        'tour.sidebar.stores',
        'Browse and shop for games in different stores including Epic, GOG, and Amazon.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-settings"]',
      intro: t(
        'tour.sidebar.settings',
        "Configure Heroic's settings, game defaults, check logs and more."
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-downloads"]',
      intro: t(
        'tour.sidebar.downloads',
        'Track and manage your game downloads and installations.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-wine"]',
      intro: t(
        'tour.sidebar.wine',
        'Manage your Wine/Proton versions for running Windows games on Linux.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-manage-accounts"]',
      intro: t(
        'tour.sidebar.accounts',
        'Manage your connected store accounts (Epic, GOG, Amazon), logout or login on them.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-accessibility"]',
      intro: t(
        'tour.sidebar.accessibility',
        'Access accessibility features to customize your experience.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-docs"]',
      intro: t(
        'tour.sidebar.docs',
        'Read documentation for help with using Heroic.'
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-community"]',
      intro: t(
        'tour.sidebar.community',
        "Join our community on Discord and support Heroic's development."
      ),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-quit"]',
      intro: t('tour.sidebar.quit', 'Exit the application safely.'),
      position: 'right'
    },
    {
      element: '[data-tour="sidebar-version"]',
      intro: t(
        'tour.sidebar.version',
        'Check your current Heroic version, click it to see latest changelog, and access this tour from the help icon.'
      ),
      position: 'top'
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
