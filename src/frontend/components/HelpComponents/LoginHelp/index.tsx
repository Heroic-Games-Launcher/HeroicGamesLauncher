import React from 'react'
import { useTranslation } from 'react-i18next'
import HelpWrapper from '../HelpWrapper'

export default function LoginHelp() {
  const { t } = useTranslation()

  const onClickCallback = () => {
    const helpBtn = document.querySelector<HTMLButtonElement>('.HelpButton')
    helpBtn?.click()
  }

  return (
    <>
      <HelpWrapper
        onClickCallback={onClickCallback}
        stepList={[
          {
            intro:
              'This is the login screen, here you can login into any of your preferred platforms (Epic, GOG or Amazon)'
          },
          {
            intro: 'Here you can select your preferred language',
            element: '#languageSelector',
            position: 'top-left-aligned'
          },
          {
            intro:
              'You can pick any of the login options listed below, you can also be logged in into multiple platforms at the same time',
            element: '.runnerGroup',
            position: 'top-left-aligned'
          },
          {
            intro:
              "After you're logged in, your games should show up in the library screen, you can click here to go back to the library",
            element: '.goToLibrary',
            position: 'top-left-aligned'
          }
        ]}
      >
        <p>{t('help.content.login', 'Log in into the different stores.')}</p>
      </HelpWrapper>
    </>
  )
}
