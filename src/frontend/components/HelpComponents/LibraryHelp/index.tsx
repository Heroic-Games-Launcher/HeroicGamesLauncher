import introJs from 'intro.js'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LibraryHelp = () => {
  const { t } = useTranslation()

  const hints = introJs().setOptions({
    hints: [
      {
        hint: 'Click this button when you want to refresh your library',
        element: document.querySelector('#refreshLibraryButton') as HTMLElement,
        hintPosition: 'top-left'
      },
      {
        hint: 'If you own a physical copy of a game, you can click here to side load it',
        element: document.querySelector('.sideloadGameButton') as HTMLElement,
        hintPosition: 'top-left'
      },
      {
        hint: 'Click here to log into any of your game platform accounts',
        element: document.querySelector('#manageAccountsBtn') as HTMLElement,
        hintPosition: 'top-right'
      },
      {
        hint: 'Click here to manage your installed Wine and Proton versions',
        element: document.querySelector('#manageWineBtn') as HTMLElement,
        hintPosition: 'top-right'
      }
    ],
    tooltipClass: 'onboarding'
  })

  useEffect(() => {
    return () => {
      hints.hideHints()
    }
  }, [])

  return (
    <>
      <p>{t('help.content.library', 'Shows all owned games.')}</p>
      <button
        className="button is-primary"
        onClick={() => {
          hints.showHints()
        }}
      >
        Show hints
      </button>
    </>
  )
}

export default LibraryHelp
