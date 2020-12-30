// import fetch from 'electron-fetch';
const { exec, spawn } = require("child_process");
const { homedir } = require("os");
const path = require("path");
const fs = require("fs");
const promosify = require("util").promisify;
const stat = promosify(fs.stat);
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog: { showMessageBox, showErrorBox },
} = require("electron");

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  //load the index.html from a url
  win.loadURL(`file://${path.join(__dirname, '../build/index.html')}`)
  // win.loadURL("http://localhost:3000");
  // Open the DevTools.
  // win.webContents.openDevTools();
}

//Checks if legendary is installed
let legendaryBin = null;
const findLegendary = () =>
  new Promise((res, rej) => {
    exec("which legendary", (error, stdout, stderr) => {
      if (error) {
        rej(null);
      }
      if (stdout) {
        const legendaryPath = stdout.split("\n")[0];
        res(legendaryPath);
      }
    });
  });

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

//Checks if the user have logged in with Legendary already

ipcMain.handle("legendary", (event, args) => {
  if (!legendaryBin) {
    showErrorBox(
      "Legendary not Found",
      "Legendary could not be found, please install it first!"
    );
    app.quit();
  }

  const isUninstall = args.includes("uninstall");
  const isLaunch = args[0].includes("launch");
  const isAuth = args.includes("auth");

  return new Promise((resolve, reject) => {
    if (!isLaunch && !isAuth) {
      return showMessageBox({
        type: "warning",
        title: isUninstall ? "Uninstall" : "Install",
        message: isUninstall
          ? "Do you want to Uninstall this game?"
          : "Do you want to install this game?",
        buttons: ["Yes", "No"],
      }).then(({ response }) => {
        if (response === 1) {
          resolve(response);
        }

        if (response === 0) {
          const child = spawn("xterm", ["-e", "legendary", ...args]);
          child.on("close", () => resolve("done"));
        }
      });
    }

    const child = spawn("legendary", [...args]);
    child.on("close", () => resolve("done"));
  });
});

ipcMain.handle("readFile", (event, file) => {
  return stat(userInfo)
    .then(async() => {
      const installed = `${configPath}/installed.json`
      const files = {
        user: require(userInfo),
        library: `${configPath}/metadata/`,
        installed: await stat(installed)
                          .then(() => require(installed))
                          .catch(() => [])
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
    .catch(() => {
      showMessageBox({
        type: "warning",
        title: "Logged out",
        message: "Do you want to login with legendary now?",
        buttons: ["Yes", "No"],
      })
        .then(({ response }) => {
          if (response === 1) {
            app.quit();
          }

          if (response === 0) {
            const child = spawn("xterm", ["-e", "legendary", "auth"]);
            child.on("close", () =>
              showMessageBox({
                title: "Legendary",
                message: "Updating Game List",
              }).then(() => {
                const child = spawn("legendary", ["list-games"]);
                child.on("close", () => app.relaunch());
              })
            );
          }
        })
        .then(() => {
          const child = spawn("legendary", ["list-games"]);
          child.on("close", () => app.relaunch());
        });
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
