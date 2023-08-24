import {
  faDownload,
  faHardDrive,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import classNames from 'classnames'
import {
  GameInfo,
  GameStatus,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import {
  BuildItem,
  GogInstallInfo,
  DLCInfo as GOGDLCInfo
} from 'common/types/gog'
import {
  DLCInfo as LegendaryDLCInfo,
  LegendaryInstallInfo,
  SelectiveDownload
} from 'common/types/legendary'
import {
  PathSelectionBox,
  SelectField,
  ToggleSwitch
} from 'frontend/components/UI'
import Anticheat from 'frontend/components/UI/Anticheat'
import {
  DialogHeader,
  DialogFooter,
  DialogContent
} from 'frontend/components/UI/Dialog'
import {
  getProgress,
  size,
  getInstallInfo,
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
import { configStore } from 'frontend/helpers/electronStores'
import DLCDownloadListing from './DLCDownloadListing'
import { NileInstallInfo } from 'common/types/nile'

interface Props {
  backdropClick: () => void
  appName: string
  runner: Runner
  platformToInstall: InstallPlatform
  availablePlatforms: AvailablePlatforms
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
  if (sdl.tags) {
    return sdl.tags.join(',')
  }
  return ''
}

const userHome = configStore.get('userHome', '')

function getDefaultInstallPath() {
  const { defaultInstallPath = `${userHome}/Games/Heroic` } = {
    ...configStore.get_nodefault('settings')
  }
  return defaultInstallPath
}

export default function DownloadDialog({
  backdropClick,
  appName,
  runner,
  platformToInstall,
  availablePlatforms,
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

  const isWin = platform === 'win32'

  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo | NileInstallInfo | null
  >(null)
  const [installLanguages, setInstallLanguages] = useState(Array<string>())
  const [installLanguage, setInstallLanguage] = useState('')

  const [diskSize, setDiskSize] = useState(0)

  const [gameBuilds, setBuilds] = useState<BuildItem[]>([])
  const [selectedBuild, setSelectedBuild] = useState<string | undefined>()

  const [installPath, setInstallPath] = useState(
    previousProgress.folder || getDefaultInstallPath()
  )
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const [dlcsToInstall, setDlcsToInstall] = useState<string[]>([])
  const [sdls, setSdls] = useState<SelectiveDownload[]>([])
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

  const haveSDL = sdls.length > 0

  const sdlList = useMemo(() => {
    const list = []
    if (haveSDL) {
      for (const sdl of sdls) {
        if (sdl.required || selectedSdls[getUniqueKey(sdl)]) {
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
      installDlcs: dlcsToInstall,
      installLanguage,
      platformToInstall,
      build: selectedBuild,
      showDialogModal: () => backdropClick()
    })
  }

  useEffect(() => {
    const getIinstInfo = async () => {
      try {
        const fetchedPlatform = platformToInstall
        setGettingInstallInfo(true)
        const gameInstallInfo = await getInstallInfo(
          appName,
          runner,
          platformToInstall,
          selectedBuild
        )
        setGameInstallInfo(gameInstallInfo)
        setGettingInstallInfo(false)

        // Prevent condition when user changes the platform before we reach this point
        if (platformToInstall !== fetchedPlatform) {
          return
        }

        if (gameInstallInfo && gameInstallInfo.manifest) {
          setDiskSize(gameInstallInfo.manifest?.disk_size ?? 0)
        }

        if (gameInstallInfo) {
          if (
            gameInstallInfo.manifest &&
            'builds' in gameInstallInfo.manifest
          ) {
            const builds = (gameInstallInfo.manifest.builds || [])
              .filter((build) => !build.branch)
              .sort(
                (a, b) =>
                  new Date(b.date_published).getTime() -
                  new Date(a.date_published).getTime()
              )
            setBuilds(builds)
          }

          if (
            gameInstallInfo.manifest &&
            'languages' in gameInstallInfo.manifest
          ) {
            setInstallLanguages(gameInstallInfo.manifest.languages.sort())
            if (!gameInstallInfo.manifest.languages.includes(installLanguage)) {
              setInstallLanguage(
                getInstallLanguage(
                  gameInstallInfo.manifest.languages,
                  i18n.languages
                )
              )
            }
          }
        }

        if (platformToInstall === 'linux' && runner === 'gog') {
          setGettingInstallInfo(true)
          const installer_languages =
            await window.api.getGOGLinuxInstallersLangs(appName)
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
    getIinstInfo()
  }, [appName, i18n.languages, platformToInstall, selectedBuild])

  useEffect(() => {
    const getGameSdl = async () => {
      if (runner === 'legendary') {
        const { sdl_config } = await window.api.getGameOverride()
        if (sdl_config && sdl_config[appName]) {
          const sdl = await window.api.getGameSdl(appName)
          if (sdl.length > 0) {
            setSdls(sdl)
          }
        }
      }
    }
    getGameSdl()
  }, [appName, runner])

  useEffect(() => {
    const getSpace = async () => {
      const { message, free, validPath } = await window.api.checkDiskSpace(
        installPath
      )
      if (diskSize) {
        let notEnoughDiskSpace = free < diskSize
        let spaceLeftAfter = size(free - diskSize)
        if (previousProgress.folder === installPath) {
          const progress = 100 - getProgress(previousProgress)
          notEnoughDiskSpace = free < (progress / 100) * diskSize

          spaceLeftAfter = size(free - (progress / 100) * diskSize)
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
  }, [installPath, diskSize])

  const haveDLCs =
    gameInstallInfo && gameInstallInfo?.game?.owned_dlc?.length > 0
  const DLCList: Array<GOGDLCInfo | LegendaryDLCInfo> =
    gameInstallInfo?.game?.owned_dlc ?? []

  const downloadSize = useMemo(() => {
    if (
      gameInstallInfo &&
      'perLangSize' in gameInstallInfo.manifest &&
      platformToInstall !== 'linux'
    ) {
      const languageSize =
        gameInstallInfo?.manifest?.perLangSize[installLanguage]
          ?.download_size ?? 0
      const universalSize =
        gameInstallInfo?.manifest?.perLangSize['*']?.download_size ?? 0

      const dlcSize = DLCList.reduce((acc, dlc) => {
        if (dlcsToInstall.includes(dlc.app_name) && 'perLangSize' in dlc) {
          const languageSize =
            dlc.perLangSize[installLanguage]?.download_size ?? 0
          const universalSize = dlc.perLangSize['*']?.download_size ?? 0
          acc += languageSize + universalSize
        }
        return acc
      }, 0 as number)

      return size(languageSize + universalSize + dlcSize)
    }
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
  }, [installPath, gameInstallInfo, installLanguage, dlcsToInstall])

  const installSize = useMemo(() => {
    if (
      gameInstallInfo &&
      'perLangSize' in gameInstallInfo.manifest &&
      platformToInstall !== 'linux'
    ) {
      const languageSize =
        gameInstallInfo?.manifest?.perLangSize[installLanguage]?.disk_size ?? 0
      const universalSize =
        gameInstallInfo?.manifest?.perLangSize['*']?.disk_size ?? 0
      const dlcSize = DLCList.reduce((acc, dlc) => {
        if (dlcsToInstall.includes(dlc.app_name) && 'perLangSize' in dlc) {
          const languageSize = dlc.perLangSize[installLanguage]?.disk_size ?? 0
          const universalSize = dlc.perLangSize['*']?.disk_size ?? 0
          acc += languageSize + universalSize
        }
        return acc
      }, 0)
      setDiskSize(languageSize + universalSize + dlcSize)
      return size(languageSize + universalSize + dlcSize)
    }

    if (gameInstallInfo?.manifest?.disk_size) {
      return size(Number(gameInstallInfo?.manifest?.disk_size))
    }

    return ''
  }, [gameInstallInfo, installLanguage, platformToInstall, dlcsToInstall])

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

  const getFormattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.languages)
  }

  const readyToInstall = installPath && downloadSize && !gettingInstallInfo

  const showDlcSelector =
    ['legendary', 'gog'].includes(runner) && DLCList && DLCList?.length > 0

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
                'fa-spin-pulse': !downloadSize
              })}
              icon={downloadSize ? faDownload : faSpinner}
            />
            {downloadSize ? (
              <>
                <div className="InstallModal__sizeLabel">
                  {t('game.downloadSize', 'Download Size')}:
                </div>
                <div className="InstallModal__sizeValue">{downloadSize}</div>
              </>
            ) : (
              `${t('game.getting-download-size', 'Geting download size')}...`
            )}
          </div>
          <div className="InstallModal__size">
            <FontAwesomeIcon
              className={classNames('InstallModal__sizeIcon', {
                'fa-spin-pulse': !downloadSize
              })}
              icon={downloadSize ? faHardDrive : faSpinner}
            />
            {downloadSize ? (
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

        <PathSelectionBox
          type="directory"
          onPathChange={setInstallPath}
          path={installPath}
          placeholder={getDefaultInstallPath()}
          pathDialogTitle={t('install.path')}
          pathDialogDefaultPath={getDefaultInstallPath()}
          htmlId="setinstallpath"
          label={t('install.path', 'Select Install Path')}
          noDeleteButton
          afterInput={
            downloadSize ? (
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
                  <span className="warning">
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
        {platformToInstall !== 'linux' && !!gameBuilds.length && (
          <div>
            <ToggleSwitch
              title={`${t('game.builds.toggle', 'Keep game up to date')}`}
              htmlId="buildsSelectorToggle"
              value={!selectedBuild}
              handleChange={() => {
                if (selectedBuild) {
                  setSelectedBuild(undefined)
                } else {
                  setSelectedBuild(gameBuilds[0].build_id)
                }
              }}
            />

            {!!selectedBuild && !!gameBuilds.length && (
              <SelectField
                label={`${t(
                  'game.builds.buildsSelector',
                  'Select Game Version'
                )}`}
                htmlId="buildsSelectorField"
                value={selectedBuild}
                disabled={gameBuilds.length <= 1}
                onChange={(e) => setSelectedBuild(e.target.value)}
              >
                {gameBuilds.map((build) => (
                  <option
                    key={`build-${build.build_id}`}
                    value={build.build_id}
                  >
                    <>
                      {t('game.builds.version', 'Version')} {build.version_name}{' '}
                      - {getFormattedDate(build.date_published)}
                    </>
                  </option>
                ))}
              </SelectField>
            )}
          </div>
        )}
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
                  extraClass="InstallModal__toggle--sdl"
                  value={!!sdl.required || !!selectedSdls[getUniqueKey(sdl)]}
                  disabled={sdl.required}
                  handleChange={(e) => handleSdl(sdl, e.target.checked)}
                />
              </label>
            ))}
          </div>
        )}
        {showDlcSelector && (
          <DLCDownloadListing
            DLCList={DLCList}
            dlcsToInstall={dlcsToInstall}
            setDlcsToInstall={setDlcsToInstall}
          />
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
