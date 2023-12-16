import { Steps } from 'intro.js-react'
import React from 'react'

const SideloadHelp = React.forwardRef<HTMLDivElement, unknown>(function (
  _: unknown,
  ref
) {
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore, this feature is new and not yet typed
    <div ref={ref} popover="manual">
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
            element: document.querySelector('#sideload-title') as HTMLElement
          },
          {
            intro:
              'Depending on the title typed above, we can fetch it already from the internet, but you can also set it manually here',
            element: document.querySelector('#sideload-image') as HTMLElement
          },
          {
            intro: "Here you can preview the game's image",
            element: document.querySelector('.imageIcons') as HTMLElement
          },
          {
            intro: "You can pick the game's navite platform here",
            element: document.querySelector('#platformPick') as HTMLElement
          },
          {
            intro:
              "If you want to change the path for this game's wine prefix, you can do so here",
            element: document.querySelector('#setinstallpath') as HTMLElement
          },
          {
            intro: 'Here you can select your desired version of wine/proton',
            element: document.querySelector('#wineVersion') as HTMLElement
          },
          {
            intro:
              "Click here to give Heroic the path for this game's executable",
            element: document.querySelector('#sideload-exe') as HTMLElement
          },
          {
            intro: "If you want to run the game's installer first, click here",
            element: document.querySelector('#run-installer-btn') as HTMLElement
          },
          {
            intro: "Finally, click here to finish this game's setup",
            element: document.querySelector('#setup-finish-btn') as HTMLElement
          }
        ]}
      />
    </div>
  )
})

SideloadHelp.displayName = 'SideloadHelp'

export default SideloadHelp
