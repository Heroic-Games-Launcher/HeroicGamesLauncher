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
    width: isDev ? 1800 : 1280,
    height: isDev ? 1200 : 720,
    minHeight: 600,
    minWidth: 1280,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  //load the index.html from a url
  if (isDev) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

    installExtension(REACT_DEVELOPER_TOOLS).then((name) => {
        console.log(`Added Extension:  ${name}`);
    })
    .catch((err) => {
        console.log('An error occurred: ', err);
    });

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
const legendaryConfigPath = `${home}/.config/legendary`;
const heroicConfigPath = `${home}/.config/heroic/config.json`;
const userInfo = `${legendaryConfigPath}/user.json`;

ipcMain.handle("writeFile", (event, args) => {
  fs.writeFile(heroicConfigPath, JSON.stringify(args, null, 2), () => {
    return 'done'
  })
})

ipcMain.handle("winetricks", (event, prefix) => {
  return new Promise((resolve, reject) => {
    const child = spawn([prefix], "winetricks");
    child.on("close", () => "done");
  });
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
    return await execAsync(`${legendaryBin} ${args}`)
      .then(({stdout, stderr}) => {
        if (stdout){
          return stdout
        } else if (stderr) {
          return stderr
        } else {
          return 'done'
        }
      })
      .catch(({stderr}) => Error(stderr))
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
    const library = fs.existsSync(files.library)
    const fallBackImage = "https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg"
    
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
    }
    return [];
  }
  return files[file];
});

ipcMain.on("install", async (event, game) => {
  const { canceled, filePaths } = await showOpenDialog({
    title: "Choose Install Path",
    buttonLabel: "Choose",
    properties: ["openDirectory"],
  });

  
  if (canceled) {
    return event.reply("requestedOutput", 'end')
  }
  
  if (filePaths[0]) {
    const path = filePaths[0]
    const logPath = `${legendaryConfigPath}/${game}.log`
    const command = `${legendaryBin} install ${game} --base-path '${path}' &> ${logPath}`
    
    const proc = execAsync(command)
    ipcMain.on('kill', () => {
      event.reply("requestedOutput", 'killing')
      exec(`pkill -f ${game}`)
    })

    proc.child.on('exit', () => {
      event.reply("requestedOutput", 'end')
    })
  }
})

ipcMain.on('requestGameProgress', (event, game) => {
  const logPath = `${legendaryConfigPath}/${game}.log`
    exec(`tail ${logPath} | grep 'Progress: ' | awk '{print $5}'`, (error, stdout, stderr) => {
      const progress = stdout.split('\n')[0].replace('%', '')
      
      if (progress === '100'){
        return event.reply("requestedOutput", '100')
      }
      event.reply("requestedOutput", progress)
    })
})

ipcMain.on('kill', async(event, game) => {
  console.log('killing', game);
  return execAsync(`pkill -f ${game}`)
    .then(() => `killed ${game}`)
    .catch((err) => err)
})

ipcMain.on('openFolder', (event, folder) => spawn('xdg-open', [folder]))

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