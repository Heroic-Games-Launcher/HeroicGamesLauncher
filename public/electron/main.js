"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
const utils_1 = require("./utils");
const byte_size_1 = __importDefault(require("byte-size"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const fs_1 = require("fs");
const util_1 = require("util");
const axios_1 = __importDefault(require("axios"));
const os_1 = require("os");
const execAsync = util_1.promisify(child_process_1.exec);
const statAsync = util_1.promisify(fs_1.stat);
const electron_1 = require("electron");
const { showMessageBox, showErrorBox, showOpenDialog } = electron_1.dialog;
let mainWindow = null;
function createWindow() {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        width: electron_is_dev_1.default ? 1800 : 1280,
        height: electron_is_dev_1.default ? 1200 : 720,
        minHeight: 600,
        minWidth: 1280,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
    utils_1.writeDefaultconfig();
    utils_1.getLatestDxvk();
    setTimeout(() => {
        utils_1.checkForUpdates();
    }, 3500);
    //load the index.html from a url
    if (electron_is_dev_1.default) {
        Promise.resolve().then(() => __importStar(require('electron-devtools-installer'))).then((devtools) => {
            const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools;
            installExtension(REACT_DEVELOPER_TOOLS).catch((err) => {
                console.log('An error occurred: ', err);
            });
        });
        mainWindow.loadURL('http://localhost:3000');
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
        mainWindow.on('close', (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const { exitToTray } = JSON.parse(
            // @ts-ignore
            fs_1.readFileSync(utils_1.heroicConfigPath)).defaultSettings;
            if (exitToTray) {
                return mainWindow.hide();
            }
            return utils_1.handleExit();
        }));
    }
    else {
        mainWindow.on('close', (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const { exitToTray } = JSON.parse(
            // @ts-ignore
            fs_1.readFileSync(utils_1.heroicConfigPath)).defaultSettings;
            if (exitToTray) {
                return mainWindow.hide();
            }
            return utils_1.handleExit();
        }));
        mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`);
        mainWindow.setMenu(null);
    }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appIcon = null;
let window = null;
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (window) {
            if (window.isMinimized()) {
                window.restore();
                window.focus();
            }
        }
    });
    electron_1.app.whenReady().then(() => {
        window = createWindow();
        const trayIcon = electron_1.nativeTheme.shouldUseDarkColors ? utils_1.iconDark : utils_1.iconLight;
        appIcon = new electron_1.Tray(trayIcon);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Show Heroic',
                click: function () {
                    mainWindow.show();
                },
            },
            {
                label: 'About',
                click: function () {
                    utils_1.showAboutWindow();
                },
            },
            {
                label: 'Github',
                click: function () {
                    child_process_1.exec(`xdg-open ${utils_1.heroicGithubURL}`);
                },
            },
            {
                label: 'Support Us',
                click: function () {
                    child_process_1.exec(`xdg-open ${utils_1.kofiURL}`);
                },
            },
            {
                label: 'Quit',
                click: function () {
                    utils_1.handleExit();
                },
            },
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('Heroic');
        return;
    });
}
electron_1.ipcMain.on('Notify', (event, args) => {
    const notify = new electron_1.Notification({
        title: args[0],
        body: args[1],
    });
    notify.on('click', () => mainWindow.show());
    notify.show();
});
electron_1.ipcMain.on('openSupportPage', () => child_process_1.exec(`xdg-open ${utils_1.kofiURL}`));
electron_1.ipcMain.handle('writeFile', (event, args) => {
    const app = args[0];
    const config = args[1];
    if (args[0] === 'default') {
        return fs_1.writeFile(utils_1.heroicConfigPath, JSON.stringify(config, null, 2), () => 'done');
    }
    return fs_1.writeFile(`${utils_1.heroicGamesConfigPath}/${app}.json`, JSON.stringify(config, null, 2), () => 'done');
});
let powerId = null;
electron_1.ipcMain.on('lock', () => {
    fs_1.writeFile(`${utils_1.heroicGamesConfigPath}/lock`, '', () => 'done');
    powerId = electron_1.powerSaveBlocker.start('prevent-app-suspension');
});
electron_1.ipcMain.on('unlock', () => {
    if (fs_1.existsSync(`${utils_1.heroicGamesConfigPath}/lock`)) {
        fs_1.unlinkSync(`${utils_1.heroicGamesConfigPath}/lock`);
        electron_1.powerSaveBlocker.stop(powerId);
    }
});
electron_1.ipcMain.on('quit', () => utils_1.handleExit());
electron_1.ipcMain.handle('getGameInfo', (event, game) => __awaiter(void 0, void 0, void 0, function* () {
    const epicUrl = `https://store-content.ak.epicgames.com/api/en-US/content/products/${game}`;
    try {
        const response = yield axios_1.default({
            url: epicUrl,
            method: 'GET',
        });
        return response.data.pages[0].data.about;
    }
    catch (error) {
        return {};
    }
}));
electron_1.ipcMain.handle('launch', (event, appName) => {
    console.log('launching', appName);
    return utils_1.launchGame(appName).catch(console.log);
});
electron_1.ipcMain.handle('legendary', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const isUninstall = args.startsWith('uninstall');
    if (isUninstall) {
        const { response } = yield showMessageBox({
            type: 'warning',
            title: 'Uninstall',
            message: 'Do you want to Uninstall this game?',
            buttons: ['Yes', 'No'],
        });
        if (response === 1) {
            return response;
        }
        if (response === 0) {
            return execAsync(`${utils_1.legendaryBin} ${args} -y`);
        }
    }
    else {
        const command = `${utils_1.legendaryBin} ${args}`;
        return yield execAsync(command)
            .then(({ stdout, stderr }) => {
            if (stdout) {
                return stdout;
            }
            else if (stderr) {
                return stderr;
            }
            else {
                return 'done';
            }
        })
            .catch((err) => console.log(err));
    }
}));
electron_1.ipcMain.handle('install', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const { appName: game, path } = args;
    const logPath = `${utils_1.heroicGamesConfigPath}${game}.log`;
    let command = `${utils_1.legendaryBin} install ${game} --base-path '${path}' -y &> ${logPath}`;
    if (path === 'default') {
        const { defaultInstallPath } = JSON.parse(
        // @ts-ignore
        fs_1.readFileSync(utils_1.heroicConfigPath)).defaultSettings;
        command = `${utils_1.legendaryBin} install ${game} --base-path ${defaultInstallPath} -y |& tee ${logPath}`;
    }
    console.log(`Installing ${game} with:`, command);
    yield execAsync(command, { shell: '/bin/bash' })
        .then(console.log)
        .catch(console.log);
}));
electron_1.ipcMain.handle('repair', (event, game) => __awaiter(void 0, void 0, void 0, function* () {
    const logPath = `${utils_1.heroicGamesConfigPath}${game}.log`;
    const command = `${utils_1.legendaryBin} repair ${game} -y &> ${logPath}`;
    console.log(`Repairing ${game} with:`, command);
    yield execAsync(command, { shell: '/bin/bash' })
        .then(console.log)
        .catch(console.log);
}));
electron_1.ipcMain.handle('importGame', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const { appName: game, path } = args;
    const command = `${utils_1.legendaryBin} import-game ${game} '${path}'`;
    const { stderr, stdout } = yield execAsync(command, { shell: '/bin/bash' });
    console.log(`${stdout} - ${stderr}`);
    return;
}));
electron_1.ipcMain.handle('updateGame', (e, appName) => utils_1.updateGame(appName));
electron_1.ipcMain.on('requestGameProgress', (event, appName) => {
    const logPath = `${utils_1.heroicGamesConfigPath}${appName}.log`;
    child_process_1.exec(`tail ${logPath} | grep 'Progress: ' | awk '{print $5 $6 $11}'`, (error, stdout) => {
        const status = `${stdout.split('\n')[0]}`.split('(');
        const percent = status[0];
        const eta = status[1] ? status[1].split(',')[1] : '';
        const bytes = status[1] ? status[1].split(',')[0].replace(')', 'MB') : '';
        const progress = { percent, bytes, eta };
        console.log(`Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`);
        event.reply(`${appName}-progress`, progress);
    });
});
electron_1.ipcMain.on('kill', (event, game) => {
    console.log('killing', game);
    return child_process_1.spawn('pkill', ['-f', game]);
});
electron_1.ipcMain.on('openFolder', (event, folder) => child_process_1.spawn('xdg-open', [folder]));
electron_1.ipcMain.on('getAlternativeWine', (event) => event.reply('alternativeWine', utils_1.getAlternativeWine()));
electron_1.ipcMain.on('callTool', (event, { tool, wine, prefix, exe }) => __awaiter(void 0, void 0, void 0, function* () {
    const wineBin = wine.replace("/proton'", "/dist/bin/wine'");
    let winePrefix = prefix;
    if (wine.includes('proton')) {
        const protonPrefix = winePrefix.replaceAll("'", '');
        winePrefix = `'${protonPrefix}/pfx'`;
    }
    let command = `WINE=${wineBin} WINEPREFIX=${winePrefix} ${tool === 'winecfg' ? `${wineBin} ${tool}` : tool}`;
    if (tool === 'runExe') {
        command = `WINEPREFIX=${winePrefix} ${wineBin} ${exe}`;
    }
    console.log({ command });
    return child_process_1.exec(command);
}));
electron_1.ipcMain.on('requestSettings', (event, appName) => {
    let settings;
    if (appName !== 'default') {
        utils_1.writeGameconfig(appName);
    }
    // @ts-ignore
    const defaultSettings = JSON.parse(fs_1.readFileSync(utils_1.heroicConfigPath));
    if (appName === 'default') {
        return event.reply('defaultSettings', defaultSettings.defaultSettings);
    }
    if (fs_1.existsSync(`${utils_1.heroicGamesConfigPath}${appName}.json`)) {
        settings = JSON.parse(
        // @ts-ignore
        fs_1.readFileSync(`${utils_1.heroicGamesConfigPath}${appName}.json`));
        return event.reply(appName, settings[appName]);
    }
    return event.reply(appName, defaultSettings.defaultSettings);
});
//Checks if the user have logged in with Legendary already
electron_1.ipcMain.handle('isLoggedIn', () => utils_1.isLoggedIn());
electron_1.ipcMain.on('openLoginPage', () => child_process_1.spawn('xdg-open', [utils_1.loginUrl]));
electron_1.ipcMain.on('openSidInfoPage', () => child_process_1.spawn('xdg-open', [utils_1.sidInfoUrl]));
electron_1.ipcMain.on('getLog', (event, appName) => child_process_1.spawn('xdg-open', [`${utils_1.heroicGamesConfigPath}/${appName}-lastPlay.log`]));
const installed = `${utils_1.legendaryConfigPath}/installed.json`;
electron_1.ipcMain.handle('moveInstall', (event, appName) => __awaiter(void 0, void 0, void 0, function* () {
    const { filePaths } = yield showOpenDialog({
        title: 'Choose where you want to move',
        buttonLabel: 'Choose',
        properties: ['openDirectory'],
    });
    if (filePaths[0]) {
        // @ts-ignore
        const file = JSON.parse(fs_1.readFileSync(installed));
        const installedGames = Object.values(file);
        const { install_path } = installedGames.filter((game) => game.app_name === appName)[0];
        const splitPath = install_path.split('/');
        const installFolder = splitPath[splitPath.length - 1];
        const newPath = `${filePaths[0]}/${installFolder}`;
        const game = Object.assign(Object.assign({}, file[appName]), { install_path: newPath });
        const modifiedInstall = Object.assign(Object.assign({}, file), { [appName]: game });
        return yield execAsync(`mv -f ${install_path} ${newPath}`)
            .then(() => {
            fs_1.writeFile(installed, JSON.stringify(modifiedInstall, null, 2), () => console.log(`Finished moving ${appName} to ${newPath}`));
        })
            .catch(console.log);
    }
    return;
}));
electron_1.ipcMain.handle('readFile', (event, file) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedIn = utils_1.isLoggedIn();
    if (!utils_1.isLoggedIn) {
        return { user: { displayName: null }, library: [] };
    }
    const files = {
        // @ts-ignore
        user: loggedIn ? JSON.parse(fs_1.readFileSync(utils_1.userInfo)) : { displayName: null },
        library: `${utils_1.legendaryConfigPath}/metadata/`,
        config: utils_1.heroicConfigPath,
        installed: yield statAsync(installed)
            // @ts-ignore
            .then(() => JSON.parse(fs_1.readFileSync(installed)))
            .catch(() => []),
    };
    if (file === 'user') {
        if (loggedIn) {
            return files[file].displayName;
        }
        return null;
    }
    if (file === 'library') {
        const library = fs_1.existsSync(files.library);
        const fallBackImage = 'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg';
        if (library) {
            return (fs_1.readdirSync(files.library)
                .map((file) => `${files.library}/${file}`)
                // @ts-ignore
                .map((file) => JSON.parse(fs_1.readFileSync(file)))
                .map(({ app_name, metadata }) => {
                const { description, keyImages, title, developer, customAttributes: { CloudSaveFolder, FolderName }, } = metadata;
                const cloudSaveEnabled = Boolean(CloudSaveFolder);
                const saveFolder = cloudSaveEnabled ? CloudSaveFolder.value : '';
                const gameBox = keyImages.filter(({ type }) => type === 'DieselGameBox')[0];
                const gameBoxTall = keyImages.filter(({ type }) => type === 'DieselGameBoxTall')[0];
                const logo = keyImages.filter(({ type }) => type === 'DieselGameBoxLogo')[0];
                const art_cover = gameBox ? gameBox.url : null;
                const art_logo = logo ? logo.url : null;
                const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage;
                const installedGames = Object.values(files.installed);
                const isInstalled = Boolean(installedGames.filter((game) => game.app_name === app_name).length);
                const info = isInstalled
                    ? installedGames.filter((game) => game.app_name === app_name)[0]
                    : {};
                const { executable = null, version = null, install_size = null, install_path = null, is_dlc = null, } = info;
                const convertedSize = install_size &&
                    `${byte_size_1.default(install_size).value}${byte_size_1.default(install_size).unit}`;
                return {
                    isInstalled,
                    info,
                    title,
                    executable,
                    version,
                    install_size: convertedSize,
                    install_path,
                    app_name,
                    developer,
                    description,
                    cloudSaveEnabled,
                    saveFolder,
                    folderName: FolderName.value,
                    art_cover: art_cover || art_square,
                    art_square: art_square || art_cover,
                    art_logo,
                    is_dlc,
                };
            })
                .sort((a, b) => {
                const gameA = a.title.toUpperCase();
                const gameB = b.title.toUpperCase();
                return gameA < gameB ? -1 : 1;
            }));
        }
        return [];
    }
    return files[file];
}));
electron_1.ipcMain.handle('egsSync', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const linkArgs = `--enable-sync --egl-wine-prefix ${args}`;
    const unlinkArgs = `--unlink`;
    const isLink = args !== 'unlink';
    const command = isLink ? linkArgs : unlinkArgs;
    try {
        const { stderr, stdout } = yield execAsync(`${utils_1.legendaryBin} egl-sync ${command} -y`);
        console.log(`${stdout} - ${stderr}`);
        return `${stdout} - ${stderr}`;
    }
    catch (error) {
        showErrorBox('Error', 'Invalid Path');
        return 'Error';
    }
}));
electron_1.ipcMain.handle('getUserInfo', () => {
    // @ts-ignore
    const { account_id } = JSON.parse(fs_1.readFileSync(utils_1.userInfo));
    return { user: os_1.userInfo().username, epicId: account_id };
});
electron_1.ipcMain.on('removeFolder', (e, args) => {
    const [path, folderName] = args;
    if (path === 'default') {
        // @ts-ignore
        let { defaultInstallPath } = JSON.parse(fs_1.readFileSync(utils_1.heroicConfigPath))
            .defaultSettings;
        defaultInstallPath = defaultInstallPath.replaceAll("'", '');
        const folderToDelete = `${defaultInstallPath}/${folderName}`;
        return setTimeout(() => {
            child_process_1.exec(`rm -Rf ${folderToDelete}`);
        }, 2000);
    }
    const folderToDelete = `${path}/${folderName}`;
    return setTimeout(() => {
        child_process_1.exec(`rm -Rf ${folderToDelete}`);
    }, 2000);
});
electron_1.ipcMain.handle('syncSaves', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const [arg = '', path, appName] = args;
    const command = `${utils_1.legendaryBin} sync-saves --save-path "${path}" ${arg} ${appName} -y`;
    const legendarySavesPath = `${utils_1.home}/legendary/.saves`;
    //workaround error when no .saves folder exists
    if (!fs_1.existsSync(legendarySavesPath)) {
        fs_1.mkdirSync(legendarySavesPath, { recursive: true });
    }
    console.log('\n syncing saves for ', appName);
    const { stderr, stdout } = yield execAsync(command);
    console.log(`${stdout} - ${stderr}`);
    return `\n ${stdout} - ${stderr}`;
}));
electron_1.ipcMain.on('showAboutWindow', () => utils_1.showAboutWindow());
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
