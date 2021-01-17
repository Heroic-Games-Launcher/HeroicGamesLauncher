const {
  heroicConfigPath,
  heroicGamesConfigPath,
  launchGame,
  legendaryBin,
  loginUrl,
  getAlternativeWine,
  isLoggedIn,
  icon,
  legendaryConfigPath,
  userInfo,
  writeDefaultconfig,
  writeGameconfig,
  getLatestDxvk,
  home,
  sidInfoUrl
} = require("./utils");

const { spawn, exec } = require("child_process");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const promisify = require("util").promisify;
const execAsync = promisify(exec);
const stat = promisify(fs.stat);
const axios = require("axios");

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

  writeDefaultconfig();

  //load the index.html from a url
  if (isDev) {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
    } = require("electron-devtools-installer");

    getLatestDxvk()

    installExtension(REACT_DEVELOPER_TOOLS)
      .catch((err) => {
        console.log("An error occurred: ", err);
      });

    win.loadURL("http://localhost:3000");
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.on("close", async (e) => {
      e.preventDefault();
      //Send a warning if user want to close the window while some gaming is installing on background
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
    win.setMenu(null);
  }
}

// TODO: Update Legendary to latest version

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Define basic paths

ipcMain.handle("writeFile", (event, args) => {
  const app = args[0];
  const config = args[1];
  if (args[0] === "default") {
    return fs.writeFile(
      heroicConfigPath,
      JSON.stringify(config, null, 2),
      () => "done"
    );
  }
  return fs.writeFile(
    `${heroicGamesConfigPath}/${app}.json`,
    JSON.stringify(config, null, 2),
    () => "done"
  );
});

ipcMain.handle("getGameInfo", async (event, game) => {
  const epicUrl = `https://store-content.ak.epicgames.com/api/en-US/content/products/${game}`
  try { 
    const response = await axios({
      url: epicUrl,
      method: "GET",
    });
    return response.data.pages[0].data.about;
  } catch (error) {
    return {}
  }
});

ipcMain.handle("launch", (event, appName) => {
  return launchGame(appName).catch(console.log)
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
      .catch((err) => console.log(err));
  }
});

ipcMain.handle("install", async (event, args) => {
  const { appName: game, path } = args;
  const logPath = `${heroicGamesConfigPath}${game}.log`;
  let command = `${legendaryBin} install ${game} --base-path '${path}' -y &> ${logPath}`;
  if (path === "default") {
    const { defaultInstallPath } = JSON.parse(
      fs.readFileSync(heroicConfigPath)
    ).defaultSettings;
    command = `${legendaryBin} install ${game} --base-path ${defaultInstallPath} -y &> ${logPath}`;
  }
  console.log(`Installing ${game} with:`, command);
  await execAsync(command)
    .then(console.log)
    .catch(console.log);
});

ipcMain.handle("importGame", async (event, args) => {
  const { appName: game, path } = args;
  const command = `${legendaryBin} import-game ${game} '${path}'`;
  const {stderr, stdout} =  await execAsync(command);
  console.log(`${stdout} - ${stderr}`);
  return
});

ipcMain.on("requestGameProgress", (event, game) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`;
  exec(
    `tail ${logPath} | grep 'Progress: ' | awk '{print $5}'`,
    (error, stdout, stderr) => {
      const progress = `${stdout.split("\n")[0]}`;
      console.log(`Install Progress: ${progress}`);
      event.reply("requestedOutput", `${progress}`);
    }
  );
});

ipcMain.on("kill", (event, game) => {
  console.log("killing", game);
  return spawn('pkill', ['-f', game])
});

ipcMain.on("openFolder", (event, folder) => spawn("xdg-open", [folder]));

ipcMain.on("getAlternativeWine", (event, args) =>
  event.reply("alternativeWine", getAlternativeWine())
);

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
ipcMain.on("callTool", async (event, { tool, wine, prefix }) => {
  let wineBin = wine.replace('proton', 'dist/bin/wine64');

  if (wine.endsWith('proton')){
    wineBin = wine.replace('proton', 'dist/bin/wine64')
  }

  const command = `WINE=${wineBin} WINEPREFIX=${prefix} ${
      tool === "winecfg" ? `${wineBin} ${tool}` : tool
    }`

  console.log({command});
  return exec(command)
}
);

ipcMain.on("requestSettings", (event, appName) => {
  let settings;
  if (appName !== "default") {
    writeGameconfig(appName);
  }
  const defaultSettings = JSON.parse(fs.readFileSync(heroicConfigPath));
  if (appName === "default") {
    return event.reply("defaultSettings", defaultSettings.defaultSettings);
  }
  if (fs.existsSync(`${heroicGamesConfigPath}${appName}.json`)) {
    settings = JSON.parse(
      fs.readFileSync(`${heroicGamesConfigPath}${appName}.json`)
    );
    return event.reply(appName, settings[appName]);
  }
  return event.reply(appName, defaultSettings.defaultSettings);
});

//Checks if the user have logged in with Legendary already
ipcMain.handle("isLoggedIn", () => isLoggedIn());

ipcMain.on("openLoginPage", () => spawn("xdg-open", [loginUrl]));
ipcMain.on("openSidInfoPage", () => spawn("xdg-open", [sidInfoUrl]));

ipcMain.on("getLog", (event, appName) => spawn("xdg-open", [`${heroicGamesConfigPath}/${appName}-lastPlay.log`]));

ipcMain.handle("readFile", async (event, file) => {
  const loggedIn = isLoggedIn();

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
          const { description, keyImages, title, developer, customAttributes: { CloudSaveFolder } } = metadata;
          const cloudSaveEnabled = Boolean(CloudSaveFolder)
          const saveFolder = cloudSaveEnabled ? CloudSaveFolder.value : ""

          const gameBox = keyImages.filter(
            ({ type }) => type === "DieselGameBox"
          )[0];
          const gameBoxTall = keyImages.filter(
            ({ type }) => type === "DieselGameBoxTall"
          )[0];
          const logo = keyImages.filter(
            ({ type }) => type === "DieselGameBoxLogo"
          )[0];

          const art_cover = gameBox ? gameBox.url : null;
          const art_logo = logo ? logo.url : null;
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
            install_size = null,
            install_path = null,
          } = info;

          return {
            isInstalled,
            info,
            title,
            executable,
            version,
            install_size,
            install_path,
            app_name,
            developer,
            description,
            cloudSaveEnabled,
            saveFolder,
            art_cover: art_cover || art_square,
            art_square: art_square || art_cover,
            art_logo
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

ipcMain.handle('egsSync', async (event, args) => {
  const linkArgs = `--enable-sync --egl-wine-prefix ${args}`
  const unlinkArgs = `--unlink`
  const isLink = args !== 'unlink'
  const command = isLink ? linkArgs : unlinkArgs

  const { stderr, stdout } = await execAsync(`${legendaryBin} egl-sync ${command} -y`)
  console.log(`${stdout} - ${stderr}`)
  return `${stdout} - ${stderr}`
})

// TODO: Check the best way to Sync saves to implement soon
ipcMain.handle('syncSaves', async (event, args) => {
  const [arg = "", path, appName] = args
  const command = `${legendaryBin} sync-saves --save-path ${path} ${arg} ${appName} -y`
  const legendarySavesPath = `${home}/legendary/.saves`
  
  //workaround error when no .saves folder exists
  if (!fs.existsSync(legendarySavesPath)){
    fs.mkdirSync(legendarySavesPath, { recursive: true })
  }

  console.log('\n syncing saves for ', appName);
  const { stderr, stdout } = await execAsync(command)
  console.log(`${stdout} - ${stderr}`)
  return `\n ${stdout} - ${stderr}`
})

ipcMain.on("showAboutWindow", () => {
  app.setAboutPanelOptions({
    applicationName: "Heroic Games Launcher",
    copyright: "GPL V3",
    applicationVersion: "1.1 'Crocodile'",
    website: "https://github.com/flavioislima/HeroicGamesLauncher",
    iconPath: icon,
  });
  return app.showAboutPanel();
});

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
