import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import {
  faSpinner,
  faDownload,
  faFolderOpen,
  faHardDrive
} from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  UpdateComponent,
  SelectField,
  TextInputWithIconField,
  ToggleSwitch
} from 'frontend/components/UI'
import {
  getAppSettings,
  getGameInfo,
  getInstallInfo,
  getProgress,
  install,
  size,
  writeConfig
} from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  AppSettings,
  GameInfo,
  GameStatus,
  InstallProgress,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import { Path } from 'frontend/types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import Anticheat from 'frontend/components/UI/Anticheat'

import './index.css'

import { SDL_GAMES, SelectiveDownload } from './selective_dl'

import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'
type Props = {
  appName: string
  backdropClick: () => void
  runner: Runner
}

const storage: Storage = window.localStorage

function getInstallLanguage(
  availableLanguages: string[],
  preferredLanguages: readonly string[]
) {
  const foundPreffered = preferredLanguages.find((plang) =>
    availableLanguages.some((alang) => alang.startsWith(plang))
  )
  if (foundPreffered) {
    const foundAvailable = availableLanguages.find((alang) =>
      alang.startsWith(foundPreffered)
    )
    if (foundAvailable) {
      return foundAvailable
    }
  }
  return availableLanguages[0]
}

function getUniqueKey(sdl: SelectiveDownload) {
  return sdl.tags.join(',')
}

type DiskSpaceInfo = {
  notEnoughDiskSpace: boolean
  message: string | `ERROR`
  validPath: boolean
  spaceLeftAfter: string
}

export default function InstallModal({
  appName,
  backdropClick,
  runner
}: Props) {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  const { i18n, t } = useTranslation('gamepage')
  const { t: tr } = useTranslation()
  const { libraryStatus, handleGameStatus, platform, showDialogModal } =
    useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]
  const [gameInfo, setGameInfo] = useState({} as GameInfo)
  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo
    // @ts-expect-error TODO: Proper default here
  >({})
  const [installDlcs, setInstallDlcs] = useState(false)
  const [winePrefix, setWinePrefix] = useState('...')
  const [wineVersion, setWineVersion] = useState<WineInstallation | undefined>(
    undefined
  )
  const [defaultPath, setDefaultPath] = useState('...')
  const [installPath, setInstallPath] = useState(
    previousProgress.folder || 'default'
  )
  const [installLanguages, setInstallLanguages] = useState(Array<string>())
  const [installLanguage, setInstallLanguage] = useState('')
  const [spaceLeft, setSpaceLeft] = useState<DiskSpaceInfo>({
    message: '',
    notEnoughDiskSpace: false,
    validPath: false,
    spaceLeftAfter: ''
  })

  const [isLinuxNative, setIsLinuxNative] = useState(false)
  const [isMacNative, setIsMacNative] = useState(false)
  const [defaultPlatform, setDefaultPlatform] =
    useState<InstallPlatform>('Windows')

  const installFolder = gameStatus?.folder || installPath

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'

  const platforms = [
    {
      name: 'Linux',
      available: isLinuxNative && !isMac,
      value: 'Linux',
      icon: faLinux
    },
    {
      name: 'macOS',
      available: isMacNative && !isLinux,
      value: 'Mac',
      icon: faApple
    },
    {
      name: 'Windows',
      available: true,
      value: 'Windows',
      icon: faWindows
    }
  ]

  const availablePlatforms = platforms.filter((p) => p.available)

  useEffect(() => {
    const selectedPlatform = isLinuxNative
      ? 'linux'
      : isMacNative
      ? 'Mac'
      : 'Windows'

    setPlatformToInstall(selectedPlatform)
    setDefaultPlatform(selectedPlatform)
  }, [isLinuxNative, isMacNative])

  const [platformToInstall, setPlatformToInstall] =
    useState<InstallPlatform>(defaultPlatform)

  const sdls: Array<SelectiveDownload> = SDL_GAMES[appName]
  const haveSDL = Array.isArray(sdls) && sdls.length !== 0

  const [selectedSdls, setSelectedSdls] = useState<{ [key: string]: boolean }>(
    {}
  )

  const sdlList = useMemo(() => {
    const list = []
    if (sdls) {
      for (const sdl of sdls) {
        if (sdl.mandatory || selectedSdls[getUniqueKey(sdl)]) {
          if (Array.isArray(sdl.tags)) {
            list.push(...sdl.tags)
          }
        }
      }
    }
    return list
  }, [selectedSdls, sdls])

  const handleSdl = useCallback(
    (sdl: SelectiveDownload, value: boolean) => {
      setSelectedSdls({
        ...selectedSdls,
        [getUniqueKey(sdl)]: value
      })
    },
    [selectedSdls]
  )

  function handleDlcs() {
    setInstallDlcs(!installDlcs)
  }

  async function handleInstall(path?: string) {
    backdropClick()

    // Write Default game config with prefix on linux
    if (isLinux) {
      const appSettings: AppSettings = await window.api.requestSettings(appName)

      writeConfig([appName, { ...appSettings, winePrefix, wineVersion }])
    }

    return install({
      appName,
      handleGameStatus,
      installPath: path || installFolder,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t,
      sdlList,
      installDlcs,
      installLanguage,
      runner,
      platformToInstall,
      showDialogModal
    })
  }

  useEffect(() => {
    window.api.requestSettings('default').then(async (config: AppSettings) => {
      setDefaultPath(config.defaultInstallPath)
      if (installPath === 'default') {
        setInstallPath(config.defaultInstallPath)
      }
      const { message, free, validPath } = await window.api.checkDiskSpace(
        installPath === 'default' ? config.defaultInstallPath : installPath
      )
      if (gameInstallInfo?.manifest?.disk_size) {
        let notEnoughDiskSpace = free < gameInstallInfo.manifest.disk_size
        let spaceLeftAfter = size(
          free - Number(gameInstallInfo.manifest.disk_size)
        )
        if (previousProgress.folder === installPath) {
          const progress = 100 - getProgress(previousProgress)
          notEnoughDiskSpace =
            free < (progress / 100) * Number(gameInstallInfo.manifest.disk_size)

          spaceLeftAfter = size(
            free - (progress / 100) * Number(gameInstallInfo.manifest.disk_size)
          )
        }

        setSpaceLeft({
          message,
          notEnoughDiskSpace,
          validPath,
          spaceLeftAfter
        })
      }
    })

    return () => {
      window.api.requestSettingsRemoveListeners()
    }
  }, [appName, installPath, gameInstallInfo?.manifest?.disk_size])

  useEffect(() => {
    const getInfo = async () => {
      const gameInstallInfo = await getInstallInfo(
        appName,
        runner,
        platformToInstall
      )
      if (!gameInstallInfo) {
        showDialogModal({
          title: tr('box.error.generic.title', 'Error!'),
          message: tr('box.error.generic.message', 'Something Went Wrong!')
        })
        backdropClick()
        return
      }
      const gameData = await getGameInfo(appName, runner)
      setGameInfo(gameData)
      setGameInstallInfo(gameInstallInfo)
      if ('languages' in gameInstallInfo.manifest) {
        setInstallLanguages(gameInstallInfo.manifest.languages)
        setInstallLanguage(
          getInstallLanguage(gameInstallInfo.manifest.languages, i18n.languages)
        )
      }
      setIsLinuxNative(gameData.is_linux_native && isLinux)
      setIsMacNative(gameData.is_mac_native && isMac)
      if (platformToInstall === 'linux' && runner === 'gog') {
        const installer_languages =
          (await window.api.getGOGLinuxInstallersLangs(appName)) as string[]
        setInstallLanguages(installer_languages)
        setInstallLanguage(
          getInstallLanguage(installer_languages, i18n.languages)
        )
      }
      const bottleName = gameData.folder_name
      const { defaultWinePrefix, wineVersion } = await getAppSettings()
      const sugestedWinePrefix = `${defaultWinePrefix}/${bottleName}`
      setWinePrefix(sugestedWinePrefix)
      setWineVersion(wineVersion || undefined)
    }
    getInfo()
  }, [appName, i18n.languages, platformToInstall])

  const haveDLCs = gameInstallInfo?.game?.owned_dlc?.length > 0
  const DLCList = gameInstallInfo?.game?.owned_dlc
  const downloadSize = () => {
    if (gameInstallInfo?.manifest?.download_size) {
      if (previousProgress.folder === installPath) {
        const progress = 100 - getProgress(previousProgress)
        return size(
          (progress / 100) * Number(gameInstallInfo.manifest.disk_size)
        )
      }

      return size(Number(gameInstallInfo?.manifest?.download_size))
    }
    return ''
  }

  const installSize =
    gameInstallInfo?.manifest?.disk_size &&
    size(Number(gameInstallInfo?.manifest?.disk_size))

  const getLanguageName = useMemo(() => {
    return (language: string) => {
      try {
        const locale = language.replace('_', '-')
        const displayNames = new Intl.DisplayNames(
          [locale, ...i18n.languages, 'en'],
          {
            type: 'language',
            style: 'long'
          }
        )
        return displayNames.of(locale)
      } catch (e) {
        return language
      }
    }
  }, [i18n.languages, platformToInstall])

  const hasWine = platformToInstall === 'Windows' && isLinux
  const showPlatformSelection = availablePlatforms.length > 1
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])
  useEffect(() => {
    if (hasWine) {
      ;(async () => {
        const newWineList: WineInstallation[] =
          await window.api.getAlternativeWine()
        if (Array.isArray(newWineList)) {
          setWineVersionList(newWineList)
          if (wineVersion?.bin) {
            if (
              !newWineList.some(
                (newWine) => wineVersion && newWine.bin === wineVersion.bin
              )
            ) {
              setWineVersion(undefined)
            }
          }
        }
      })()
    }
  }, [hasWine, wineVersion])

  const title = gameInstallInfo?.game?.title
  const { validPath, notEnoughDiskSpace, message, spaceLeftAfter } = spaceLeft

  return (
    <div className="InstallModal">
      <Dialog
        onClose={backdropClick}
        className={classNames('InstallModal__dialog', {
          'InstallModal__dialog--loading': !title
        })}
      >
        {title ? (
          <>
            <DialogHeader onClose={backdropClick} showCloseButton={true}>
              {title}
              {availablePlatforms.map((p) => (
                <FontAwesomeIcon
                  className="InstallModal__platformIcon"
                  icon={p.icon}
                  key={p.value}
                />
              ))}
            </DialogHeader>
            <Anticheat gameInfo={gameInfo} />
            <DialogContent>
              <div className="InstallModal__sizes">
                <div className="InstallModal__size">
                  <FontAwesomeIcon
                    className="InstallModal__sizeIcon"
                    icon={faDownload}
                  />
                  <div className="InstallModal__sizeLabel">
                    {t('game.downloadSize', 'Download Size')}:
                  </div>
                  <div className="InstallModal__sizeValue">
                    {downloadSize()}
                  </div>
                </div>
                <div className="InstallModal__size">
                  <FontAwesomeIcon
                    className="InstallModal__sizeIcon"
                    icon={faHardDrive}
                  />
                  <div className="InstallModal__sizeLabel">
                    {t('game.installSize', 'Install Size')}:
                  </div>
                  <div className="InstallModal__sizeValue">{installSize}</div>
                </div>
                {previousProgress.folder === installPath && (
                  <div className="InstallModal__size">
                    <FontAwesomeIcon
                      className="InstallModal__sizeIcon"
                      icon={faSpinner}
                    />
                    <div className="InstallModal__sizeLabel">
                      {t('status.totalDownloaded', 'Total Downloaded')}:
                    </div>
                    <div className="InstallModal__sizeValue">
                      {getProgress(previousProgress)}%
                    </div>
                  </div>
                )}
              </div>
              {showPlatformSelection && (
                <SelectField
                  label={`${t(
                    'game.platform',
                    'Select Platform Version to Install'
                  )}:`}
                  htmlId="platformPick"
                  value={platformToInstall}
                  onChange={(e) =>
                    setPlatformToInstall(e.target.value as InstallPlatform)
                  }
                >
                  {availablePlatforms.map((p) => (
                    <option value={p.value} key={p.value}>
                      {p.name}
                    </option>
                  ))}
                </SelectField>
              )}
              {installLanguages && installLanguages?.length > 1 && (
                <SelectField
                  label={`${t('game.language', 'Language')}:`}
                  htmlId="languagePick"
                  value={installLanguage}
                  onChange={(e) => setInstallLanguage(e.target.value)}
                >
                  {installLanguages &&
                    installLanguages.map((value) => (
                      <option value={value} key={value}>
                        {getLanguageName(value)}
                      </option>
                    ))}
                </SelectField>
              )}

              <TextInputWithIconField
                htmlId="setinstallpath"
                label={t('install.path', 'Select Install Path')}
                placeholder={defaultPath}
                value={installPath.replaceAll("'", '')}
                onChange={(event) => setInstallPath(event.target.value)}
                icon={<FontAwesomeIcon icon={faFolderOpen} />}
                onIconClick={async () =>
                  window.api
                    .openDialog({
                      buttonLabel: t('box.choose'),
                      properties: ['openDirectory'],
                      title: t('install.path'),
                      defaultPath: defaultPath
                    })
                    .then(({ path }: Path) =>
                      setInstallPath(path ? path : defaultPath)
                    )
                }
                afterInput={
                  <span className="diskSpaceInfo">
                    {validPath && (
                      <>
                        <span>
                          {`${t(
                            'install.disk-space-left',
                            'Space Available'
                          )}: `}
                        </span>
                        <span>
                          <strong>{`${message}`}</strong>
                        </span>
                        {!notEnoughDiskSpace && (
                          <>
                            <span>
                              {` - ${t(
                                'install.space-after-install',
                                'After Install'
                              )}: `}
                            </span>
                            <span>
                              <strong>{`${spaceLeftAfter}`}</strong>
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {!validPath && (
                      <span className="warning">
                        {`${t(
                          'install.path-not-writtable',
                          'Warning: path might not be writable.'
                        )}`}
                      </span>
                    )}
                    {validPath && notEnoughDiskSpace && (
                      <span className="danger">
                        {` (${t(
                          'install.not-enough-disk-space',
                          'Not enough disk space'
                        )})`}
                      </span>
                    )}
                  </span>
                }
              />

              {hasWine && (
                <>
                  <TextInputWithIconField
                    label={t('install.wineprefix', 'WinePrefix')}
                    htmlId="setinstallpath"
                    placeholder={winePrefix}
                    value={winePrefix.replaceAll("'", '')}
                    onChange={(event) => setWinePrefix(event.target.value)}
                    icon={<FontAwesomeIcon icon={faFolderOpen} />}
                    onIconClick={async () =>
                      window.api
                        .openDialog({
                          buttonLabel: t('box.choose'),
                          properties: ['openDirectory'],
                          title: t('box.wineprefix', 'Select WinePrefix Folder')
                        })
                        .then(({ path }: Path) =>
                          setWinePrefix(path ? path : winePrefix)
                        )
                    }
                  />

                  <SelectField
                    label={`${t('install.wineversion')}:`}
                    htmlId="wineVersion"
                    value={wineVersion?.bin || ''}
                    onChange={(e) =>
                      setWineVersion(
                        wineVersionList.find(
                          (version) => version.bin === e.target.value
                        )
                      )
                    }
                  >
                    {wineVersionList &&
                      wineVersionList.map((version) => (
                        <option value={version.bin} key={version.bin}>
                          {version.name}
                        </option>
                      ))}
                  </SelectField>
                </>
              )}
              {(haveDLCs || haveSDL) && (
                <div className="InstallModal__sectionHeader">
                  {t('sdl.title', 'Select components to Install')}:
                </div>
              )}
              {haveSDL && (
                <div className="InstallModal__sdls">
                  {sdls.map((sdl: SelectiveDownload, idx: number) => (
                    <label
                      key={sdl.name}
                      className="InstallModal__toggle toggleWrapper"
                    >
                      <ToggleSwitch
                        htmlId={`sdls-${idx}`}
                        title={sdl.name}
                        value={
                          !!sdl.mandatory || !!selectedSdls[getUniqueKey(sdl)]
                        }
                        disabled={sdl.mandatory}
                        handleChange={(e) => handleSdl(sdl, e.target.checked)}
                      />
                      <span>{sdl.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {haveDLCs && (
                <div className="InstallModal__dlcs">
                  <label
                    className={classNames('InstallModal__toggle toggleWrapper')}
                  >
                    <ToggleSwitch
                      htmlId="dlcs"
                      value={installDlcs}
                      handleChange={() => handleDlcs()}
                      title={t('dlc.installDlcs', 'Install all DLCs')}
                    />
                    <span>{t('dlc.installDlcs', 'Install all DLCs')}:</span>
                  </label>
                  <div className="InstallModal__dlcsList">
                    {DLCList.map(({ title }) => title).join(', ')}
                  </div>
                </div>
              )}
            </DialogContent>
            <DialogFooter>
              <button
                onClick={async () => handleInstall('import')}
                className={`button is-secondary outline`}
              >
                {t('button.import')}
              </button>
              <button
                onClick={async () => handleInstall()}
                className={`button is-secondary`}
                disabled={notEnoughDiskSpace || !installPath}
              >
                {previousProgress.folder === installPath
                  ? t('button.continue', 'Continue Download')
                  : t('button.install')}
              </button>
            </DialogFooter>
          </>
        ) : (
          <UpdateComponent inline />
        )}
      </Dialog>
    </div>
  )
}
