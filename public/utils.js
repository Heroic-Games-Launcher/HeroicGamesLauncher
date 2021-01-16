const { exec } = require("child_process");
const promisify = require("util").promisify;
const fs = require('fs')
const {homedir} = require('os')
const execAsync = promisify(exec);
const { fixPathForAsarUnpack } = require("electron-util");
const path = require('path')
const { showErrorBox } = require('electron').dialog
const axios = require('axios')

const home = homedir();
const legendaryConfigPath = `${home}/.config/legendary`;
const heroicFolder = `${home}/.config/heroic/`;
const heroicConfigPath = `${heroicFolder}config.json`;
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const heroicToolsPath = `${heroicFolder}Tools/DXVK`
const userInfo = `${legendaryConfigPath}/user.json`;
const heroicInstallPath = `${home}/Games/Heroic`;
const legendaryBin = fixPathForAsarUnpack(path.join(__dirname, "/bin/legendary"));
const icon = fixPathForAsarUnpack(path.join(__dirname, "/icon.png"));
const loginUrl = "https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect";
const sidInfoUrl = "https://github.com/flavioislima/HeroicGamesLauncher/issues/42"

// check other wine versions installed
const getAlternativeWine = () => {
  // Just add a new string here in case another path is found on another distro
  const steamPaths = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
  ]
  const protonPaths = []
  const foundPaths = steamPaths.filter(path => fs.existsSync(path))

  foundPaths.forEach(path => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  });

  const lutrisPath = `${home}/.local/share/lutris`;
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`;
  let steamWine = [];
  let lutrisWine = [];

  const defaultWine = {name: 'Wine Default', bin: '/usr/bin/wine'}

  protonPaths.forEach(path => {
    if (fs.existsSync(path)) {
      fs.readdirSync(path)
        .forEach(version => {
          if (version.toLowerCase().includes('proton')) {
            steamWine.push({
              name: `Steam - ${version}`,
              bin: `'${path}${version}/proton'`,
            });
          };
      })
    }
  })

  if (fs.existsSync(lutrisCompatPath)) {
    lutrisWine = fs.readdirSync(lutrisCompatPath)
      .map((version) => {
        return {
          name: `Lutris - ${version}`,
          bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
        };
      });
  }

  return [...steamWine, ...lutrisWine, defaultWine];
};

const isLoggedIn = () => fs.existsSync(userInfo);

const launchGame = async (appName) => {
      let envVars = ""
      let dxvkPrefix = ""
      let altWine
      let altWinePrefix
      let gameMode
      
      const gameConfig = `${heroicGamesConfigPath}${appName}.json`
      const globalConfig = heroicConfigPath
      let settingsPath = gameConfig
      let settingsName = appName
      
      if (!fs.existsSync(gameConfig)) {
        settingsPath = globalConfig
        settingsName = 'defaultSettings'
      }
      
      const settings = JSON.parse(fs.readFileSync(settingsPath))
      const { winePrefix, wineVersion, otherOptions, useGameMode, showFps } = settings[settingsName]
      
      const isDefaultPrefix = winePrefix === `'${home}/.wine'` || winePrefix === "'~/.wine'"

      envVars = otherOptions
      const isProton = wineVersion.name.endsWith('proton')
      if (isProton){
        console.log('You are using Proton, this can lead to some bugs, please do not open issues with bugs related with games', wineVersion.name);
      }

      if (isDefaultPrefix && isProton){
        return showErrorBox(
          "Proton on default Wine Prefix",
          "Using proton with default wine prefix is not supported"
        )
      }

      if (winePrefix !== "~/.wine") {
        if (isProton){
          envVars = `${otherOptions} STEAM_COMPAT_DATA_PATH=${winePrefix}`
        }
        dxvkPrefix = winePrefix
        altWinePrefix = isProton ? "" : `--wine-prefix ${winePrefix}`
      }
      
      // Install DXVK for non Proton Prefixes
      if (!isProton) {
        await installDxvk(dxvkPrefix)
      }
    
      if (wineVersion.name !== "Wine Default") {
        const { bin } = wineVersion
        altWine = isProton ?  `--no-wine --wrapper "${bin} run"` : `--wine ${bin}`
      }

      

      // check if Gamemode is installed
      await execAsync(`which gamemoderun`)
        .then(({stdout}) => gameMode = stdout.split('\n')[0])
        .catch(() => console.log('GameMode not installed'))
      
      const runWithGameMode = (useGameMode && gameMode) ? gameMode : ''
      const dxvkFps = showFps ? 'DXVK_HUD=fps'  : ''

      const command = `${envVars} ${dxvkFps} ${runWithGameMode} ${legendaryBin} launch ${appName} ${altWine} ${altWinePrefix}`
      console.log('\n Launch Command: ', command);
    
      return execAsync(command)
      .then(({ stderr }) => {
          fs.writeFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`, stderr, () => 'done')
          if (stderr.includes('Errno')){
            showErrorBox(
              "Something Went Wrong",
              "Error when launching the game, check the logs!"
            )
          }
        })
        .catch(console.log)
}

const writeDefaultconfig = () => {
  const config = {
    defaultSettings: {
      defaultInstallPath: heroicInstallPath,
      wineVersion: {
        name: "Wine Default",
        bin: "/usr/bin/wine"
      },
      winePrefix: "~/.wine",
      otherOptions: "",
      useGameMode: false,
      showFps: false
    }
  }
  if (!fs.existsSync(heroicConfigPath)) {
    fs.writeFile(heroicConfigPath, JSON.stringify(config, null, 2), () => {
      return "done";
    });
  }

  if (!fs.existsSync(heroicGamesConfigPath)) {
    fs.mkdir(heroicGamesConfigPath, () => {
      return "done";
    })
  }
}

const writeGameconfig = (game) => {
  const { wineVersion, winePrefix, otherOptions, useGameMode, showFps } = JSON.parse(fs.readFileSync(heroicConfigPath)).defaultSettings
  const config = {
    [game]: {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps
    }
  }

  if (!fs.existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    fs.writeFileSync(`${heroicGamesConfigPath}${game}.json`, JSON.stringify(config, null, 2), () => {
      return "done";
    });
  }
}
    
async function getLatestDxvk() {
  const { data: { assets } } = await axios.get("https://api.github.com/repos/lutris/dxvk/releases/latest")
  const current = assets[0]
  const name = current.name
  const downloadUrl = current.browser_download_url

  const dxvkLatest = `${heroicToolsPath}/${name}`
  const pastVersionCheck = `${heroicToolsPath}/latest_dxvk`
  let pastVersion = ""

  if (fs.existsSync(pastVersionCheck)){
    pastVersion = fs.readFileSync(pastVersionCheck).toString().split('\n')[0]
  }

  if (pastVersion === name) {
    return
  }
  
  const downloadCommand = `curl -L ${downloadUrl} -o ${dxvkLatest} --create-dirs`
  const extractCommand = `tar -zxf ${dxvkLatest} -C ${heroicToolsPath}`
  const echoCommand = `echo ${name} > ${heroicToolsPath}/latest_dxvk`
  const cleanCommand = `rm ${dxvkLatest}`

  console.log('Updating DXVK to:', name);

  return execAsync(downloadCommand)
    .then(async () => {
      console.log('downloaded DXVK');
      console.log('extracting DXVK');
      exec(echoCommand)
      await execAsync(extractCommand)
      console.log('DXVK updated!');
      exec(cleanCommand)
    })
    .catch(() =>  console.log('Error when downloading DXVK'))
}

async function installDxvk(prefix) {
  if (!prefix){
    return
  }

  const globalVersion = fs.readFileSync(`${heroicToolsPath}/latest_dxvk`).toString().split('\n')[0].replace('.tar.gz', '')
  const currentVersionCheck = `${prefix.replaceAll("'", '')}/current_dxvk`
  let currentVersion = ""

  if (fs.existsSync(currentVersionCheck)){
    currentVersion = fs.readFileSync(currentVersionCheck).toString().split('\n')[0]
  }

  if (currentVersion === globalVersion) {
    return
  }

  const dxvkPath = `${heroicToolsPath}/${globalVersion}/`
  const installCommand = `WINEPREFIX=${prefix} sh ${dxvkPath}setup_dxvk.sh install`
  const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`
  console.log(`installing DXVK on ${prefix}`, installCommand);
  await execAsync(`WINEPREFIX=${prefix} wineboot`)
  await execAsync(installCommand)
    .then(() => exec(echoCommand))
}

module.exports = {
  getAlternativeWine,
  isLoggedIn,
  launchGame,
  writeDefaultconfig,
  writeGameconfig,
  userInfo,
  getLatestDxvk,
  installDxvk,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  legendaryConfigPath,
  legendaryBin,
  icon,
  home,
  loginUrl,
  sidInfoUrl
}