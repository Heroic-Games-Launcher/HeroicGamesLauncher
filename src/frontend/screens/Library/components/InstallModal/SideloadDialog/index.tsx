import './index.scss'
import short from 'short-uuid'
import { faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { InstallPlatform, WineInstallation, GameInfo } from 'common/types'
import {
  CachedImage,
  TextInputField,
  PathSelectionBox,
  ToggleSwitch,
  InfoBox,
  SteamGridDBPicker,
  WarningMessage
} from 'frontend/components/UI'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import {
  getGameInfo,
  getGameSettings,
  removeSpecialcharacters,
  writeConfig
} from 'frontend/helpers'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import ContextProvider from 'frontend/state/ContextProvider'
import classNames from 'classnames'
import axios from 'axios'
import { NavLink, useNavigate } from 'react-router-dom'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import Folder from '@mui/icons-material/Folder'
import { Step, StepContent, StepLabel, Stepper } from '@mui/material'
import MetadataStep from './steps/MetadataStep'
import CompatibilityStep from './steps/CompatibilityStep'
import InstallationStep from './steps/InstallationStep'
import FinishStep from './steps/FinishStep'
import ImagesStep from './steps/ImagesStep'

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  wineVersion: WineInstallation | undefined
  platformToInstall: InstallPlatform
  platformSelection: React.ReactNode
  wineSelector?: React.ReactNode
  backdropClick: () => void
  appName?: string
  title: string
  setTitle: (title: string) => void
}

type SupportedSteps = 'meta' | 'images' | 'compat' | 'install' | 'finish'

export default function SideloadDialog({
  availablePlatforms,
  backdropClick,
  winePrefix,
  wineVersion,
  platformToInstall,
  platformSelection,
  wineSelector,
  appName,
  title,
  setTitle
}: Props) {
  const { t, i18n } = useTranslation('gamepage')
  const [activeStep, setActiveStep] = useState(0)
  const [selectedExe, setSelectedExe] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [customUserAgent, setCustomUserAgent] = useState('')
  const [launchFullScreen, setLaunchFullScreen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [searching, setSearching] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [app_name, setApp_name] = useState(appName ?? '')
  const [runningSetup, setRunningSetup] = useState(false)
  const [gameInfo, setGameInfo] = useState<Partial<GameInfo>>({})
  const [addingApp, setAddingApp] = useState(false)
  const [sgdbTarget, setSgdbTarget] = useState<'cover' | 'square' | null>(null)
  const [hasSgdbKey, setHasSgdbKey] = useState(false)
  const editMode = Boolean(appName)

  const { refreshLibrary, platform } = useContext(ContextProvider)

  function handleTitle(value: string) {
    value = removeSpecialcharacters(value)
    setTitle(value)
  }

  const appPlatform = gameInfo.install?.platform || platformToInstall

  useEffect(() => {
    window.api.steamgriddb.hasApiKey().then(setHasSgdbKey)

    if (appName) {
      void getGameInfo(appName, 'sideload').then((info) => {
        if (!info || info.runner !== 'sideload') {
          return
        }
        setGameInfo(info)
        const {
          art_cover,
          art_square,
          install: { executable, platform },
          title,
          browserUrl,
          customUserAgent,
          launchFullScreen
        } = info

        if (executable && platform) {
          setSelectedExe(executable)
        }

        if (browserUrl) {
          setGameUrl(browserUrl)
        }

        if (customUserAgent) {
          setCustomUserAgent(customUserAgent)
        }

        console.log(launchFullScreen)
        if (launchFullScreen !== undefined) {
          setLaunchFullScreen(launchFullScreen)
        }

        setTitle(title)
        setImageUrl(art_square || '')
        setHeroUrl(art_cover && art_cover !== art_square ? art_cover : '')
      })
    } else {
      setApp_name(short.generate().toString())
    }
  }, [])

  async function searchImage() {
    if (hasSgdbKey) {
      setSgdbTarget('square')
      return
    }
    setSearching(true)

    try {
      const response = await axios.get(
        `https://steamgrid.usebottles.com/api/search/${title}`,
        { timeout: 3500 }
      )

      if (response.status === 200) {
        const steamGridImage = response.data as string

        if (steamGridImage && steamGridImage.startsWith('http')) {
          setImageUrl(steamGridImage)
        }
      } else {
        throw new Error('Fetch failed')
      }
    } catch (error) {
      window.api.logError(`${error}`)
    } finally {
      setSearching(false)
    }
  }

  async function handleInstall(): Promise<void> {
    setAddingApp(true)
    window.api.addNewApp({
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable: selectedExe,
        platform: gameInfo.install?.platform ?? platformToInstall
      },
      art_cover: heroUrl || imageUrl || fallbackImage,
      is_installed: true,
      art_square: imageUrl || heroUrl || fallbackImage,
      canRunOffline: true,
      browserUrl: gameUrl,
      customUserAgent,
      launchFullScreen
    })

    await refreshLibrary({
      library: 'sideload',
      runInBackground: true,
      checkForUpdates: true
    })
    setAddingApp(false)
    return backdropClick()
  }

  const fileFilters = useCallback((platform: InstallPlatform) => {
    switch (platform) {
      case 'Windows':
      case 'windows':
      case 'Win32':
        return [
          { name: 'Executables', extensions: ['exe', 'msi'] },
          { name: 'Scripts', extensions: ['bat'] },
          { name: 'All', extensions: ['*'] }
        ]
      case 'linux':
        return [
          { name: 'AppImages', extensions: ['AppImage'] },
          { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
          { name: 'All', extensions: ['*'] }
        ]
      case 'osx':
      case 'Mac':
        return [
          { name: 'Apps', extensions: ['App'] },
          { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
          { name: 'All', extensions: ['*'] }
        ]
      // FIXME: Can these happen?
      case 'Android':
      case 'iOS':
      case 'Browser':
        return []
    }
  }, [])

  const handleRunExe = async () => {
    let exeToRun = ''
    const path = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title', 'Select EXE to Run'),
      filters: fileFilters(appPlatform)
    })
    if (path) {
      exeToRun = path
      try {
        setRunningSetup(true)
        const gameSettings = await getGameSettings(app_name, 'sideload')
        if (!gameSettings) {
          return
        }
        await writeConfig({
          appName: app_name,
          config: { ...gameSettings, winePrefix, wineVersion }
        })
        await window.api.runWineCommand({
          commandParts: [exeToRun],
          wait: true,
          protonVerb: 'runinprefix',
          gameSettings: {
            ...gameSettings,
            winePrefix,
            wineVersion: wineVersion || gameSettings.wineVersion
          }
        })
        setRunningSetup(false)
      } catch (error) {
        console.log('finished with error', error)
        setRunningSetup(false)
      }
    }
    return
  }

  function handleGameUrl(url: string) {
    if (!url.startsWith('https://')) {
      return setGameUrl(`https://${url}`)
    }

    setGameUrl(url)
  }

  function platformIcon() {
    const platformIcon = availablePlatforms.filter(
      (p) => p.name === appPlatform.replace('Mac', 'macOS')
    )[0]?.icon

    return (
      <FontAwesomeIcon
        className="InstallModal__platformIcon"
        icon={platformIcon}
      />
    )
  }

  const shouldShowRunExe = platform !== 'win32' && appPlatform === 'Windows'

  const stepLabels: Record<SupportedSteps, string> = {
    meta: t('sideload.step.meta', 'Metadata'),
    images: t('sideload.step.images', 'Images'),
    compat: t('sideload.step.compat', 'Compatibility'),
    install: t('sideload.step.install', 'Installation'),
    finish: t('sideload.step.finish', 'Finish')
  }

  const flowSteps: SupportedSteps[] = useMemo(() => {
    const steps: SupportedSteps[] = ['meta', 'images']
    if (shouldShowRunExe) {
      steps.push('compat', 'install')
    }
    steps.push('finish')
    return steps
  }, [shouldShowRunExe])

  const numberOfSteps = flowSteps.length

  function handlePreviousStepClick() {
    setActiveStep(Math.max(activeStep - 1, 0))
  }

  function handleNextStepClick() {
    setActiveStep(Math.min(activeStep + 1, numberOfSteps - 1))
  }

  function renderDialogContent(step: SupportedSteps) {
    switch (step) {
      case 'meta':
        return (
          <MetadataStep
            title={title}
            setTitle={setTitle}
            platformSelection={platformSelection}
          />
        )
      case 'images':
        return (
          <ImagesStep
            title={title}
            backdropClick={backdropClick}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            heroUrl={heroUrl}
            setHeroUrl={setHeroUrl}
            hasSgdbKey={hasSgdbKey}
          />
        )
      case 'compat':
        return <CompatibilityStep />
      case 'install':
        return <InstallationStep />
      case 'finish':
        return <FinishStep />
    }
  }

  return (
    <>
      <DialogContent className="sideloadDialog">
        <Stepper className="sideloadStepper" activeStep={activeStep}>
          {flowSteps.map((step) => (
            <Step key={step}>
              <StepLabel>{stepLabels[step]}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <div className="stepContentRenderer">
          {renderDialogContent(flowSteps[activeStep])}
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="sideloadFooterMetadata">
          {title}
          {platformIcon()}
        </div>
        <div className="sideloadFooterButtons">
          <button
            onClick={handlePreviousStepClick}
            className="button is-tertiary"
          >
            {t('button.back', 'Back')}
          </button>
          <button onClick={handleNextStepClick} className="button">
            {numberOfSteps - 1 === activeStep
              ? t('button.finish', 'Finish')
              : t('button.next', 'Next')}
          </button>
        </div>
      </DialogFooter>
    </>
  )

  // return (
  //   <>
  //     <DialogContent>
  //       <div className="sideloadGrid">
  //         <div className="imageIcons">
  //
  //         <div className="sideloadForm">
  //           {sgdbTarget ? (
  //             <SteamGridDBPicker
  //               initialTitle={title}
  //               mode={sgdbTarget === 'cover' ? 'heroes' : 'grids'}
  //               onClose={() => setSgdbTarget(null)}
  //               onSelect={(url: string) => {
  //                 if (sgdbTarget === 'cover') {
  //                   setHeroUrl(url)
  //                 } else if (url !== imageUrl) {
  //                   setImageLoading(true)
  //                   setImageUrl(url)
  //                 }
  //                 setSgdbTarget(null)
  //               }}
  //             />
  //           ) : (
  //             <>
  //
  //               <TextInputField
  //                 label={t('sideload.info.title', 'Game/App Title')}
  //                 placeholder={t(
  //                   'sideload.placeholder.title',
  //                   'Add a title to your Game/App'
  //                 )}
  //                 onChange={(newValue) => handleTitle(newValue)}
  //                 onBlur={async () => searchImage()}
  //                 htmlId="sideload-title"
  //                 value={title}
  //                 maxLength={40}
  //               />
  //               <details className="advancedFields">
  //                 <summary>{t('sideload.images.summary', 'Images')}</summary>
  //                 <TextInputWithIconField
  //                   label={t(
  //                     'sideload.info.image-hint',
  //                     'Square Art (click on the image to search on SteamGridDB)'
  //                   )}
  //                   placeholder={t(
  //                     'sideload.placeholder.image',
  //                     'Paste an URL of an Image or select one from your computer'
  //                   )}
  //                   onChange={(newValue: string) => setImageUrl(newValue)}
  //                   htmlId="sideload-image"
  //                   value={imageUrl}
  //                   icon={<Folder />}
  //                   onIconClick={() => handleSelectLocalImage('square')}
  //                 />
  //                 <TextInputWithIconField
  //                   label={t(
  //                     'sideload.info.cover-hint',
  //                     'Cover/Hero Art (click on the image to search on SteamGridDB)'
  //                   )}
  //                   placeholder={t(
  //                     'sideload.placeholder.image',
  //                     'Paste an URL of an Image or select one from your computer'
  //                   )}
  //                   onChange={(newValue: string) => setHeroUrl(newValue)}
  //                   htmlId="sideload-cover"
  //                   value={heroUrl}
  //                   icon={<Folder />}
  //                   onIconClick={() => handleSelectLocalImage('cover')}
  //                 />
  //               </details>
  //               {!hasSgdbKey && (
  //                 <WarningMessage>
  //                   {t(
  //                     'edit-game.sgdb.no-key-prefix',
  //                     'To search SteamGridDB for cover art, add an API key in'
  //                   )}{' '}
  //                   <a
  //                     role="button"
  //                     tabIndex={0}
  //                     onClick={goToAdvancedSettings}
  //                     className="sgdbWarningLink"
  //                   >
  //                     {t('edit-game.sgdb.no-key-link', 'Settings → Advanced')}
  //                   </a>
  //                   .
  //                 </WarningMessage>
  //               )}
  //               {!editMode && children}
  //               {showSideloadExe && (
  //                 <PathSelectionBox
  //                   type="file"
  //                   onPathChange={setSelectedExe}
  //                   path={selectedExe}
  //                   placeholder={t('sideload.info.exe', 'Select Executable')}
  //                   pathDialogTitle={t('box.sideload.exe', 'Select Executable')}
  //                   pathDialogDefaultPath={winePrefix}
  //                   pathDialogFilters={fileFilters(platformToInstall)}
  //                   htmlId="sideload-exe"
  //                   label={t('sideload.info.exe', 'Select Executable')}
  //                   noDeleteButton
  //                 />
  //               )}
  //               {!showSideloadExe && (
  //                 <>
  //                   <TextInputField
  //                     label={t('sideload.info.broser', 'BrowserURL')}
  //                     placeholder={t(
  //                       'sideload.placeholder.url',
  //                       'Paste the Game URL here'
  //                     )}
  //                     onChange={(newValue: string) => handleGameUrl(newValue)}
  //                     htmlId="sideload-game-url"
  //                     value={gameUrl}
  //                   />
  //                   <TextInputField
  //                     label={t('sideload.info.useragent', 'Custom User Agent')}
  //                     placeholder={t(
  //                       'sideload.placeholder.useragent',
  //                       'Write a custom user agent here to be used on this browser app/game'
  //                     )}
  //                     onChange={(newValue: string) =>
  //                       setCustomUserAgent(newValue)
  //                     }
  //                     htmlId="sideload-user-agent"
  //                     value={customUserAgent}
  //                   />
  //                   <ToggleSwitch
  //                     htmlId="launch-fullscreen"
  //                     value={launchFullScreen}
  //                     handleChange={() =>
  //                       setLaunchFullScreen(!launchFullScreen)
  //                     }
  //                     title={t(
  //                       'sideload.info.fullscreen',
  //                       'Launch Fullscreen (F11 to exit)'
  //                     )}
  //                   />
  //                 </>
  //               )}
  //             </>
  //           )}
  //         </div>
  //       </div>
  //     </DialogContent>
  //     <DialogFooter>
  //       {shouldShowRunExe && (
  //         <button
  //           onClick={async () => handleRunExe()}
  //           className={`button is-secondary`}
  //           disabled={runningSetup || !title.length}
  //         >
  //           {runningSetup
  //             ? t('button.running-setup', 'Running Setup')
  //             : t('button.run-exe-first', 'Run Installer First')}
  //         </button>
  //       )}
  //       <button
  //         onClick={async () => handleInstall()}
  //         className={`button is-success`}
  //         disabled={(!selectedExe.length && !gameUrl) || addingApp || searching}
  //       >
  //         {addingApp && <FontAwesomeIcon icon={faSpinner} spin />}
  //         {!addingApp && t('button.finish', 'Finish')}
  //       </button>
  //     </DialogFooter>
  //   </>
  // )
}
