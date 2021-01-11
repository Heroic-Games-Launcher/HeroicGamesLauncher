const { spawn, exec } = require("child_process");
const promisify = require("util").promisify;
const fs = require('fs')
const {homedir} = require('os')
const execAsync = promisify(exec);
const { fixPathForAsarUnpack } = require("electron-util");
const path = require('path')

const home = homedir();
const legendaryConfigPath = `${home}/.config/legendary`;
const heroicFolder = `${home}/.config/heroic/`;
const heroicConfigPath = `${heroicFolder}config.json`;
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const userInfo = `${legendaryConfigPath}/user.json`;
const heroicInstallPath = `${home}/Games/Heroic`;
const legendaryBin = fixPathForAsarUnpack(path.join(__dirname, "/bin/legendary"));
const icon = fixPathForAsarUnpack(path.join(__dirname, "/icon.png"));
const loginUrl = "https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect";

// check other wine versions installed
const getAlternativeWine = () => {
  // TODO: Get all Proton versions
  const steamPath = `${home}/.steam/`;
  const steamInstallFolder = `${steamPath}root/steamapps/common/`
  const steamCompatPath = `${steamPath}root/compatibilitytools.d/`;
  const lutrisPath = `${home}/.local/share/lutris`;
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`;
  let steamWine = [];
  let lutrisWine = [];

  const defaultWine = {name: 'Wine Default', bin: '/usr/bin/wine'}

  if (fs.existsSync(steamCompatPath)) {
    steamWine = fs.readdirSync(steamCompatPath).map((version) => {
      return {
        name: `Steam - ${version}`,
        bin: `'${steamCompatPath}${version}/dist/bin/wine64'`,
      };
    });
  }


  if (fs.existsSync(steamInstallFolder)) {
    fs.readdirSync(steamInstallFolder).forEach((version) => {
      if (version.startsWith('Proton')) {
        steamWine.push({
          name: `Steam - ${version}`,
          bin: `'${steamInstallFolder}${version}/dist/bin/wine64'`,
        });
      }
    });
  }

  if (fs.existsSync(lutrisCompatPath)) {
    lutrisWine = fs.readdirSync(lutrisCompatPath).map((version) => {
      return {
        name: `Lutris - ${version}`,
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      };
    });
  }

  return [...steamWine, ...lutrisWine, defaultWine];
};

const isLoggedIn = () => fs.readFileSync(userInfo);

const launchGame = (appName) => {
      let envVars = ""
      let altWine
      let altWinePrefix
      const gameConfig = `${heroicGamesConfigPath}${appName}.json`
      const globalConfig = heroicConfigPath
      let settingsPath = gameConfig
      let settingsName = appName
    
      if (!fs.existsSync(gameConfig)) {
        settingsPath = globalConfig
        settingsName = 'defaultSettings'
      }
    
    
      const settings = JSON.parse(fs.readFileSync(settingsPath))
      const { winePrefix, wineVersion, otherOptions } = settings[settingsName]
    
      envVars = otherOptions
    
      if (winePrefix !== "~/.wine") {
        altWinePrefix = `${winePrefix}`
      }
    
      if (wineVersion.name !== "Wine Default") {
        altWine = wineVersion.bin
      }
    
      const wine = altWine ? `--wine ${altWine}` : ""
      const prefix = altWinePrefix ? `--wine-prefix ${altWinePrefix}` : ""
      const command = `${envVars} ${legendaryBin} launch ${appName} ${wine} ${prefix}`
    
      return execAsync(command)
        .then(({ stderr }) => fs.writeFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`, stderr, () => 'done'))
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
      otherOptions: ""
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

const writeGameconfig = async (game) => {
  const { wineVersion, winePrefix, otherOptions } = JSON.parse(fs.readFileSync(heroicConfigPath)).defaultSettings

  const config = {
    [game]: {
      wineVersion,
      winePrefix,
      otherOptions
    }
  }

  if (!fs.existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    await Promise.resolve(fs.writeFileSync(`${heroicGamesConfigPath}${game}.json`, JSON.stringify(config, null, 2), () => {
      return "done";
    }));
  }
}
    

module.exports = {
  getAlternativeWine,
  isLoggedIn,
  launchGame,
  writeDefaultconfig,
  writeGameconfig,
  userInfo,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  legendaryConfigPath,
  legendaryBin,
  icon,
  loginUrl
}