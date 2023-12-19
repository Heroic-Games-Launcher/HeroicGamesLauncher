import React from 'react'
import { useTranslation } from 'react-i18next'
import HelpWrapper from '../HelpWrapper'

const LibraryHelp = () => {
  const { t } = useTranslation()

  return (
    <>
      <HelpWrapper
        hintList={[
          {
            hint: 'Click this button when you want to refresh your library',
            element: '#refreshLibraryButton',
            hintPosition: 'top-left'
          },
          {
            hint: 'If you own a physical copy of a game, you can click here to side load it',
            element: '.sideloadGameButton',
            hintPosition: 'top-left'
          },
          {
            hint: 'Click here to log into any of your game platform accounts',
            element: '#manageAccountsBtn',
            hintPosition: 'top-right'
          },
          {
            hint: 'Click here to manage your installed Wine and Proton versions',
            element: '#manageWineBtn',
            hintPosition: 'top-right'
          }
        ]}
      >
        <p>{t('help.content.library', 'Shows all owned games.')}</p>
      </HelpWrapper>
    </>
  )
}

export default LibraryHelp
