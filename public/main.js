const { spawn, exec } = require("child_process");
const { fixPathForAsarUnpack } = require("electron-util");
const { homedir } = require("os");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const promisify = require("util").promisify;
const execAsync = promisify(exec);
const stat = promisify(fs.stat);
const axios = require('axios')

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog: { showMessageBox },
} = require("electron");

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: isDev ? 1800 : 1280,
    height: isDev ? 1200 : 720,
    minHeight: 600,
    minWidth: 1280,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  writeDefaultconfig()

  //load the index.html from a url
  if (isDev) {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
    } = require("electron-devtools-installer");

    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => {
        console.log(`Added Extension:  ${name}`);
      })
      .catch((err) => {
        console.log("An error occurred: ", err);
      });

    win.loadURL("http://localhost:3000");
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.on("close", async (e) => {
      e.preventDefault();

      const { response } = await showMessageBox({
        title: "Games Downloading",
        message: "Do you really want to quit? Downloads will be canceled",
        buttons: ["NO", "YES"],
      });

      if (response === 1) {
        win.destroy();
      }
    });
    win.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  }
}

let legendaryBin = fixPathForAsarUnpack(path.join(__dirname, "/bin/legendary"));

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady()
.then(createWindow);

// Define basic paths
const home = homedir();
const legendaryConfigPath = `${home}/.config/legendary`;
const heroicFolder = `${home}/.config/heroic/`;
const heroicConfigPath = `${heroicFolder}config.json`;
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const userInfo = `${legendaryConfigPath}/user.json`;
const heroicInstallPath = `${home}/Games/Heroic`;

ipcMain.handle("writeFile", (event, args) => {
  const app = args[0]
  const config = args[1]
  if (args[0] === 'default') {
    return fs.writeFile(heroicConfigPath, JSON.stringify(config, null, 2), () => 'done');
  }
  return fs.writeFile(`${heroicGamesConfigPath}/${app}.json`, JSON.stringify(config, null, 2), () => 'done');
});

ipcMain.handle("getGameInfo", async(event, game) => {
  const { id, auth } = require('./secrets')
  
  const response = await axios({
    url: "https://api.igdb.com/v4/games",
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Client-ID': id,
        'Authorization': auth,
    },
    data: `fields name, summary, aggregated_rating, first_release_date; search "${game}"; where aggregated_rating != null;`
  })

  return(response.data[0]);
});

ipcMain.handle("launch", async (event, appName) => {
  let envVars = "";
  let altWine;
  let altWinePrefix;
  const gameConfig = `${heroicGamesConfigPath}${appName}.json`
  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (!fs.existsSync(gameConfig)){
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
  }

  
  const settings = JSON.parse(fs.readFileSync(settingsPath));
  const {winePrefix, wineVersion, otherOptions} = settings[settingsName]
  
  envVars = otherOptions;

  if (winePrefix !== "~/.wine") {
    altWinePrefix = winePrefix;
  }

  if (wineVersion.name !== "Wine Default") {
    altWine = wineVersion.bin;
  }

  const wine = altWine ? `--wine ${altWine}` : "";
  const prefix = altWinePrefix ? `--wine-prefix ${altWinePrefix}` : "";
  const command = `${envVars} ${legendaryBin} launch ${appName} ${wine} ${prefix}`;
  
  console.log(command);

  return await execAsync(command)
    .then(({stderr}) => fs.writeFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`, stderr, () => 'done'))
});

ipcMain.handle("legendary", async (event, args) => {
  const isUninstall = args.startsWith("uninstall");

  if (isUninstall) {
    const { response } = await showMessageBox({
      type: "warning",
      title: "Uninstall",
      message: "Do you want to Uninstall this game?",
      buttons: ["Yes", "No"],
    });
    if (response === 1) {
      return response;
    }
    if (response === 0) {
      return execAsync(`${legendaryBin} ${args} -y`);
    }
  } else {
    const command = `${legendaryBin} ${args}`;
    console.log(command);
    return await execAsync(command)
      .then(({ stdout, stderr }) => {
        if (stdout) {
          return stdout;
        } else if (stderr) {
          return stderr;
        } else {
          return "done";
        }
      })
      .catch(({ stderr }) => Error(stderr));
  }
});

ipcMain.handle("install", async (event, args) => {
  console.log("install");
  const { appName: game, path } = args;
  const logPath = `${legendaryConfigPath}/${game}.log`;
  let command = `${legendaryBin} install ${game} --base-path '${path}' -y &> ${logPath}`;

  if (path === "default") {
    let defaultPath = heroicInstallPath;
    if (fs.existsSync(heroicConfigPath)) {
      const { defaultInstallPath } = JSON.parse(
        fs.readFileSync(heroicConfigPath)
      );
      defaultPath = Boolean(defaultInstallPath)
        ? defaultInstallPath
        : defaultPath;
    }
    command = `${legendaryBin} install ${game} --base-path '${defaultPath}' -y &> ${logPath}`;
  }

  ipcMain.on("kill", () => {
    event.reply("requestedOutput", "killing");
    exec(`pkill -f ${game}`);
  });


  await execAsync(command);
});

ipcMain.handle("importGame", async (event, args) => {
  const { appName: game, path } = args;
  const command = `${legendaryBin} import-game ${game} '${path}'`;

  await execAsync(command)
});

ipcMain.on("requestGameProgress", (event, game) => {
  const logPath = `${legendaryConfigPath}/${game}.log`;
  exec(
    `tail ${logPath} | grep 'Progress: ' | awk '{print $5}'`,
    (error, stdout, stderr) => {
      const progress = stdout.split("\n")[0].replace("%", "");

      if (progress === "100") {
        return event.reply("requestedOutput", "100");
      }
      event.reply("requestedOutput", progress);
    }
  );
});

ipcMain.on("kill", async (event, game) => {
  console.log("killing", game);
  return execAsync(`pkill -f ${game}`)
    .then(() => `killed ${game}`)
    .catch((err) => err);
});

ipcMain.on("openFolder", (event, folder) => spawn("xdg-open", [folder]));

ipcMain.on("getAlternativeWine", (event, args) =>
  event.reply("alternativeWine", getAlternativeWine())
);

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
ipcMain.on("callTool", (event, { tool, wine, prefix }) =>
  exec(
    `WINE=${wine} WINEPREFIX=${prefix} ${
      tool === "winecfg" ? `${wine} ${tool}` : tool
    } `
  )
);

ipcMain.on("requestSettings", (event, appName) => {
  let settings;
  if (appName !== 'default') {
    writeGameconfig(appName)
  }
  const defaultSettings = JSON.parse(fs.readFileSync(heroicConfigPath))
  if (appName === 'default'){
    console.log('default settings');
    return event.reply("defaultSettings", defaultSettings.defaultSettings);
  } 
  if (fs.existsSync(`${heroicGamesConfigPath}${appName}.json`)){
    console.log('settings', appName);
    settings = JSON.parse(fs.readFileSync(`${heroicGamesConfigPath}${appName}.json`))
    return event.reply(appName, settings[appName]);
  }
  console.log('game settings not found')
  return event.reply(appName, defaultSettings.defaultSettings);
});

// check other wine versions installed
const getAlternativeWine = () => {
  const steamPath = `${home}/.steam/`;
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
        bin: `${steamCompatPath}${version}/dist/bin/wine64`,
      };
    });
  }

  if (fs.existsSync(lutrisCompatPath)) {
    lutrisWine = fs.readdirSync(lutrisCompatPath).map((version) => {
      return {
        name: `Lutris - ${version}`,
        bin: `${lutrisCompatPath}${version}/bin/wine64`,
      };
    });
  }

  return [...steamWine, ...lutrisWine, defaultWine];
};

const isLoggedIn = async () =>
  await stat(userInfo)
    .then(() => true)
    .catch(() => false);

//Checks if the user have logged in with Legendary already
ipcMain.handle("isLoggedIn", () => isLoggedIn());

const loginUrl = "https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect";
ipcMain.on("openLoginPage", () => spawn('xdg-open', [loginUrl]))

ipcMain.handle("readFile", async (event, file) => {
  const loggedIn = await isLoggedIn();

  if (!isLoggedIn) {
    return { user: { displayName: null }, library: [] };
  }

  const installed = `${legendaryConfigPath}/installed.json`;
  const files = {
    user: loggedIn ? require(userInfo) : { displayName: null },
    library: `${legendaryConfigPath}/metadata/`,
    config: heroicConfigPath,
    installed: await stat(installed)
      .then(() => JSON.parse(fs.readFileSync(installed)))
      .catch(() => []),
  };

  if (file === "user") {
    if (loggedIn) {
      return files[file].displayName;
    }
    return null;
  }

  if (file === "library") {
    const library = fs.existsSync(files.library);
    const fallBackImage =
      "https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg";

    if (library) {
      return fs
        .readdirSync(files.library)
        .map((file) => `${files.library}/${file}`)
        .map((file) => JSON.parse(fs.readFileSync(file)))
        .map(({ app_name, metadata }) => {
          const { description, keyImages, title, developer } = metadata;

          const gameBox = keyImages.filter(
            ({ type }) => type === "DieselGameBox"
          )[0];

          const gameBoxTall = keyImages.filter(
            ({ type }) => type === "DieselGameBoxTall"
          )[0];

          const art_cover = gameBox ? gameBox.url : null;
          const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage;

          const installedGames = Object.values(files.installed);
          const isInstalled = Boolean(
            installedGames.filter((game) => game.app_name === app_name).length
          );
          const info = isInstalled
            ? installedGames.filter((game) => game.app_name === app_name)[0]
            : {};
          const {
            executable = null,
            version = null,
            save_path = null,
            install_size = null,
            install_path = null,
          } = info;

          return {
            isInstalled,
            info,
            title,
            executable,
            version,
            save_path,
            install_size,
            install_path,
            app_name,
            developer,
            description,
            art_cover: art_cover || art_square,
            art_square: art_square || art_cover,
          };
        })
        .sort((a, b) => {
          const gameA = a.title.toUpperCase();
          const gameB = b.title.toUpperCase();
          return gameA < gameB ? -1 : 1;
        });
    }
    return [];
  }
  return files[file];
});

//Send a warning if user want to close the window while some gaming is installing on background

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


const writeDefaultconfig = () => {
  const config = {
    defaultSettings: {
      defaultInstallPath: "~/Games/Heroic",
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