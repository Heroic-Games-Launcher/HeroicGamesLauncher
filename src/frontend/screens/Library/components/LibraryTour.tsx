import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Tour, { TourStep } from '../../../components/Tour/Tour'
import { useTour } from '../../../state/TourContext'
import ContextProvider from 'frontend/state/ContextProvider'
import LibraryContext from '../LibraryContext'

export const LIBRARY_TOUR_ID = 'library-tour'

const LibraryTour: React.FC = () => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()
  const { epic, gog, amazon, zoom, itchio, sideloadedLibrary } =
    useContext(ContextProvider)
  const { showAlphabetFilter } = useContext(LibraryContext)

  // Check if there are any games in the library
  const hasGames = Boolean(
    epic.library.length ||
    gog.library.length ||
    amazon.library.length ||
    zoom.library.length ||
    itchio.library.length ||
    sideloadedLibrary.length
  )

  const steps: TourStep[] = [
    {
      intro: t(
        'tour.library.welcome.intro',
        'Welcome to your library! This is where every game from your connected stores lives, together with anything you add yourself.'
      ),
      title: t('tour.library.welcomeTitle', 'Your games, in one place')
    },
    ...(!hasGames
      ? [
          {
            intro: t(
              'tour.library.empty',
              'Your library is empty right now. Sign in to your stores using Stores login in the sidebar, or use Add game to sideload anything you want.'
            ),
            title: t('tour.library.emptyTitle', 'Let us fill this up')
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="library-add-game"]',
      intro: t(
        'tour.library.addGame',
        'Add game lets you sideload an app, executable, script or even a web URL. It does not need to be a store game.'
      ),
      title: t('tour.library.addGameTitle', 'Add your own games'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-search"]',
      intro: t(
        'tour.library.search',
        'Search filters the library as you type and suggests games by name. Press / anywhere in the library to focus the field and Esc to leave it.'
      ),
      title: t('tour.library.searchTitle', 'Search'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-categories"]',
      intro: t(
        'tour.library.categories',
        'Categories let you group games into your own lists. Select one or more to filter, or use only to show just that category. Manage categories opens the editor.'
      ),
      title: t('tour.library.categoriesTitle', 'Categories'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-filters"]',
      intro: t(
        'tour.library.filters',
        'Filters narrow the library by store, platform and display options such as favorites, installed, games with updates, offline-supported games, third-party managed games, hidden and unavailable entries. Reset all brings everything back.'
      ),
      title: t('tour.library.filtersTitle', 'Filters'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-view-toggle"]',
      intro: t(
        'tour.library.viewToggle',
        'Switch between a grid of covers and a more detailed list view.'
      ),
      title: t('tour.library.viewToggleTitle', 'Grid or list'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-sort-az"]',
      intro: t(
        'tour.library.sortOptions',
        'Sort games alphabetically. Click again to flip between ascending and descending order.'
      ),
      title: t('tour.library.sortOptionsTitle', 'Alphabetical order'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-sort-installed"]',
      intro: t(
        'tour.library.sortInstalled',
        'Group installed games at the top so the ones you can play right now are always easy to find.'
      ),
      title: t('tour.library.sortInstalledTitle', 'Installed first'),
      position: 'bottom'
    },
    {
      element: '[data-tour="library-alphabet-toggle"]',
      intro: t(
        'tour.library.alphabetToggle',
        'Show or hide the alphabet bar. Hiding it frees vertical space when you do not need to jump between letters.'
      ),
      title: t('tour.library.alphabetToggleTitle', 'Alphabet bar'),
      position: 'bottom'
    },
    ...(showAlphabetFilter
      ? [
          {
            element: '[data-tour="library-alphabet-filter"]',
            intro: t(
              'tour.library.alphabetFilter',
              'Jump straight to games starting with a letter. Letters that have no games are disabled, and the # button groups titles that start with a number.'
            ),
            title: t('tour.library.alphabetFilterTitle', 'Jump to a letter'),
            position: 'bottom'
          } satisfies TourStep
        ]
      : []),
    {
      element: '[data-tour="library-refresh"]',
      intro: t(
        'tour.library.refresh',
        'Refresh checks your connected stores for new games and updates. The icon spins while it is working.'
      ),
      title: t('tour.library.refreshTitle', 'Refresh'),
      position: 'bottom'
    },
    {
      element: `[data-tour-button="${LIBRARY_TOUR_ID}"]`,
      intro: t(
        'tour.library.help',
        'Use this question mark whenever you want to replay the library tour.'
      ),
      title: t('tour.library.helpTitle', 'Replay the tour'),
      position: 'bottom'
    },
    ...(hasGames
      ? [
          {
            element: '[data-tour="library-game-card"]',
            intro: t(
              'tour.library.gameCard',
              'Click a card to open the game page, where you can install, play and adjust settings. Right-click it for a quick menu with install, edit, favorite, hide and more.'
            ),
            title: t('tour.library.gameCardTitle', 'Your game card'),
            position: 'auto'
          } satisfies TourStep
        ]
      : []),
    {
      intro: t(
        'tour.library.end.intro',
        "That's it! Your library is ready — enjoy your games!"
      ),
      title: t('tour.library.endTitle', 'Have fun!')
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
