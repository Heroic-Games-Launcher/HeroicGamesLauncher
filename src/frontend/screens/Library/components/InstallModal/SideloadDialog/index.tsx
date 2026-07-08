import './index.scss'
import short from 'short-uuid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { InstallPlatform, WineInstallation, GameInfo } from 'common/types'
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
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import ContextProvider from 'frontend/state/ContextProvider'
import { Box, Step, StepLabel, Stepper, stepIconClasses } from '@mui/material'
import MetadataStep from './steps/MetadataStep'
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
  const { t } = useTranslation('gamepage')
  const [activeStep, setActiveStep] = useState(0)
  const [selectedExe, setSelectedExe] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [customUserAgent, setCustomUserAgent] = useState('')
  const [launchFullScreen, setLaunchFullScreen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [app_name, setApp_name] = useState(appName ?? '')
  const [runningSetup, setRunningSetup] = useState(false)
  const [gameInfo, setGameInfo] = useState<Partial<GameInfo>>({})
  const [addingApp, setAddingApp] = useState(false)
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
          protonVerb: 'run',
          gameSettings: {
            ...gameSettings,
            winePrefix,
            wineVersion: wineVersion || gameSettings.wineVersion
          }
        })
        setRunningSetup(false)
        handleNextStepClick()
      } catch (error) {
        console.log('finished with error', error)
        setRunningSetup(false)
      }
    }
    return
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
    if (!editMode && shouldShowRunExe) {
      steps.push('compat', 'install')
    }
    steps.push('finish')
    return steps
  }, [shouldShowRunExe])

  const numberOfSteps = flowSteps.length
  const lastStepIndex = numberOfSteps - 1

  function handlePreviousStepClick() {
    setActiveStep(Math.max(activeStep - 1, 0))
  }

  function handleNextStepClick() {
    setActiveStep(Math.min(activeStep + 1, lastStepIndex))
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
        return (
          <Box
            height={'100%'}
            display={'flex'}
            flexDirection={'column'}
            justifyContent={'center'}
          >
            {wineSelector}
          </Box>
        )
      case 'install':
        return (
          <InstallationStep
            runningSetup={runningSetup}
            handleRunExe={handleRunExe}
            onSkip={handleNextStepClick}
          />
        )
      case 'finish':
        return (
          <FinishStep
            appPlatform={appPlatform}
            gameUrl={gameUrl}
            setGameUrl={setGameUrl}
            customUserAgent={customUserAgent}
            setCustomUserAgent={setCustomUserAgent}
            launchFullScreen={launchFullScreen}
            setLaunchFullScreen={setLaunchFullScreen}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
          />
        )
    }
  }

  const showNextButton = useMemo(() => {
    const step = flowSteps[activeStep]
    if (step === 'install') return false
    return true
  }, [flowSteps, activeStep])

  return (
    <>
      <DialogContent className="sideloadDialog">
        <Stepper
          className="sideloadStepper"
          activeStep={activeStep}
          sx={{ marginTop: 2, marginBottom: 2 }}
        >
          {flowSteps.map((step) => (
            <Step
              key={step}
              sx={{
                [`& .${stepIconClasses.root}`]: {
                  color: 'var(--neutral-04)'
                },
                [`& .${stepIconClasses.root}.${stepIconClasses.active}`]: {
                  color: 'var(--primary-button)'
                },

                [`& .${stepIconClasses.text}`]: { fill: 'var(--text-default)' },

                [`& .${stepIconClasses.root}.${stepIconClasses.active} .${stepIconClasses.text}`]:
                  {
                    fill: 'var(--text-tertiary)'
                  }
              }}
            >
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
            disabled={addingApp || runningSetup || activeStep === 0}
          >
            {t('button.back', 'Back')}
          </button>
          {showNextButton && (
            <button
              onClick={handleNextStepClick}
              className="button"
              disabled={addingApp || runningSetup}
            >
              {lastStepIndex === activeStep
                ? t('button.finish', 'Finish')
                : t('button.next', 'Next')}
            </button>
          )}
        </div>
      </DialogFooter>
    </>
  )
}
