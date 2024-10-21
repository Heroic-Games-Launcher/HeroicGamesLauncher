import { GameInfo } from 'common/types'
import { BuildItem, GogInstallInfo } from 'common/types/gog'
import {
  InfoBox,
  ToggleSwitch,
  UpdateComponent,
  TabPanel
} from 'frontend/components/UI'
import { getInstallInfo, getPreferredInstallLanguage } from 'frontend/helpers'
import DLCDownloadListing from 'frontend/screens/Library/components/InstallModal/DownloadDialog/DLCDownloadListing'
import React, { useEffect, useState } from 'react'
import { Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import BuildSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/BuildSelector'
import GameLanguageSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/GameLanguageSelector'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripLines } from '@fortawesome/free-solid-svg-icons'
import { faXmarkCircle } from '@fortawesome/free-regular-svg-icons'
import BranchSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/BranchSelector'

interface GOGModifyInstallModal {
  gameInfo: GameInfo
  onClose: () => void
}

export default function GOGModifyInstallModal({
  gameInfo,
  onClose
}: GOGModifyInstallModal) {
  const { t, i18n } = useTranslation('gamepage')
  const { t: tr } = useTranslation()
  const isLinux = gameInfo.install.platform === 'linux'
  const [gameInstallInfo, setGameInstallInfo] = useState<GogInstallInfo>()

  const [installLanguages, setInstallLanguages] = useState<string[]>([])
  const [installLanguage, setInstallLanguage] = useState<string>(
    gameInfo.install.language ?? 'en-US'
  )

  const [branches, setBranches] = useState<Array<string | null>>([])
  const [branch, setBranch] = useState<string | undefined>(
    gameInfo.install.branch
  )
  const [savedBranchPassword, setSavedBranchPassword] = useState<string>('')

  // undefined means latest from current branch
  const [selectedBuild, setSelectedBuild] = useState<string | undefined>(
    gameInfo.install.pinnedVersion ? gameInfo.install.buildId : undefined
  )
  const [builds, setBuilds] = useState<BuildItem[]>([])

  const [installedDlcs, setInstalledDlcs] = useState<string[]>([])

  const [detectedMods, setDetectedMods] = useState<string[]>([])
  const [enabledModsList, setEnabledModsList] = useState<string[]>(
    gameInfo.install.cyberpunk?.modsToLoad || []
  )
  const [modsEnabled, setModsEnabled] = useState<boolean>(
    gameInfo.install.cyberpunk?.modsEnabled || false
  )

  const redModInstalled = gameInfo.install.installedDLCs?.includes('1597316373')

  const [currentTab, setCurrentTab] = useState('updates')

  const handleConfirm = () => {
    const gameBuild = selectedBuild || builds[0]?.build_id
    const versionPinned = !!selectedBuild
    const buildModified = gameBuild !== gameInfo.install.buildId
    const languageModified = installLanguage !== gameInfo.install.language
    const branchModified = branch !== gameInfo.install.branch

    const currentDlcs = (gameInfo.install.installedDLCs || []).sort()
    const sortedChoice = installedDlcs.sort()
    const dlcLengthModified = installedDlcs.length !== currentDlcs.length
    let dlcIdsModified = false
    if (!dlcLengthModified) {
      for (const index in currentDlcs) {
        if (currentDlcs[index] !== sortedChoice[index]) {
          dlcIdsModified = true
          break
        }
      }
    }

    const dlcModified = dlcLengthModified || dlcIdsModified

    if (redModInstalled) {
      const sortedMods = []
      for (const mod of detectedMods) {
        if (enabledModsList.includes(mod)) {
          sortedMods.push(mod)
        }
      }
      window.api.setCyberpunModConfig({
        enabled: modsEnabled,
        modsToLoad: sortedMods
      })
    }

    const gameModified =
      (!isLinux && (buildModified || branchModified)) ||
      languageModified ||
      dlcModified

    if (gameModified) {
      // Create update
      window.api.updateGame({
        gameInfo,
        appName: gameInfo.app_name,
        runner: gameInfo.runner,
        installDlcs: installedDlcs,
        installLanguage: installLanguage,
        branch: branch,
        build: selectedBuild
      })
    }

    // Update version pin
    window.api.changeGameVersionPinnedStatus(
      gameInfo.app_name,
      gameInfo.runner,
      versionPinned
    )

    onClose()
  }

  useEffect(() => {
    async function get() {
      const branchPassword = await window.api.getPrivateBranchPassword(
        gameInfo.app_name
      )
      setSavedBranchPassword(branchPassword)
    }
    get()
  }, [])

  useEffect(() => {
    async function get() {
      const installInfo = (await getInstallInfo(
        gameInfo.app_name,
        'gog',
        gameInfo.install.platform || 'windows',
        undefined,
        branch || gameInfo.install.branch
      )) as GogInstallInfo | null
      if (!installInfo) {
        // TODO: Handle error
        return
      }
      setGameInstallInfo(installInfo)
    }
    get()
  }, [branch, savedBranchPassword])

  useEffect(() => {
    if (gameInstallInfo && 'builds' in gameInstallInfo.manifest) {
      const currentBranch = branch || null
      const newBuilds = (gameInstallInfo.manifest.builds || [])
        .filter((build) => build.branch === currentBranch)
        .sort(
          (a, b) =>
            new Date(b.date_published).getTime() -
            new Date(a.date_published).getTime()
        )
      const currentBuildInList = newBuilds.find(
        (build) => build.build_id === gameInfo.install.buildId
      )
      /*if (branch === gameInfo.install.branch) {
        setCurrentBuildNotAvailable(!currentBuildInList)
      }*/
      if (newBuilds.length > 0) {
        const newBuild = currentBuildInList
          ? gameInfo.install.buildId
          : newBuilds[0].build_id
        setSelectedBuild(selectedBuild ? newBuild : undefined)
      }
      setBuilds(newBuilds)
    }
  }, [gameInstallInfo, branch, gameInfo.install])

  useEffect(() => {
    if (gameInstallInfo) {
      if ('languages' in gameInstallInfo.manifest) {
        setInstallLanguages(gameInstallInfo.manifest.languages.sort())
        if (!gameInstallInfo.manifest.languages.includes(installLanguage)) {
          setInstallLanguage(
            getPreferredInstallLanguage(
              gameInstallInfo.manifest.languages,
              i18n.languages
            )
          )
        }
      }

      if ('branches' in gameInstallInfo.game) {
        setBranches(gameInstallInfo.game.branches || [])
      }

      setInstalledDlcs(gameInfo.install.installedDLCs || [])
    }
  }, [gameInstallInfo, gameInfo.install])

  // Mods
  useEffect(() => {
    const get = async () => {
      if (redModInstalled) {
        const mods = await window.api.getAvailableCyberpunkMods()
        const sortedMods: string[] = []
        // Apply sorting of enabled mods
        for (const mod of enabledModsList) {
          if (mods.includes(mod)) {
            sortedMods.push(mod)
          }
        }
        const rest = mods.filter((mod) => !sortedMods.includes(mod))
        const detMods = [...sortedMods, ...rest]
        setDetectedMods(detMods)
        if (!enabledModsList.length) {
          setEnabledModsList(detMods)
        }
      }
    }
    get()
  }, [redModInstalled])

  const DLCList = gameInstallInfo?.game.owned_dlc || []

  return gameInstallInfo ? (
    <>
      <Tabs
        value={currentTab}
        onChange={(e, newVal) => setCurrentTab(newVal)}
        aria-label="settings tabs"
        variant="scrollable"
      >
        <Tab
          value={'updates'}
          label={t('modifyInstall.versionCollapsable', 'Game Version')}
        />
        <Tab value={'dlc'} label={t('modifyInstall.dlcsCollapsible', 'DLC')} />
        {redModInstalled && (
          <Tab
            value={'redmod'}
            label={t('modifyInstall.redMod.collapsible', 'REDmod Integration')}
          />
        )}
      </Tabs>
      <TabPanel value={currentTab} index={'updates'}>
        {!!branches.length && (
          <div className="ModifyInstall__branch">
            <BranchSelector
              appName={gameInfo.app_name}
              branches={branches}
              branch={branch}
              setBranch={setBranch}
              savedBranchPassword={savedBranchPassword}
              onPasswordChange={(newPasswd) =>
                setSavedBranchPassword(newPasswd)
              }
            />
          </div>
        )}

        <div className="ModifyInstall__languages">
          <GameLanguageSelector
            installLanguages={installLanguages}
            setInstallLanguage={setInstallLanguage}
            installPlatform={gameInfo.install.platform ?? 'windows'}
            installLanguage={installLanguage}
          />
        </div>

        {!!builds.length && (
          <div className="ModifyInstall__version">
            <BuildSelector
              gameBuilds={builds}
              selectedBuild={selectedBuild}
              setSelectedBuild={setSelectedBuild}
            />
          </div>
        )}
      </TabPanel>
      <TabPanel value={currentTab} index={'dlc'}>
        <div className="ModifyInstall__gogDlcs">
          {DLCList.length > 0 ? (
            <DLCDownloadListing
              DLCList={DLCList}
              dlcsToInstall={installedDlcs}
              setDlcsToInstall={setInstalledDlcs}
            />
          ) : (
            <div className="emptyState">
              <FontAwesomeIcon icon={faXmarkCircle} />
              <p>{t('modifyInstall.nodlcs', 'No DLC available')}</p>
            </div>
          )}
        </div>
      </TabPanel>

      {/* REDMod compatibility */}
      <TabPanel value={currentTab} index={'redmod'}>
        <DragDropContext
          onDragEnd={(result) => {
            const { source, destination } = result

            if (!destination) {
              return
            }

            if (
              destination.droppableId === source.droppableId &&
              destination.index === source.index
            ) {
              return
            }

            const newModsArray = [...detectedMods]
            const removed = newModsArray.splice(source.index, 1)
            newModsArray.splice(destination.index, 0, ...removed)

            setDetectedMods(newModsArray)
          }}
        >
          <div className="ModifyInstall__redMod">
            <label htmlFor="REDenableMods">
              <ToggleSwitch
                htmlId="REDenableMods"
                value={modsEnabled}
                handleChange={() => setModsEnabled(!modsEnabled)}
                title={t('modifyInstall.redMod.enable', 'Enable mods')}
              />
            </label>

            <div className="modsHelpWrapper">
              <InfoBox text="infobox.help">
                <p>The list below contains all mods detected by REDmod.</p>
                <p>
                  Mods can be reordered, which will alter the load order. E.g if
                  two mods modify same file, the mod that is lower in the list
                  will overwrite the changes of the other one.
                </p>
                <p>At least one mod has to be enabled</p>
                <p>
                  Checkbox &quot;Enable mods&quot; decides whether the game
                  should be launched with mods. Mod deployment log can be found
                  within the game log
                </p>
              </InfoBox>
            </div>

            <Droppable droppableId="mods">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  className={classNames('mods', {
                    draggingOver: snapshot.isDraggingOver
                  })}
                  {...provided.droppableProps}
                >
                  {detectedMods.map((mod, index) => (
                    <Draggable
                      key={`mod-${mod}`}
                      draggableId={mod}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="modDraggable"
                        >
                          <label htmlFor={`mod-${mod}`}>
                            <ToggleSwitch
                              htmlId={`mod-${mod}`}
                              title={mod}
                              value={enabledModsList.includes(mod)}
                              handleChange={() => {
                                const enabled = enabledModsList.includes(mod)
                                const enabledList = [...enabledModsList]
                                if (enabled) {
                                  // We need to have at least one mod enabled for this feature to work
                                  if (enabledModsList.length === 1) {
                                    return
                                  }
                                  // Remove
                                  const index = enabledList.findIndex(
                                    (modL) => modL === mod
                                  )
                                  enabledList.splice(index, 1)
                                } else {
                                  // Add
                                  enabledList.push(mod)
                                }
                                setEnabledModsList(enabledList)
                              }}
                            />
                          </label>
                          <div {...provided.dragHandleProps}>
                            <FontAwesomeIcon icon={faGripLines} width={40} />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </TabPanel>

      <button className="button is-success" onClick={handleConfirm}>
        {tr('box.apply', 'Apply')}
      </button>
    </>
  ) : (
    <UpdateComponent inline />
  )
}
