import { existsSync } from 'graceful-fs'
import path from 'node:path'
import { InstalledInfo, WineCommandArgs } from 'common/types'
import {
  checkWineBeforeLaunch,
  sendGameStatusUpdate,
  spawnAsync
} from '../../utils'
import { GameConfig } from '../../game_config'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import {
  gogdlConfigPath,
  gogRedistPath,
  gogSupportPath,
  isWindows
} from '../../constants'
import { getWinePath, runWineCommand, verifyWinePrefix } from '../../launcher'
import { getGameInfo as getGogLibraryGameInfo } from 'backend/storeManagers/gog/library'
import { readFile } from 'node:fs/promises'
import shlex from 'shlex'
import {
  GOGRedistManifest,
  GOGv1Manifest,
  GOGv2Manifest
} from 'common/types/gog'

/*
 * Automatially executes command properly according to operating system
 *  on Windows pre-appends powershell command to spawn UAC prompt
 */
async function runSetupCommand(wineArgs: WineCommandArgs) {
  if (isWindows) {
    // Run shell
    const [exe, ...args] = wineArgs.commandParts
    return spawnAsync(
      'powershell',
      [
        '-NoProfile',
        'Start-Process',
        '-FilePath',
        exe,
        '-Verb',
        'RunAs',
        '-Wait',
        '-ArgumentList',
        // TODO: Verify how Powershell will handle those
        args
          .map((argument) => {
            if (argument.includes(' ')) {
              // Add super quotes:tm:
              argument = '`"' + argument + '`"'
            }
            // Add normal quotes
            argument = '"' + argument + '"'
            return argument
          })
          .join(',')
      ],
      { cwd: wineArgs.startFolder }
    )
  } else {
    return runWineCommand(wineArgs)
  }
}

/**
 * Handles setup instructions like create folders, move files, run exe, create registry entry etc...
 * For Galaxy games only (Windows)
 * As long as wine menu builder is disabled we shouldn't have trash application
 * menu entries
 * @param appName
 * @param installInfo Allows passing install instructions directly
 */
async function setup(
  appName: string,
  installInfo?: InstalledInfo,
  installRedist = true
): Promise<void> {
  const gameInfo = getGogLibraryGameInfo(appName)
  if (installInfo && gameInfo) {
    gameInfo.install = installInfo
  }
  if (!gameInfo || gameInfo.install.platform !== 'windows') {
    return
  }

  const gameSettings = GameConfig.get(appName).config
  if (!isWindows) {
    const isWineOkToLaunch = await checkWineBeforeLaunch(gameInfo, gameSettings)

    if (!isWineOkToLaunch) {
      logError(
        `Was not possible to run setup using ${gameSettings.wineVersion.name}`,
        LogPrefix.Backend
      )
      return
    }
    // Make sure prefix is initalized correctly
    await verifyWinePrefix(gameSettings)
  }

  // Read game manifest
  const manifestPath = path.join(gogdlConfigPath, 'manifests', appName)

  if (!existsSync(manifestPath)) {
    logWarning(
      [
        'SETUP: no manifest for',
        gameInfo.title,
        "unable to continue setup, this shouldn't cause much issues with modern games, but some older titles may need special registry keys"
      ],
      { prefix: LogPrefix.Gog }
    )
    return
  }

  const manifestDataRaw = await readFile(manifestPath, { encoding: 'utf8' })

  let manifestData: GOGv1Manifest | GOGv2Manifest
  try {
    manifestData = JSON.parse(manifestDataRaw)
  } catch (e) {
    logError(['SETUP: Failed to parse game manifest', e], {
      prefix: LogPrefix.Gog
    })
    return
  }

  let gameSupportDir = path.join(gogSupportPath, appName) // This doesn't need to exist, scriptinterpreter.exe will handle it gracefully

  const installLanguage = gameInfo.install.language?.split('-')[0]
  const languages = new Intl.DisplayNames(['en'], { type: 'language' })
  const lang: string | undefined = languages.of(installLanguage!)

  const dependencies: string[] = []
  let gameDirectoryPath = gameInfo.install.install_path!

  // Do a pass on dependencies
  if (manifestData.version === 1) {
    // Find redist depots and push to dependency installer
    for (const depot of manifestData.product.depots) {
      if ('redist' in depot && !dependencies.includes(depot.redist)) {
        dependencies.push(depot.redist)
      }
    }
  } else {
    for (const dep of manifestData.dependencies || []) {
      if (!dependencies.includes(dep)) {
        dependencies.push(dep)
      }
    }
  }

  // When there is no scummvm in dependencies, proceed with windows paths
  if (!isWindows) {
    if (!dependencies.find((dep) => dep.toLowerCase() === 'scummvm')) {
      gameSupportDir = await getWinePath({
        path: gameSupportDir,
        gameSettings,
        variant: 'win'
      })
      gameDirectoryPath = await getWinePath({
        path: gameDirectoryPath,
        gameSettings,
        variant: 'win'
      })
    }
  }

  sendGameStatusUpdate({
    appName,
    runner: 'gog',
    status: 'redist',
    context: 'GOG'
  })
  if (manifestData.version === 1) {
    if (existsSync(path.join(gogSupportPath, appName))) {
      for (const supportCommand of manifestData.product?.support_commands ||
        []) {
        if (
          supportCommand.languages.includes(
            gameInfo.install.language ?? 'English'
          ) ||
          supportCommand.languages.includes('Neutral')
        ) {
          const absPath = path.join(
            gogSupportPath,
            appName,
            supportCommand.gameID,
            supportCommand.executable
          )
          const language = (lang || installLanguage || 'English').toLowerCase()

          const exeArgs = [
            '/VERYSILENT',
            `/DIR=${gameDirectoryPath}`,
            `/Language=${language}`,
            `/LANG=${language}`,
            `/ProductId=${language}`,
            `/galaxyclient`,
            `/buildId=${manifestData.product.timestamp}`,
            `/versionName=${gameInfo.install.version}`,
            '/nodesktopshorctut', // YES THEY MADE A TYPO
            '/nodesktopshortcut'
          ]
          await runSetupCommand({
            commandParts: [absPath, ...exeArgs],
            gameSettings,
            wait: false,
            protonVerb: 'run',
            gameInstallPath: gameInfo.install.install_path,
            skipPrefixCheckIKnowWhatImDoing: true,
            startFolder: gameInfo.install.install_path
          })
        }
      }
    }
  } else {
    // check if scriptinterpreter is required based on manifest
    if (manifestData.scriptInterpreter) {
      const isiPath = path.join(
        gogRedistPath,
        '__redist/ISI/scriptinterpreter.exe'
      )
      if (!existsSync(isiPath)) {
        logError(
          [
            "Script interpreter couldn't be found",
            isiPath,
            'to try again restart Heroic and',
            isWindows ? 'reinstall the game' : 'delete wine prefix of the game'
          ],
          {
            prefix: LogPrefix.Gog
          }
        )
      } else {
        // Run scriptinterpreter for every installed product
        for (const manifestProduct of manifestData.products) {
          if (
            manifestProduct.productId !== appName &&
            !(gameInfo.install.installedDLCs || []).includes(
              manifestProduct.productId
            )
          ) {
            continue
          }
          const language = lang || 'English'

          const exeArgs = [
            '/VERYSILENT',
            `/DIR=${gameDirectoryPath}`,
            `/Language=${language}`,
            `/LANG=${language}`,
            `/ProductId=${manifestProduct.productId}`,
            `/galaxyclient`,
            `/buildId=${gameInfo.install.buildId}`,
            `/versionName=${gameInfo.install.version}`,
            `/lang-code=${gameInfo.install.language || 'en-US'}`,
            `/supportDir=${gameSupportDir}`,
            '/nodesktopshorctut',
            '/nodesktopshortcut'
          ]

          await runSetupCommand({
            commandParts: [isiPath, ...exeArgs],
            gameSettings,
            wait: false,
            protonVerb: 'run',
            gameInstallPath: gameInfo.install.install_path,
            skipPrefixCheckIKnowWhatImDoing: true,
            startFolder: gameInfo.install.install_path
          })
        }
      }
    } else {
      // Check for temp executables
      for (const manifestProduct of manifestData.products) {
        if (
          manifestProduct.productId !== appName &&
          !(gameInfo.install.installedDLCs || []).includes(
            manifestProduct.productId
          )
        ) {
          continue
        }
        if (!manifestProduct.temp_executable?.length) {
          continue
        }
        const absPath = path.join(
          gogSupportPath,
          appName,
          manifestProduct.productId,
          manifestProduct.temp_executable
        )
        const language = (lang || 'English').toLowerCase()

        const exeArgs = [
          '/VERYSILENT',
          `/DIR=${gameDirectoryPath}`,
          `/Language=${language}`,
          `/LANG=${language}`,
          `/lang-code=${gameInfo.install.language || 'en-US'}`,
          `/ProductId=${manifestProduct.productId}`,
          `/galaxyclient`,
          `/buildId=${gameInfo.install.buildId}`,
          `/versionName=${gameInfo.install.version}`,
          '/nodesktopshorctut',
          '/nodesktopshortcut'
        ]
        await runSetupCommand({
          commandParts: [absPath, ...exeArgs],
          gameSettings,
          wait: false,
          protonVerb: 'run',
          gameInstallPath: gameInfo.install.install_path,
          skipPrefixCheckIKnowWhatImDoing: true,
          startFolder: gameInfo.install.install_path
        })
      }
    }
  }

  // Install redistributables according to redist manifest
  const gogRedistManifestPath = path.join(
    gogRedistPath,
    '.gogdl-redist-manifest'
  )

  if (existsSync(gogRedistManifestPath) && installRedist) {
    const gogRedistManifestDataRaw = await readFile(gogRedistManifestPath, {
      encoding: 'utf-8'
    })
    let gogRedistManifestData: GOGRedistManifest
    try {
      gogRedistManifestData = JSON.parse(gogRedistManifestDataRaw)
    } catch (e) {
      logError(['SETUP: Failed to parse redist manifest:', e], LogPrefix.Gog)
      return
    }

    for (const dep of dependencies) {
      const foundDep = gogRedistManifestData.depots.find(
        (depot) => depot.dependencyId === dep
      )
      if (!foundDep) {
        logWarning(['SETUP: Was not able to find redist data for', dep], {
          prefix: LogPrefix.Gog
        })
        continue
      }

      if (!foundDep.executable.path.length) {
        logInfo(['SETUP: skipping redist', dep], { prefix: LogPrefix.Gog })
        continue
      }

      const exePath = path.join(gogRedistPath, foundDep.executable.path)
      const exeArguments = foundDep.executable.arguments.length
        ? shlex.split(foundDep.executable.arguments)
        : []

      const commandParts = [exePath, ...exeArguments]

      // HACKS zone

      // Force hands-free setup for PHYSXLEGACY
      if (dep === 'PHYSXLEGACY') {
        commandParts.unshift('msiexec', '/i')
        commandParts.push('/qb')
      }

      logInfo(['SETUP: Installing redist', foundDep.readableName], {
        prefix: LogPrefix.Gog
      })

      sendGameStatusUpdate({
        appName,
        runner: 'gog',
        status: 'redist',
        context: foundDep.readableName
      })

      await runSetupCommand({
        commandParts,
        gameSettings,
        startFolder: gogRedistPath,
        wait: false,
        protonVerb: 'run',
        skipPrefixCheckIKnowWhatImDoing: true, // We are running those commands after we check if prefix is valid, this shouldn't cause issues
        gameInstallPath: gameInfo.install.install_path!
      })
    }
  }

  logInfo('Setup: Finished', LogPrefix.Gog)
}

export default setup
