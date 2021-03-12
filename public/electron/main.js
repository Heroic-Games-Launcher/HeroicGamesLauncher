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
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const electron_1 = require("electron");
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const graceful_fs_1 = require("graceful-fs");
const i18next_1 = __importDefault(require("i18next"));
const i18next_fs_backend_1 = __importDefault(require("i18next-fs-backend"));
const os_1 = require("os");
const path = __importStar(require("path"));
const util_1 = require("util");
const library_1 = require("./legendary_utils/library");
/* eslint-disable @typescript-eslint/ban-ts-comment */
const utils_1 = require("./utils");
const execAsync = util_1.promisify(child_process_1.exec);
let mainWindow = null;
function createWindow() {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        width: electron_is_dev_1.default ? 1800 : 1280,
        height: electron_is_dev_1.default ? 1200 : 720,
        minHeight: 700,
        minWidth: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
    setTimeout(() => {
        utils_1.getLatestDxvk();
    }, 2500);
    //load the index.html from a url
    if (electron_is_dev_1.default) {
        //@ts-ignore
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
            const { exitToTray } = yield utils_1.getSettings('default');
            if (exitToTray) {
                return mainWindow.hide();
            }
            return yield utils_1.handleExit();
        }));
    }
    else {
        mainWindow.on('close', (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const { exitToTray } = yield utils_1.getSettings('default');
            if (exitToTray) {
                return mainWindow.hide();
            }
            return utils_1.handleExit();
        }));
        mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`);
        mainWindow.setMenu(null);
        return mainWindow;
    }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appIcon = null;
const gotTheLock = electron_1.app.requestSingleInstanceLock();
const contextMenu = () => electron_1.Menu.buildFromTemplate([
    {
        label: i18next_1.default.t('tray.show'),
        click: function () {
            mainWindow.show();
        },
    },
    {
        label: i18next_1.default.t('tray.about', 'About'),
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
        label: i18next_1.default.t('tray.support', 'Support Us'),
        click: function () {
            child_process_1.exec(`xdg-open ${utils_1.supportURL}`);
        },
    },
    {
        label: i18next_1.default.t('tray.reload', 'Reload'),
        click: function () {
            mainWindow.reload();
        },
        accelerator: 'ctrl + R',
    },
    {
        label: i18next_1.default.t('tray.quit', 'Quit'),
        click: function () {
            utils_1.handleExit();
        },
    },
]);
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            mainWindow.show();
        }
    });
    electron_1.app.whenReady().then(() => __awaiter(void 0, void 0, void 0, function* () {
        const { language, darkTrayIcon } = yield utils_1.getSettings('default');
        yield i18next_1.default.use(i18next_fs_backend_1.default).init({
            lng: language,
            fallbackLng: 'en',
            supportedLngs: ['de', 'en', 'es', 'fr', 'nl', 'pl', 'pt', 'ru', 'tr', 'hu'],
            debug: false,
            backend: {
                allowMultiLoading: false,
                addPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}'),
                loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
            },
        });
        createWindow();
        const trayIcon = darkTrayIcon ? utils_1.iconDark : utils_1.iconLight;
        appIcon = new electron_1.Tray(trayIcon);
        appIcon.setContextMenu(contextMenu());
        appIcon.setToolTip('Heroic');
        electron_1.ipcMain.on('changeLanguage', (event, language) => __awaiter(void 0, void 0, void 0, function* () {
            yield i18next_1.default.changeLanguage(language);
            appIcon.setContextMenu(contextMenu());
        }));
        return;
    }));
}
electron_1.ipcMain.on('Notify', (event, args) => {
    const notify = new electron_1.Notification({
        title: args[0],
        body: args[1],
    });
    notify.on('click', () => mainWindow.show());
    notify.show();
});
electron_1.ipcMain.on('openSupportPage', () => child_process_1.exec(`xdg-open ${utils_1.supportURL}`));
electron_1.ipcMain.handle('checkGameUpdates', () => utils_1.checkGameUpdates());
electron_1.ipcMain.on('openReleases', () => child_process_1.exec(`xdg-open ${utils_1.heroicGithubURL}`));
electron_1.ipcMain.handle('checkVersion', () => utils_1.checkForUpdates());
electron_1.ipcMain.handle('writeFile', (event, args) => {
    const app = args[0];
    const config = args[1];
    if (args[0] === 'default') {
        return graceful_fs_1.writeFile(utils_1.heroicConfigPath, JSON.stringify(config, null, 2), () => 'done');
    }
    return graceful_fs_1.writeFile(`${utils_1.heroicGamesConfigPath}/${app}.json`, JSON.stringify(config, null, 2), () => 'done');
});
let powerId;
electron_1.ipcMain.on('lock', () => {
    if (!graceful_fs_1.existsSync(`${utils_1.heroicGamesConfigPath}/lock`)) {
        graceful_fs_1.writeFile(`${utils_1.heroicGamesConfigPath}/lock`, '', () => 'done');
        if (!powerId) {
            powerId = electron_1.powerSaveBlocker.start('prevent-app-suspension');
        }
    }
});
electron_1.ipcMain.on('unlock', () => {
    if (graceful_fs_1.existsSync(`${utils_1.heroicGamesConfigPath}/lock`)) {
        graceful_fs_1.unlinkSync(`${utils_1.heroicGamesConfigPath}/lock`);
        if (powerId) {
            electron_1.powerSaveBlocker.stop(powerId);
        }
    }
});
electron_1.ipcMain.handle('getMaxCpus', () => os_1.cpus().length);
electron_1.ipcMain.on('quit', () => __awaiter(void 0, void 0, void 0, function* () { return utils_1.handleExit(); }));
/* const storage: Storage = mainWindow.localStorage
const lang = storage.getItem('language') */
const getProductSlug = (namespace, game) => __awaiter(void 0, void 0, void 0, function* () {
    const graphql = JSON.stringify({
        query: `{Catalog{catalogOffers( namespace:"${namespace}"){elements {productSlug}}}}`,
        variables: {},
    });
    const result = yield axios_1.default('https://www.epicgames.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: graphql,
    });
    const res = result.data.data.Catalog.catalogOffers;
    const slug = res.elements.find((e) => e.productSlug);
    if (slug) {
        return slug.productSlug.replace(/(\/.*)/, '');
    }
    else {
        return game;
    }
});
electron_1.ipcMain.handle('getGameInfo', (event, game, namespace) => __awaiter(void 0, void 0, void 0, function* () {
    let lang = JSON.parse(graceful_fs_1.readFileSync(utils_1.heroicConfigPath, 'utf-8')).defaultSettings
        .language;
    if (lang === 'pt') {
        lang = 'pt-BR';
    }
    let epicUrl;
    if (namespace) {
        const productSlug = yield getProductSlug(namespace, game);
        epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${productSlug}`;
    }
    else {
        epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${game}`;
    }
    try {
        const response = yield axios_1.default({
            url: epicUrl,
            method: 'GET',
        });
        delete response.data.pages[0].data.requirements.systems[0].details[0];
        const about = response.data.pages.find((e) => e.type === 'productHome');
        return {
            about: about.data.about,
            reqs: about.data.requirements.systems[0].details,
        };
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
}));
electron_1.ipcMain.handle('install', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const { appName: game, path } = args;
    const { defaultInstallPath, maxWorkers } = yield utils_1.getSettings('default');
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`;
    const logPath = `${utils_1.heroicGamesConfigPath}${game}.log`;
    let command = `${utils_1.legendaryBin} install ${game} --base-path '${path}' ${workers} -y &> ${logPath}`;
    if (path === 'default') {
        command = `${utils_1.legendaryBin} install ${game} --base-path ${defaultInstallPath} ${workers} -y |& tee ${logPath}`;
    }
    console.log(`Installing ${game} with:`, command);
    const noSpaceMsg = 'Not enough available disk space';
    return yield execAsync(command, { shell: '/bin/bash' })
        .then(() => console.log('finished installing'))
        .catch(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { stdout } = yield execAsync(`tail ${logPath} | grep 'disk space'`);
            if (stdout.includes(noSpaceMsg)) {
                console.log(noSpaceMsg);
                return stdout;
            }
            console.log('installation canceled or had some error');
        }
        catch (err) {
            return err;
        }
    }));
}));
electron_1.ipcMain.handle('repair', (event, game) => __awaiter(void 0, void 0, void 0, function* () {
    const { maxWorkers } = yield utils_1.getSettings('default');
    const workers = maxWorkers ? `--max-workers ${maxWorkers}` : '';
    const logPath = `${utils_1.heroicGamesConfigPath}${game}.log`;
    const command = `${utils_1.legendaryBin} repair ${game} ${workers} -y &> ${logPath}`;
    console.log(`Repairing ${game} with:`, command);
    yield execAsync(command, { shell: '/bin/bash' })
        .then(() => console.log('finished repairing'))
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
electron_1.ipcMain.handle('requestGameProgress', (event, appName) => __awaiter(void 0, void 0, void 0, function* () {
    const logPath = `${utils_1.heroicGamesConfigPath}${appName}.log`;
    const progress_command = `tail ${logPath} | grep 'Progress: ' | awk '{print $5, $11}' | tail -1`;
    const downloaded_command = `tail ${logPath} | grep 'Downloaded: ' | awk '{print $5}' | tail -1`;
    const { stdout: progress_result } = yield execAsync(progress_command);
    const { stdout: downloaded_result } = yield execAsync(downloaded_command);
    const [percent, eta] = progress_result.split(' ');
    const bytes = downloaded_result + 'MiB';
    const progress = { percent, bytes, eta };
    console.log(`Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`);
    return progress;
}));
electron_1.ipcMain.on('kill', (event, game) => {
    console.log('killing', game);
    return child_process_1.spawn('pkill', ['-f', game]);
});
electron_1.ipcMain.on('openFolder', (event, folder) => child_process_1.spawn('xdg-open', [folder]));
electron_1.ipcMain.handle('getAlternativeWine', () => utils_1.getAlternativeWine());
electron_1.ipcMain.on('callTool', (event, { tool, wine, prefix, exe }) => __awaiter(void 0, void 0, void 0, function* () {
    const wineBin = wine.replace("/proton'", "/dist/bin/wine'");
    let winePrefix = prefix.replace('~', utils_1.home);
    if (wine.includes('proton')) {
        const protonPrefix = winePrefix.replaceAll("'", '');
        winePrefix = `'${protonPrefix}/pfx'`;
    }
    let command = `WINE=${wineBin} WINEPREFIX=${winePrefix} 
    ${tool === 'winecfg' ? `${wineBin} ${tool}` : tool}`;
    if (tool === 'runExe') {
        command = `WINEPREFIX=${winePrefix} ${wineBin} ${exe}`;
    }
    console.log({ command });
    return child_process_1.exec(command);
}));
electron_1.ipcMain.handle('requestSettings', (event, appName) => __awaiter(void 0, void 0, void 0, function* () {
    if (appName === 'default') {
        return yield utils_1.getSettings('default');
    }
    if (appName !== 'default') {
        utils_1.writeGameconfig(appName);
    }
    return yield utils_1.getSettings(appName);
}));
//Checks if the user have logged in with Legendary already
electron_1.ipcMain.handle('isLoggedIn', () => utils_1.isLoggedIn());
electron_1.ipcMain.on('openLoginPage', () => child_process_1.spawn('xdg-open', [utils_1.loginUrl]));
electron_1.ipcMain.on('openDiscordLink', () => child_process_1.spawn('xdg-open', [utils_1.discordLink]));
electron_1.ipcMain.on('openSidInfoPage', () => child_process_1.spawn('xdg-open', [utils_1.sidInfoUrl]));
electron_1.ipcMain.on('getLog', (event, appName) => child_process_1.spawn('xdg-open', [`${utils_1.heroicGamesConfigPath}/${appName}-lastPlay.log`]));
const installed = `${utils_1.legendaryConfigPath}/installed.json`;
electron_1.ipcMain.handle('moveInstall', (event, [appName, path]) => __awaiter(void 0, void 0, void 0, function* () {
    const file = JSON.parse(graceful_fs_1.readFileSync(installed, 'utf8'));
    const installedGames = Object.values(file);
    const { install_path } = installedGames.filter((game) => game.app_name === appName)[0];
    const splitPath = install_path.split('/');
    const installFolder = splitPath[splitPath.length - 1];
    const newPath = `${path}/${installFolder}`;
    const game = Object.assign(Object.assign({}, file[appName]), { install_path: newPath });
    const modifiedInstall = Object.assign(Object.assign({}, file), { [appName]: game });
    return yield execAsync(`mv -f ${install_path} ${newPath}`)
        .then(() => {
        graceful_fs_1.writeFile(installed, JSON.stringify(modifiedInstall, null, 2), () => console.log(`Finished moving ${appName} to ${newPath}`));
    })
        .catch(console.log);
}));
electron_1.ipcMain.handle('changeInstallPath', (event, [appName, newPath]) => __awaiter(void 0, void 0, void 0, function* () {
    const file = JSON.parse(graceful_fs_1.readFileSync(installed, 'utf8'));
    const game = Object.assign(Object.assign({}, file[appName]), { install_path: newPath });
    const modifiedInstall = Object.assign(Object.assign({}, file), { [appName]: game });
    graceful_fs_1.writeFileSync(installed, JSON.stringify(modifiedInstall, null, 2));
    console.log(`Finished moving ${appName} to ${newPath}`);
}));
electron_1.ipcMain.handle('readFile', (event, file) => __awaiter(void 0, void 0, void 0, function* () { return library_1.getLegendaryConfig(file); }));
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
        return 'Error';
    }
}));
electron_1.ipcMain.handle('getUserInfo', () => {
    const { account_id } = JSON.parse(graceful_fs_1.readFileSync(utils_1.userInfo, 'utf-8'));
    return { user: os_1.userInfo().username, epicId: account_id };
});
electron_1.ipcMain.on('removeFolder', (e, args) => __awaiter(void 0, void 0, void 0, function* () {
    const [path, folderName] = args;
    if (path === 'default') {
        const defaultInstallPath = yield (yield utils_1.getSettings('default')).defaultInstallPath.replaceAll("'", '');
        const folderToDelete = `${defaultInstallPath}/${folderName}`;
        return setTimeout(() => {
            child_process_1.exec(`rm -Rf ${folderToDelete}`);
        }, 2000);
    }
    const folderToDelete = `${path}/${folderName}`;
    return setTimeout(() => {
        child_process_1.exec(`rm -Rf ${folderToDelete}`);
    }, 2000);
}));
electron_1.ipcMain.handle('syncSaves', (event, args) => __awaiter(void 0, void 0, void 0, function* () {
    const [arg = '', path, appName] = args;
    const command = `${utils_1.legendaryBin} sync-saves --save-path "${path}" ${arg} ${appName} -y`;
    const legendarySavesPath = `${utils_1.home}/legendary/.saves`;
    //workaround error when no .saves folder exists
    if (!graceful_fs_1.existsSync(legendarySavesPath)) {
        graceful_fs_1.mkdirSync(legendarySavesPath, { recursive: true });
    }
    console.log('\n syncing saves for ', appName);
    const { stderr, stdout } = yield execAsync(command);
    console.log(`${stdout} - ${stderr}`);
    return `\n ${stdout} - ${stderr}`;
}));
electron_1.ipcMain.on('showAboutWindow', () => utils_1.showAboutWindow());
// Maybe this can help with white screens
process.on('uncaughtException', (err) => {
    console.log(err);
});
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
