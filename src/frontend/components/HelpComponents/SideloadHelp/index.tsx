import { Steps } from 'intro.js-react'
import React from 'react'

export default function SideloadHelp() {
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
            intro: 'Type the game title here',
            element: document.querySelector('#sideload-title')!
          },
          {
            intro:
              'Depending on the title typed above, we can fetch it already from the internet, but you can also set it manually here',
            element: document.querySelector('#sideload-image')!
          },
          {
            intro: "Here you can preview the game's image",
            element: document.querySelector('.imageIcons')!
          },
          {
            intro: "You can pick the game's navite platform here",
            element: document.querySelector('#platformPick')!
          },
          {
            intro:
              "If you want to change the path for this game's wine prefix, you can do so here",
            element: document.querySelector('#setinstallpath')!
          },
          {
            intro: 'Here you can select your desired version of wine/proton',
            element: document.querySelector('#wineVersion')!
          },
          {
            intro:
              "Click here to give Heroic the path for this game's executable",
            element: document.querySelector('#sideload-exe')!
          },
          {
            intro: "If you want to run the game's installer first, click here",
            element: document.querySelector('#run-installer-btn')!
          },
          {
            intro: "Finally, click here to finish this game's setup",
            element: document.querySelector('#setup-finish-btn')!
          }
        ]}
      />
    </>
  )
}
