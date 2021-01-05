const { spawn, exec } = require("child_process");
const { fixPathForAsarUnpack } = require("electron-util");
const { homedir } = require("os");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const promisify = require("util").promisify;
const execAsync = promisify(exec);
const stat = promisify(fs.stat);
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog: { showMessageBox, showOpenDialog },
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
  //load the index.html from a url
  if (isDev) {
    win.loadURL("http://localhost:3000");
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  }
}

let legendaryBin = fixPathForAsarUnpack(path.join(__dirname, "/bin/legendary"));

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

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
  const isUninstall = args.startsWith("uninstall");
  const isInstall = args.startsWith("install");
  const isAddOrRemove = isUninstall || isInstall

  if (isAddOrRemove) {
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
        const { canceled, filePaths } = await showOpenDialog({
          title: "Choose Install Path",
          buttonLabel: "Choose",
          properties: ["openDirectory"],
        });
        if (canceled) {
          return "Canceled";
        }
        if (filePaths[0]) {
          return execAsync(
            `xterm -hold -e ${legendaryBin} ${args} --base-path '${filePaths[0]}'`
          );
        }
      }
      if (isUninstall) {
        return execAsync(`xterm -hold -e ${legendaryBin} ${args}`);
      }
    }
  } else {
    return execAsync(`${legendaryBin} ${args}`);
  }
});

const isLoggedIn = async () =>
  await stat(userInfo)
    .then(() => true)
    .catch(() => false);

//Checks if the user have logged in with Legendary already
ipcMain.handle("isLoggedIn", () => isLoggedIn());

ipcMain.handle("readFile", async (event, file) => {
  const loggedIn = await isLoggedIn();

  if (!isLoggedIn) {
    return { user:{ displayName: null }, library: [] }
  }

  const installed = `${configPath}/installed.json`;
  const files = {
    user: loggedIn ? require(userInfo) : { displayName: null },
    library: `${configPath}/metadata/`,
    installed: await stat(installed)
      .then(() => require(installed))
      .catch(() => []),
  };

  if (file === "user") {
    if (loggedIn) {
      return files[file].displayName;
    }
    return null;
  }

  if (file === "library") {
    const library = fs.existsSync(files.library)
    const fallBackImage = "https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg"

    if (library) {
      return fs
        .readdirSync(files.library)
        .map((file) => `${files.library}/${file}`)
        .map((file) => require(file))
        .map(({ app_name, metadata }) => {
          const { description, keyImages, title, developer } = metadata;

          const gameBox = keyImages.filter(
            ({ type }) => type === "DieselGameBox"
          )[0];
          
          const gameBoxTall = keyImages.filter(
            ({ type }) => type === "DieselGameBoxTall"
          )[0];

          const art_cover = gameBox ? gameBox.url : null;
          const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage

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
    return [];
  }
  return files[file];
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
