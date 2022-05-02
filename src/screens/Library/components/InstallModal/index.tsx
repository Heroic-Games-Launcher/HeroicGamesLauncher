import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import {
  faSpinner,
  faDownload,
  faFolderOpen,
  faHardDrive
} from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import classNames from 'classnames'
import { IpcRenderer } from 'electron'
import prettyBytes from 'pretty-bytes'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { UpdateComponent } from 'src/components/UI'
import {
  getAppSettings,
  getGameInfo,
  getInstallInfo,
  getProgress,
  install,
  writeConfig
} from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import {
  AppSettings,
  GameStatus,
  InstallInfo,
  InstallProgress,
  Path,
  Runner,
  WineInstallation
} from 'src/types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'src/components/UI/Dialog'
import FormControl from 'src/components/UI/FormControl'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import './index.css'

import { SDL_GAMES, SelectiveDownload } from './selective_dl'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

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
  const { libraryStatus, handleGameStatus, platform } =
    useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]
  const [gameInstallInfo, setGameInfo] = useState({} as InstallInfo)
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

  const installFolder = gameStatus?.folder || installPath

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'

  const [isLinuxNative, setIsLinuxNative] = useState(false)
  const [isMacNative, setIsMacNative] = useState(false)

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
      const appSettings: AppSettings = await ipcRenderer.invoke(
        'requestSettings',
        appName
      )

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
      runner
    })
  }

  useEffect(() => {
    ipcRenderer
      .invoke('requestSettings', 'default')
      .then((config: AppSettings) => {
        setDefaultPath(config.defaultInstallPath)
        if (installPath === 'default') {
          setInstallPath(config.defaultInstallPath)
        }
      })
    return () => {
      ipcRenderer.removeAllListeners('requestSettings')
    }
  }, [appName, installPath])

  useEffect(() => {
    const getInfo = async () => {
      const gameInstallInfo = await getInstallInfo(appName, runner)
      const gameInfo = await getGameInfo(appName, runner)
      if (!gameInstallInfo) {
        ipcRenderer.invoke('showErrorBox', [
          tr('box.error.generic.title'),
          tr('box.error.generic.message')
        ])
        backdropClick()
        return
      }
      const gameData = await getGameInfo(appName, runner)
      setGameInfo(gameInstallInfo)
      if (gameInstallInfo.manifest?.languages) {
        setInstallLanguages(gameInstallInfo.manifest.languages)
        setInstallLanguage(
          getInstallLanguage(gameInstallInfo.manifest.languages, i18n.languages)
        )
      }
      setIsLinuxNative(gameData.is_linux_native && isLinux)
      setIsMacNative(gameData.is_mac_native && isMac)
      if (isLinux && gameData.is_linux_native && runner == 'gog') {
        const installer_languages = (await ipcRenderer.invoke(
          'getGOGLinuxInstallersLangs',
          appName
        )) as string[]
        setInstallLanguages(installer_languages)
        setInstallLanguage(
          getInstallLanguage(installer_languages, i18n.languages)
        )
      }
      const bottleName = gameInfo.folder_name
      const { defaultWinePrefix, wineVersion } = await getAppSettings()
      const sugestedWinePrefix = `${defaultWinePrefix}/${bottleName}`
      setWinePrefix(sugestedWinePrefix)
      setWineVersion(wineVersion || undefined)
    }
    getInfo()
  }, [appName, i18n.languages])

  const haveDLCs = gameInstallInfo?.game?.owned_dlc?.length > 0
  const DLCList = gameInstallInfo?.game?.owned_dlc
  const downloadSize =
    gameInstallInfo?.manifest?.download_size &&
    prettyBytes(Number(gameInstallInfo?.manifest?.download_size))
  const installSize =
    gameInstallInfo?.manifest?.disk_size &&
    prettyBytes(Number(gameInstallInfo?.manifest?.disk_size))

  function getIcon() {
    if (isMacNative) {
      return faApple
    } else if (isLinuxNative) {
      return faLinux
    } else {
      return faWindows
    }
  }

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
  }, [i18n.language])

  const hasWine = isLinux && !isLinuxNative

  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])
  useEffect(() => {
    if (hasWine) {
      ;(async () => {
        const newWineList: WineInstallation[] = await ipcRenderer.invoke(
          'getAlternativeWine'
        )
        if (Array.isArray(newWineList)) {
          setWineVersionList(newWineList)
          if (
            !newWineList.some(
              (newWine) => wineVersion && newWine.bin === wineVersion.bin
            )
          ) {
            setWineVersion(undefined)
          }
        }
      })()
    }
  }, [hasWine, wineVersion])

  const title = gameInstallInfo?.game?.title

  return (
    <div className="InstallModal">
      <Dialog
        onClose={backdropClick}
        className={cx('InstallModal__dialog', {
          'InstallModal__dialog--loading': !title
        })}
      >
        {title ? (
          <>
            <DialogHeader onClose={backdropClick}>
              {title}
              <FontAwesomeIcon
                className="InstallModal__platformIcon"
                icon={getIcon()}
              />
            </DialogHeader>
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
                  <div className="InstallModal__sizeValue">{downloadSize}</div>
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
              {installLanguages && installLanguages?.length > 1 && (
                <div className="InstallModal__control">
                  <div className="InstallModal__controlLabel">
                    {t('game.language', 'Language')}:
                  </div>
                  <div className="InstallModal__controlInput">
                    <FormControl select>
                      <select
                        className="FormControl__select"
                        name="language"
                        id="languagePick"
                        value={installLanguage}
                        onChange={(e) => setInstallLanguage(e.target.value)}
                      >
                        {installLanguages &&
                          installLanguages.map((value) => (
                            <option value={value} key={value}>
                              {getLanguageName(value)}
                            </option>
                          ))}
                      </select>
                    </FormControl>
                  </div>
                </div>
              )}
              <div className="InstallModal__control">
                <div className="InstallModal__controlLabel">
                  {t('install.path', 'Select Install Path')}:
                </div>
                <div className="InstallModal__controlInput">
                  <FormControl
                    sideButton={
                      <button
                        className="FormControl__sideButton"
                        onClick={async () =>
                          ipcRenderer
                            .invoke('openDialog', {
                              buttonLabel: t('box.choose'),
                              properties: ['openDirectory'],
                              title: t('install.path')
                            })
                            .then(({ path }: Path) =>
                              setInstallPath(path ? path : defaultPath)
                            )
                        }
                      >
                        <FontAwesomeIcon icon={faFolderOpen} />
                      </button>
                    }
                  >
                    <input
                      type="text"
                      data-testid="setinstallpath"
                      className="FormControl__input"
                      placeholder={defaultPath}
                      value={installPath.replaceAll("'", '')}
                      onChange={(event) => setInstallPath(event.target.value)}
                    />
                  </FormControl>
                </div>
              </div>
              {hasWine && (
                <>
                  <div className="InstallModal__control">
                    <div className="InstallModal__controlLabel">
                      {t('install.wineprefix', 'WinePrefix')}:
                    </div>
                    <div className="InstallModal__controlInput">
                      <FormControl
                        sideButton={
                          <button
                            className="FormControl__sideButton"
                            onClick={async () =>
                              ipcRenderer
                                .invoke('openDialog', {
                                  buttonLabel: t('box.choose'),
                                  properties: ['openDirectory'],
                                  title: t(
                                    'box.wineprefix',
                                    'Select WinePrefix Folder'
                                  )
                                })
                                .then(({ path }: Path) =>
                                  setWinePrefix(path ? path : winePrefix)
                                )
                            }
                          >
                            <FontAwesomeIcon icon={faFolderOpen} />
                          </button>
                        }
                      >
                        <input
                          type="text"
                          data-testid="setinstallpath"
                          className="FormControl__input"
                          placeholder={winePrefix}
                          value={winePrefix.replaceAll("'", '')}
                          onChange={(event) =>
                            setWinePrefix(event.target.value)
                          }
                        />
                      </FormControl>
                    </div>
                  </div>
                  <div className="InstallModal__control">
                    <div className="InstallModal__controlLabel">
                      {t('install.wineversion')}:
                    </div>
                    <div className="InstallModal__controlInput">
                      <FormControl select>
                        <select
                          className="FormControl__select"
                          name="wineVersion"
                          value={wineVersion && wineVersion.bin}
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
                        </select>
                      </FormControl>
                    </div>
                  </div>
                </>
              )}
              {(haveDLCs || haveSDL) && (
                <div className="InstallModal__sectionHeader">
                  {t('sdl.title', 'Select components to Install')}:
                </div>
              )}
              {haveSDL && (
                <div className="InstallModal__sdls">
                  {sdls.map((sdl: SelectiveDownload) => (
                    <label
                      key={sdl.name}
                      className="InstallModal__toggle toggleWrapper"
                    >
                      <ToggleSwitch
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
