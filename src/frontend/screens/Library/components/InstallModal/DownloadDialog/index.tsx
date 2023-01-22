import {
  faDownload,
  faHardDrive,
  faSpinner,
  faFolderOpen
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { DialogContent } from '@mui/material'

import classNames from 'classnames'
import {
  AppSettings,
  GameInfo,
  GameStatus,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import { GogInstallInfo } from 'common/types/gog'
import { LegendaryInstallInfo } from 'common/types/legendary'
import {
  SelectField,
  TextInputWithIconField,
  ToggleSwitch
} from 'frontend/components/UI'
import Anticheat from 'frontend/components/UI/Anticheat'
import { DialogHeader, DialogFooter } from 'frontend/components/UI/Dialog'
import {
  getProgress,
  size,
  getInstallInfo,
  getGameInfo,
  writeConfig,
  install
} from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import { InstallProgress } from 'frontend/types'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '../index'
import { SDL_GAMES, SelectiveDownload } from '../selective_dl'
import { configStore } from 'frontend/helpers/electronStores'

interface Props {
  backdropClick: () => void
  appName: string
  runner: Runner
  platformToInstall: InstallPlatform
  availablePlatforms: AvailablePlatforms
  setIsLinuxNative: React.Dispatch<React.SetStateAction<boolean>>
  setIsMacNative: React.Dispatch<React.SetStateAction<boolean>>
  winePrefix: string
  crossoverBottle: string
  wineVersion: WineInstallation | undefined
  children: React.ReactNode
  gameInfo: GameInfo
}

type DiskSpaceInfo = {
  notEnoughDiskSpace: boolean
  message: string | `ERROR`
  validPath: boolean
  spaceLeftAfter: string
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

const { defaultInstallPath } = configStore.get('settings') as AppSettings

export default function DownloadDialog({
  backdropClick,
  appName,
  runner,
  platformToInstall,
  availablePlatforms,
  setIsLinuxNative,
  setIsMacNative,
  winePrefix,
  wineVersion,
  children,
  gameInfo,
  crossoverBottle
}: Props) {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress
  const { libraryStatus, platform, showDialogModal } =
    useContext(ContextProvider)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isWin = platform === 'win32'

  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo | null
  >(null)
  const [installLanguages, setInstallLanguages] = useState(Array<string>())
  const [installLanguage, setInstallLanguage] = useState('')
  const [installPath, setInstallPath] = useState(
    previousProgress.folder || defaultInstallPath
  )
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const [installDlcs, setInstallDlcs] = useState(false)
  const [selectedSdls, setSelectedSdls] = useState<{ [key: string]: boolean }>(
    {}
  )
  const [gettingInstallInfo, setGettingInstallInfo] = useState(false)

  const installFolder = gameStatus?.folder || installPath

  const [spaceLeft, setSpaceLeft] = useState<DiskSpaceInfo>({
    message: '',
    notEnoughDiskSpace: false,
    validPath: true,
    spaceLeftAfter: ''
  })

  const { i18n, t } = useTranslation('gamepage')
  const { t: tr } = useTranslation()

  const sdls: SelectiveDownload[] | undefined = SDL_GAMES[appName]
  const haveSDL = Array.isArray(sdls) && sdls.length !== 0

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
    if (!isWin) {
      const gameSettings = await window.api.requestGameSettings(appName)

      if (wineVersion) {
        writeConfig({
          appName,
          config: {
            ...gameSettings,
            winePrefix,
            wineVersion,
            wineCrossoverBottle: crossoverBottle
          }
        })
      }
    }

    return install({
      gameInfo,
      installPath: path || installFolder,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t,
      sdlList,
      installDlcs,
      installLanguage,
      platformToInstall,
      showDialogModal: () => backdropClick()
    })
  }

  useEffect(() => {
    const getIinstallInfo = async () => {
      try {
        setGettingInstallInfo(true)
        const gameInstallInfo = await getInstallInfo(
          appName,
          runner,
          platformToInstall
        )
        setGameInstallInfo(gameInstallInfo)
        setGettingInstallInfo(false)

        if (
          gameInstallInfo &&
          gameInstallInfo.manifest &&
          'languages' in gameInstallInfo.manifest
        ) {
          setInstallLanguages(gameInstallInfo.manifest.languages)
          setInstallLanguage(
            getInstallLanguage(
              gameInstallInfo.manifest.languages,
              i18n.languages
            )
          )
        }

        if (platformToInstall === 'linux' && runner === 'gog') {
          setGettingInstallInfo(true)
          const installer_languages =
            (await window.api.getGOGLinuxInstallersLangs(appName)) as string[]
          setInstallLanguages(installer_languages)
          setInstallLanguage(
            getInstallLanguage(installer_languages, i18n.languages)
          )
          setGettingInstallInfo(false)
        }
      } catch (error) {
        showDialogModal({
          type: 'ERROR',
          title: tr('box.error.generic.title', 'Error!'),
          message: `${tr('box.error.generic.message', 'Something Went Wrong!')}
          ${error}`
        })
        backdropClick()
        return
      }
    }
    getIinstallInfo()
  }, [appName, i18n.languages, platformToInstall])

  useEffect(() => {
    const getCacheInfo = async () => {
      if (gameInfo) {
        setIsLinuxNative(gameInfo.is_linux_native && isLinux)
        setIsMacNative(gameInfo.is_mac_native && isMac)
      } else {
        const gameData = await getGameInfo(appName, runner)
        setIsLinuxNative((gameData?.is_linux_native && isLinux) ?? false)
        setIsMacNative((gameData?.is_mac_native && isMac) ?? false)
      }
    }
    getCacheInfo()
  }, [appName])

  useEffect(() => {
    const getSpace = async () => {
      const { message, free, validPath } = await window.api.checkDiskSpace(
        installPath
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
    }
    getSpace()
  }, [installPath, gameInstallInfo?.manifest?.disk_size])

  useEffect(() => {
    const getCacheInfo = async () => {
      if (gameInfo) {
        setIsLinuxNative(gameInfo.is_linux_native && isLinux)
        setIsMacNative(gameInfo.is_mac_native && isMac)
      } else {
        const gameData = await getGameInfo(appName, runner)
        if (!gameData) {
          return
        }
        setIsLinuxNative(gameData.is_linux_native && isLinux)
        setIsMacNative(gameData.is_mac_native && isMac)
      }
    }
    getCacheInfo()
  }, [appName])

  const haveDLCs =
    gameInstallInfo && gameInstallInfo?.game?.owned_dlc?.length > 0
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

  const { validPath, notEnoughDiskSpace, message, spaceLeftAfter } = spaceLeft
  const title = gameInfo?.title

  function getInstallLabel() {
    if (installPath) {
      if (notEnoughDiskSpace) {
        return t('button.force-innstall', 'Force Install')
      } else {
        return previousProgress.folder === installPath
          ? t('button.continue', 'Continue Download')
          : t('button.install')
      }
    }
    return t('button.no-path-selected', 'No path selected')
  }

  const readyToInstall =
    installPath &&
    gameInstallInfo?.manifest?.download_size &&
    !gettingInstallInfo

  return (
    <>
      <DialogHeader onClose={backdropClick}>
        {title ? title : '...'}
        {availablePlatforms.map((p) => (
          <FontAwesomeIcon
            className="InstallModal__platformIcon"
            icon={p.icon}
            key={p.value}
          />
        ))}
      </DialogHeader>
      {gameInfo && <Anticheat gameInfo={gameInfo} />}
      <DialogContent>
        <div className="InstallModal__sizes">
          <div className="InstallModal__size">
            <FontAwesomeIcon
              className={classNames('InstallModal__sizeIcon', {
                'fa-spin-pulse': !downloadSize()
              })}
              icon={downloadSize() ? faDownload : faSpinner}
            />
            {downloadSize() ? (
              <>
                <div className="InstallModal__sizeLabel">
                  {t('game.downloadSize', 'Download Size')}:
                </div>
                <div className="InstallModal__sizeValue">{downloadSize()}</div>
              </>
            ) : (
              `${t('game.getting-download-size', 'Geting download size')}...`
            )}
          </div>
          <div className="InstallModal__size">
            <FontAwesomeIcon
              className={classNames('InstallModal__sizeIcon', {
                'fa-spin-pulse': !downloadSize()
              })}
              icon={downloadSize() ? faHardDrive : faSpinner}
            />
            {downloadSize() ? (
              <>
                <div className="InstallModal__sizeLabel">
                  {t('game.installSize', 'Install Size')}:
                </div>
                <div className="InstallModal__sizeValue">{installSize}</div>
              </>
            ) : (
              `${t('game.getting-install-size', 'Geting install size')}...`
            )}
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
          placeholder={defaultInstallPath}
          value={installPath.replaceAll("'", '')}
          onChange={(event) => setInstallPath(event.target.value)}
          icon={<FontAwesomeIcon icon={faFolderOpen} />}
          onIconClick={async () =>
            window.api
              .openDialog({
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('install.path'),
                defaultPath: defaultInstallPath
              })
              .then((path) => setInstallPath(path || defaultInstallPath))
          }
          afterInput={
            gameInstallInfo?.manifest?.download_size ? (
              <span className="smallInputInfo">
                {validPath && (
                  <>
                    <span>
                      {`${t('install.disk-space-left', 'Space Available')}: `}
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
            ) : null
          }
        />
        {children}
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
                  value={!!sdl.mandatory || !!selectedSdls[getUniqueKey(sdl)]}
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
            <label className={classNames('InstallModal__toggle toggleWrapper')}>
              <ToggleSwitch
                htmlId="dlcs"
                value={installDlcs}
                handleChange={() => handleDlcs()}
                title={t('dlc.installDlcs', 'Install all DLCs')}
              />
              <span>{t('dlc.installDlcs', 'Install all DLCs')}:</span>
            </label>
            <div className="InstallModal__dlcsList">
              {DLCList?.map(({ title }) => title).join(', ')}
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
          disabled={!readyToInstall}
        >
          {!readyToInstall && (
            <FontAwesomeIcon className="fa-spin-pulse" icon={faSpinner} />
          )}
          {readyToInstall && getInstallLabel()}
        </button>
      </DialogFooter>
    </>
  )
}
