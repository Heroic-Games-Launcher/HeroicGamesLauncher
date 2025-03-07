import React from 'react'
import { useTranslation } from 'react-i18next'
import Tour, { TourStep } from '../../../components/Tour/Tour'
import { useTour } from '../../../state/TourContext'

export const LIBRARY_TOUR_ID = 'library-tour'

const LibraryTour: React.FC = () => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()

  const steps: TourStep[] = [
    {
      element: '[data-tour="library-header"]',
      intro: t(
        'tour.library.welcome',
        'Welcome to your game library! This is where you can see all your games across different stores.'
      ),
      title: t('tour.library.welcome.title', 'Your Game Library')
    },
    {
      element: '[data-tour="library-search"]',
      intro: t(
        'tour.library.search',
        'Search for games in your library by typing here.'
      ),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-filters"]',
      intro: t(
        'tour.library.filters',
        'Filter your games by store, platform, or other criteria using these options.'
      ),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-view-toggle"]',
      intro: t(
        'tour.library.viewToggle',
        'Switch between grid and list view for your games.'
      ),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-sort-options"]',
      intro: t(
        'tour.library.sortOptions',
        'Sort your games by different criteria like alphabetically or by installation status.'
      ),
      position: 'left'
    },
    {
      element: '[data-tour="library-game-card"]',
      intro: t(
        'tour.library.gameCard',
        'Click on any game to see details and available actions like playing, installing, uninstalling and more.'
      ),
      position: 'top'
    },
    {
      element: '[data-tour="library-add-game"]',
      intro: t(
        'tour.library.addGame',
        'Add your own games to the library by clicking here.'
      ),
      position: 'left'
    },
    {
      element: '[data-tour="library-refresh"]',
      intro: t(
        'tour.library.refresh',
        'Refresh your library to check for new games or updates.'
      ),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-categories"]',
      intro: t(
        'tour.library.categories',
        'Organize your games into categories to keep things tidy.'
      ),
      position: 'bottom'
    }
  ]

  return (
    <Tour
      tourId={LIBRARY_TOUR_ID}
      steps={steps}
      enabled={isTourActive(LIBRARY_TOUR_ID)}
    />
  )
}

export default LibraryTour
