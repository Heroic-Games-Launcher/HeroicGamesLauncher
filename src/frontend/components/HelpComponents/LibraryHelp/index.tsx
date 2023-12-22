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
            hint: t(
              'help.tutorials.library.library-refresh-hint',
              'Click this button when you want to refresh your library'
            ),
            element: '#refreshLibraryButton',
            hintPosition: 'top-left'
          },
          {
            hint: t(
              'help.tutorials.library.side-load-hint',
              'If you own a physical copy of a game, you can click here to side load it'
            ),
            element: '.sideloadGameButton',
            hintPosition: 'top-left'
          },
          {
            hint: t(
              'help.tutorials.library.manage-accounts-hint',
              'Click here to manage your accounts'
            ),
            element: '#manageAccountsBtn',
            hintPosition: 'top-right'
          },
          {
            hint: t(
              'help.tutorials.library.login-button-hint',
              'Click here to login into any of your platform accounts'
            ),
            element: '#loginBtn',
            hintPosition: 'top-right'
          },
          {
            hint: t(
              'help.tutorials.library.wine-manager-hint',
              'Click here to manage your installed Wine and Proton versions'
            ),
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
