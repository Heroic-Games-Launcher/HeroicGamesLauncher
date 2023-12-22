import React from 'react'
import { useTranslation } from 'react-i18next'
import HelpWrapper from '../HelpWrapper'

export default function WineManagerHelp() {
  const { t } = useTranslation()

  return (
    <>
      <HelpWrapper
        hintList={[
          {
            hint: t(
              'help.tutorials.wine-manager.refresh-button-hint',
              'This is the Wine Manager screen, you should see a list of available Wine versions below, if the list is empty, you can click this button to refresh it'
            ),
            element: '#refreshLibraryBtn'
          },
          {
            hint: t(
              'help.tutorials.wine-manager.install-wine-hint',
              "Let's install your first Wine version, you can click this button to install this Wine version, which should be the latest one"
            ),
            element: '.mainActionBtn'
          },
          {
            hint: t(
              'help.tutorials.wine-manager.wine-tabs-hint',
              'You can select between managing Wine or Proton version by clicking on these tabs'
            ),
            element: '.tabs',
            hintPosition: 'top-left'
          },
          {
            hint: t(
              'help.tutorials.wine-manager.wine-list-hint',
              'Below is the list with all available wine/proton versions. Showing version, release date, size and available actions'
            ),
            element: '.gameListHeader',
            hintPosition: 'top-left'
          }
        ]}
      >
        <p>
          {t(
            'help.content.wineManager',
            'Install different versions of Wine, Proton, Crossover, etc.'
          )}
        </p>
      </HelpWrapper>
    </>
  )
}
