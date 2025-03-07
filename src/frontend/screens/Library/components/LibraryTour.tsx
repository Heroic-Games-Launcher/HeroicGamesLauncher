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
      intro: t(
        'tour.library.welcome',
        'Welcome to Heroic Library! This is where you can see all your games across different stores. If the list is empty, make sure to login with your Epic, GOG or Amazon accounts or just add your own games to the library using the Add Game button above.'
      ),
      title: t('tour.library.welcome.title', 'Welcome to Heroic!')
    },
    {
      element: '[data-tour="library-search"]',
      intro: t(
        'tour.library.search',
        'Use the Search bar to search for games by name or AppName.'
      ),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-filters"]',
      intro: t(
        'tour.library.filters',
        'Filter your games by store, platform, favorites and more using these options.'
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
        'Click here to sort games alphabetically.'
      ),
      position: 'left'
    },
    {
      element: '[data-tour="library-game-card"]',
      intro: t(
        'tour.library.gameCard',
        'Right Click on thegame card to navigate to the game page and to see details and adjust settings or Left click to open the context menu.'
      ),
      position: 'top'
    },
    {
      element: '[data-tour="library-add-game"]',
      intro: t(
        'tour.library.addGame',
        'Add your own games or apps to the library by clicking here. They can be basically anything, even Browser URLs.'
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
    },
    {
      intro: t('tour.library.end', "That's it! Enjoy your games and have fun!"),
      title: t('tour.library.end.title', 'Enjoy your games!')
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
