import type { TFunction } from 'i18next'
import type { TourStep } from 'frontend/components/Tour/Tour'

interface LibraryTourStepsOptions {
  t: TFunction<'translation'>
  hasGames: boolean
  includeWelcome?: boolean
  includeEnd?: boolean
}

export function buildLibraryTourSteps({
  t,
  hasGames,
  includeWelcome = false,
  includeEnd = false
}: LibraryTourStepsOptions): TourStep[] {
  return [
    ...(includeWelcome
      ? [
          {
            intro: t(
              'tour.library.welcome.intro',
              'Your library brings every connected store together. Here are the controls you will use the most.'
            ),
            title: t('tour.library.welcomeTitle', 'Your library')
          } satisfies TourStep
        ]
      : []),
    ...(hasGames
      ? ([
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
            element: '[data-tour="library-filter-controls"]',
            intro: t(
              'tour.library.filterControls',
              'Categories and Filters live here. Categories use checkboxes and show how many are selected; Filters cover stores, platforms and display options and show how many are active.'
            ),
            title: t(
              'tour.library.filterControlsTitle',
              'Categories and filters'
            ),
            position: 'bottom'
          },
          {
            element: '[data-tour="library-actions"]',
            intro: t(
              'tour.library.actions',
              'This pill switches between grid and list, sorts A to Z, groups installed games first, toggles the alphabet bar, refreshes your library and replays this tour.'
            ),
            title: t('tour.library.actionsTitle', 'Library actions'),
            position: 'bottom'
          }
        ] satisfies TourStep[])
      : [
          {
            intro: t(
              'tour.library.empty',
              'Your library is empty right now. Use Stores in the sidebar to sign in, use Add game to sideload anything you want, or restore a Heroic backup from Settings.'
            ),
            title: t('tour.library.emptyTitle', 'Let us fill this up')
          } satisfies TourStep
        ]),
    {
      element: '[data-tour="library-section-actions"]',
      intro: t(
        'tour.library.sectionActions',
        'Console mode opens the fullscreen controller interface, and Add game opens the wizard to sideload an app, executable, script or web URL.'
      ),
      title: t('tour.library.sectionActionsTitle', 'Console mode and Add game'),
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
    ...(includeEnd
      ? [
          {
            intro: t(
              'tour.library.end.intro',
              "That's it! Your library is ready — enjoy your games!"
            ),
            title: t('tour.library.endTitle', 'Have fun!')
          } satisfies TourStep
        ]
      : [])
  ]
}
