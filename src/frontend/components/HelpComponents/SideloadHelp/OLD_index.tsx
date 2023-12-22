import { Steps } from 'intro.js-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function SideloadHelp() {
  const { t } = useTranslation()

  return (
    <>
      <Steps
        enabled
        onExit={() => {
          console.log()
        }}
        options={{ tooltipClass: 'onboarding' }}
        initialStep={0}
        steps={[
          {
            intro: t(
              'help.tutorials.sideload.game-title-step',
              'Type the game title here'
            ),
            element: document.querySelector('#sideload-title')!
          },
          {
            intro: t(
              'help.tutorials.sideload.image-path-step',
              'Depending on the title typed above, we can fetch it already from the internet, but you can also set it manually here'
            ),
            element: document.querySelector('#sideload-image')!
          },
          {
            intro: t(
              'help.tutorials.sideload.image-preview-step',
              "Here you can preview the game's image"
            ),
            element: document.querySelector('.imageIcons')!
          },
          {
            intro: t(
              'help.tutorials.sideload.native-platform-step',
              "You can pick the game's native platform here"
            ),
            element: document.querySelector('#platformPick')!
          },
          {
            intro: t(
              'help.tutorials.sideload.wine-prefix-step',
              "If you want to change the path for this game's wine prefix, you can do so here"
            ),
            element: document.querySelector('#setinstallpath')!
          },
          {
            intro: t(
              'help.tutorials.sideload.wine-version-step',
              'Here you can select your desired version of wine/proton'
            ),
            element: document.querySelector('#wineVersion')!
          },
          {
            intro: t(
              'help.tutorials.sideload.executable-path-step',
              "Click here to give Heroic the path for this game's executable"
            ),
            element: document.querySelector('#sideload-exe')!
          },
          {
            intro: t(
              'help.tutorials.sideload.run-installer-step',
              "If you want to run the game's installer first, click here"
            ),
            element: document.querySelector('#run-installer-btn')!
          },
          {
            intro: t(
              'help.tutorials.sideload.finish-button-step',
              "Finally, click here to finish this game's setup"
            ),
            element: document.querySelector('#setup-finish-btn')!
          }
        ]}
      />
    </>
  )
}
