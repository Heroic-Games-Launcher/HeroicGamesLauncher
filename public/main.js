const { exec, spawn } = require("child_process");
const { homedir } = require("os");
const path = require("path");
const fs = require("fs");
const promisify = require("util").promisify;
const execAsync = promisify(exec);
const stat = promisify(fs.stat);
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog: { showMessageBox, showErrorBox, showOpenDialog },
} = require("electron");

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minHeight: 600,
    minWidth: 1000,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  // win.setMenu(null);
  //load the index.html from a url
  win.loadURL(`file://${path.join(__dirname, '../build/index.html')}`)
  // win.loadURL("http://localhost:3000");
  // Open the DevTools.
  // win.webContents.openDevTools();
}

//Checks if legendary is installed
let legendaryBin = null;
const findLegendary = async() =>{
  const { stdout } = await execAsync("which legendary")
  if (stdout) {
    const legendaryPath = stdout.split("\n")[0];
    return legendaryPath;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(createWindow)
  .then(async () => {
    legendaryBin = await findLegendary();
  });

// Define basic paths
const home = homedir();
const configPath = `${home}/.config/legendary`;
const userInfo = `${configPath}/user.json`;

ipcMain.handle("winetricks", (event, prefix) => {
  return new Promise((resolve, reject) => {
    const child = spawn([prefix], "winetricks");
    child.on("close", () => "done");
  });
});

ipcMain.handle("legendary", async (event, args) => {
  if (!legendaryBin) {
    showErrorBox(
      "Legendary not Found",
      "Legendary could not be found, please install it first!"
    );
    app.quit();
  }

  const isUninstall = args.includes("uninstall");
  const isLaunch = args.includes("launch");
  const isAuth = args.includes("auth");

  if (isLaunch) {
    await execAsync(`legendary ${args}`).then(
      async () => await execAsync(`legendary sync-saves ${args}`)
    );
  }

  if (!isLaunch && !isAuth) {
    const { response } = await showMessageBox({
      type: "warning",
      title: isUninstall ? "Uninstall" : "Install",
      message: isUninstall
        ? "Do you want to Uninstall this game?"
        : "Do you want to install this game?",
      buttons: ["Yes", "No"],
    });
    if (response === 1) {
      return response;
    }
    if (response === 0) {
      if (!isUninstall) {
        await showOpenDialog({
          title: "Choose Install Path",
          buttonLabel: "Choose",
          properties: ["openDirectory"],
        }).then(async ({ canceled, filePaths }) => {
          if (canceled) {
            return "Canceled";
          }
          if (filePaths[0]) {
            await execAsync(
              `xterm -hold -e legendary ${args} --base-path ${filePaths[0]}`
            ).then(() => "done");
          }
        });
      }
      if (isUninstall) {
        await execAsync(`xterm -hold -e legendary ${args}`).then(() => "done");
      }
    }
  } else {
    await execAsync(`xterm -hold -e legendary ${args}`).then(() => "done");
  }
});

ipcMain.handle("readFile", (event, file) => {
  //Checks if the user have logged in with Legendary already
  return stat(userInfo)
    .then(async () => {
      const installed = `${configPath}/installed.json`;
      const files = {
        user: require(userInfo),
        library: `${configPath}/metadata/`,
        installed: await stat(installed)
          .then(() => require(installed))
          .catch(() => []),
      };

      if (file === "user") {
        return files[file].displayName;
      }

      if (file === "library") {
        return fs
          .readdirSync(files.library)
          .map((file) => `${files.library}/${file}`)
          .map((file) => require(file))
          .map(({ app_name, metadata }) => {
            const { description, keyImages, title, developer } = metadata;
            const art_cover = keyImages.filter(
              ({ type }) => type === "DieselGameBox"
            )[0].url;
            const art_square = keyImages.filter(
              ({ type }) => type === "DieselGameBoxTall"
            )[0].url;
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
          })
          .sort((a, b) => b.isInstalled - a.isInstalled);
      }

      return files[file];
    })
    .catch(async () => {
      const { response } = await showMessageBox({
        type: "warning",
        title: "Logged out",
        message: "Do you want to login with legendary now?",
        buttons: ["Yes", "No"],
      });
      if (response === 1) {
        app.quit();
      }
      if (response === 0) {
        await execAsync(`xterm -e legendary auth`);
        await showMessageBox({
          title: "Legendary",
          message: "Updating Game List",
        });
        await execAsync(`xterm -e legendary list-games`);
        app.relaunch();
        app.exit()
      }
    });
});

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
