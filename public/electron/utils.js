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
exports.heroicGithubURL = exports.supportURL = exports.updateGame = exports.sidInfoUrl = exports.loginUrl = exports.home = exports.iconLight = exports.iconDark = exports.icon = exports.showAboutWindow = exports.legendaryBin = exports.legendaryConfigPath = exports.heroicGamesConfigPath = exports.heroicFolder = exports.heroicConfigPath = exports.userInfo = exports.handleExit = exports.checkForUpdates = exports.writeGameconfig = exports.writeDefaultconfig = exports.discordLink = exports.getLatestDxvk = exports.launchGame = exports.isLoggedIn = exports.checkGameUpdates = exports.getSettings = exports.getAlternativeWine = exports.getUserInfo = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
const child_process_1 = require("child_process");
const util_1 = require("util");
const graceful_fs_1 = require("graceful-fs");
const os_1 = require("os");
const execAsync = util_1.promisify(child_process_1.exec);
const electron_util_1 = require("electron-util");
const path_1 = require("path");
const electron_1 = require("electron");
const axios = __importStar(require("axios"));
const i18next_1 = __importDefault(require("i18next"));
const { showErrorBox, showMessageBox } = electron_1.dialog;
const home = os_1.homedir();
exports.home = home;
const legendaryConfigPath = `${home}/.config/legendary`;
exports.legendaryConfigPath = legendaryConfigPath;
const heroicFolder = `${home}/.config/heroic/`;
exports.heroicFolder = heroicFolder;
const heroicConfigPath = `${heroicFolder}config.json`;
exports.heroicConfigPath = heroicConfigPath;
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`;
exports.heroicGamesConfigPath = heroicGamesConfigPath;
const heroicToolsPath = `${heroicFolder}tools`;
const userInfo = `${legendaryConfigPath}/user.json`;
exports.userInfo = userInfo;
const heroicInstallPath = `${home}/Games/Heroic`;
const legendaryBin = electron_util_1.fixPathForAsarUnpack(path_1.join(__dirname, '/bin/legendary'));
exports.legendaryBin = legendaryBin;
const icon = electron_util_1.fixPathForAsarUnpack(path_1.join(__dirname, '/icon.png'));
exports.icon = icon;
const iconDark = electron_util_1.fixPathForAsarUnpack(path_1.join(__dirname, '/icon-dark.png'));
exports.iconDark = iconDark;
const iconLight = electron_util_1.fixPathForAsarUnpack(path_1.join(__dirname, '/icon-light.png'));
exports.iconLight = iconLight;
const loginUrl = 'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect';
exports.loginUrl = loginUrl;
const sidInfoUrl = 'https://github.com/flavioislima/HeroicGamesLauncher/issues/42';
exports.sidInfoUrl = sidInfoUrl;
const heroicGithubURL = 'https://github.com/flavioislima/HeroicGamesLauncher/releases/latest';
exports.heroicGithubURL = heroicGithubURL;
const supportURL = 'https://github.com/flavioislima/HeroicGamesLauncher/blob/main/Support.md';
exports.supportURL = supportURL;
const discordLink = 'https://discord.gg/rHJ2uqdquK';
exports.discordLink = discordLink;
// check other wine versions installed
function getAlternativeWine() {
    return __awaiter(this, void 0, void 0, function* () {
        // Just add a new string here in case another path is found on another distro
        const steamPaths = [
            `${home}/.local/share/Steam`,
            `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
            '/usr/share/steam',
        ];
        if (!graceful_fs_1.existsSync(`${heroicToolsPath}/wine`)) {
            child_process_1.exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
                return 'done';
            });
        }
        if (!graceful_fs_1.existsSync(`${heroicToolsPath}/proton`)) {
            child_process_1.exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
                return 'done';
            });
        }
        const protonPaths = [`${heroicToolsPath}/proton/`];
        const foundPaths = steamPaths.filter((path) => graceful_fs_1.existsSync(path));
        const defaultWine = { name: '', bin: '' };
        yield execAsync(`which wine`)
            .then(({ stdout }) => __awaiter(this, void 0, void 0, function* () {
            defaultWine.bin = stdout.split('\n')[0];
            const { stdout: out } = yield execAsync(`wine --version`);
            defaultWine.name = `Wine - ${out.split('\n')[0]}`;
        }))
            .catch(() => console.log('Wine not installed'));
        foundPaths.forEach((path) => {
            protonPaths.push(`${path}/steamapps/common/`);
            protonPaths.push(`${path}/compatibilitytools.d/`);
            return;
        });
        const lutrisPath = `${home}/.local/share/lutris`;
        const lutrisCompatPath = `${lutrisPath}/runners/wine/`;
        const proton = new Set();
        const altWine = new Set();
        protonPaths.forEach((path) => {
            if (graceful_fs_1.existsSync(path)) {
                graceful_fs_1.readdirSync(path).forEach((version) => {
                    if (version.toLowerCase().startsWith('proton')) {
                        proton.add({
                            name: `Proton - ${version}`,
                            bin: `'${path}${version}/proton'`,
                        });
                    }
                });
            }
        });
        if (graceful_fs_1.existsSync(lutrisCompatPath)) {
            graceful_fs_1.readdirSync(lutrisCompatPath).forEach((version) => {
                altWine.add({
                    name: `Wine - ${version}`,
                    bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
                });
            });
        }
        graceful_fs_1.readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
            altWine.add({
                name: `Wine - ${version}`,
                bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
            });
        });
        return [defaultWine, ...altWine, ...proton];
    });
}
exports.getAlternativeWine = getAlternativeWine;
const isLoggedIn = () => graceful_fs_1.existsSync(userInfo);
exports.isLoggedIn = isLoggedIn;
const getSettings = (appName) => __awaiter(void 0, void 0, void 0, function* () {
    const gameConfig = `${heroicGamesConfigPath}${appName}.json`;
    const globalConfig = heroicConfigPath;
    let settingsPath = gameConfig;
    let settingsName = appName;
    if (appName === 'default' || !graceful_fs_1.existsSync(gameConfig)) {
        settingsPath = globalConfig;
        settingsName = 'defaultSettings';
        if (!graceful_fs_1.existsSync(settingsPath)) {
            yield writeDefaultconfig();
            return getSettings('default');
        }
    }
    const settings = JSON.parse(graceful_fs_1.readFileSync(settingsPath, 'utf-8'));
    return settings[settingsName];
});
exports.getSettings = getSettings;
const getUserInfo = () => {
    if (graceful_fs_1.existsSync(userInfo)) {
        return JSON.parse(graceful_fs_1.readFileSync(userInfo, 'utf-8'));
    }
    return { account_id: '', displayName: null };
};
exports.getUserInfo = getUserInfo;
const updateGame = (game) => {
    const logPath = `${heroicGamesConfigPath}${game}.log`;
    const command = `${legendaryBin} update ${game} -y &> ${logPath}`;
    return execAsync(command, { shell: '/bin/bash' })
        .then(console.log)
        .catch(console.log);
};
exports.updateGame = updateGame;
const launchGame = (appName) => __awaiter(void 0, void 0, void 0, function* () {
    let envVars = '';
    let gameMode;
    const { winePrefix, wineVersion, otherOptions, useGameMode, showFps, launcherArgs = '', showMangohud, audioFix, autoInstallDxvk, } = yield getSettings(appName);
    const fixedWinePrefix = winePrefix.replace('~', home);
    let wineCommand = `--wine ${wineVersion.bin}`;
    // We need to keep replacing the ' to keep compatibility with old configs
    let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`;
    const isProton = wineVersion.name.startsWith('Proton') ||
        wineVersion.name.startsWith('Steam');
    prefix = isProton ? '' : prefix;
    const options = {
        other: otherOptions ? otherOptions : '',
        fps: showFps ? `DXVK_HUD=fps` : '',
        audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
        showMangohud: showMangohud ? `MANGOHUD=1` : '',
        proton: isProton
            ? `STEAM_COMPAT_DATA_PATH='${winePrefix
                .replaceAll("'", '')
                .replace('~', home)}'`
            : '',
    };
    envVars = Object.values(options).join(' ');
    if (isProton) {
        console.log(`\n You are using Proton, this can lead to some bugs, 
            please do not open issues with bugs related with games`, wineVersion.name);
    }
    // Proton doesn't create a prefix folder so this is a workaround
    if (isProton && !graceful_fs_1.existsSync(fixedWinePrefix)) {
        const command = `mkdir '${fixedWinePrefix}' -p`;
        yield execAsync(command);
    }
    // Install DXVK for non Proton Prefixes
    if (!isProton && autoInstallDxvk) {
        yield installDxvk(winePrefix);
    }
    if (wineVersion.name !== 'Wine Default') {
        const { bin } = wineVersion;
        wineCommand = isProton
            ? `--no-wine --wrapper "${bin} run"`
            : `--wine ${bin}`;
    }
    // check if Gamemode is installed
    yield execAsync(`which gamemoderun`)
        .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
        .catch(() => console.log('GameMode not installed'));
    const runWithGameMode = useGameMode && gameMode ? gameMode : '';
    const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${appName}  ${wineCommand} ${prefix} ${launcherArgs}`;
    console.log('\n Launch Command:', command);
    return execAsync(command)
        .then(({ stderr }) => {
        graceful_fs_1.writeFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`, stderr, () => 'done');
        if (stderr.includes('Errno')) {
            showErrorBox(i18next_1.default.t('box.error', 'Something Went Wrong'), i18next_1.default.t('box.error.launch', 'Error when launching the game, check the logs!'));
        }
    })
        .catch(({ stderr }) => __awaiter(void 0, void 0, void 0, function* () {
        graceful_fs_1.writeFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`, stderr, () => 'done');
        return stderr;
    }));
});
exports.launchGame = launchGame;
function getLatestDxvk() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: { assets }, } = yield axios.default.get('https://api.github.com/repos/lutris/dxvk/releases/latest');
        const current = assets[0];
        const pkg = current.name;
        const name = pkg.replace('.tar.gz', '');
        const downloadUrl = current.browser_download_url;
        const dxvkLatest = `${heroicToolsPath}/DXVK/${pkg}`;
        const pastVersionCheck = `${heroicToolsPath}/DXVK/latest_dxvk`;
        let pastVersion = '';
        if (graceful_fs_1.existsSync(pastVersionCheck)) {
            pastVersion = graceful_fs_1.readFileSync(pastVersionCheck).toString().split('\n')[0];
        }
        if (pastVersion === name) {
            return;
        }
        const downloadCommand = `curl -L ${downloadUrl} -o ${dxvkLatest} --create-dirs`;
        const extractCommand = `tar -zxf ${dxvkLatest} -C ${heroicToolsPath}/DXVK/`;
        const echoCommand = `echo ${name} > ${heroicToolsPath}/DXVK/latest_dxvk`;
        const cleanCommand = `rm ${dxvkLatest}`;
        console.log('Updating DXVK to:', name);
        return execAsync(downloadCommand)
            .then(() => __awaiter(this, void 0, void 0, function* () {
            console.log('downloaded DXVK');
            console.log('extracting DXVK');
            child_process_1.exec(echoCommand);
            yield execAsync(extractCommand);
            console.log('DXVK updated!');
            child_process_1.exec(cleanCommand);
        }))
            .catch(() => console.log('Error when downloading DXVK'));
    });
}
exports.getLatestDxvk = getLatestDxvk;
function installDxvk(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!prefix) {
            return;
        }
        const winePrefix = prefix.replace('~', home);
        if (!graceful_fs_1.existsSync(`${heroicToolsPath}/DXVK/latest_dxvk`)) {
            console.log('dxvk not found!');
            yield getLatestDxvk();
        }
        const globalVersion = graceful_fs_1.readFileSync(`${heroicToolsPath}/DXVK/latest_dxvk`)
            .toString()
            .split('\n')[0];
        const dxvkPath = `${heroicToolsPath}/DXVK/${globalVersion}/`;
        const currentVersionCheck = `${winePrefix}/current_dxvk`;
        let currentVersion = '';
        if (graceful_fs_1.existsSync(currentVersionCheck)) {
            currentVersion = graceful_fs_1.readFileSync(currentVersionCheck).toString().split('\n')[0];
        }
        if (currentVersion === globalVersion) {
            return;
        }
        const installCommand = `WINEPREFIX=${winePrefix} bash ${dxvkPath}setup_dxvk.sh install`;
        const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`;
        console.log(`installing DXVK on ${winePrefix}`, installCommand);
        yield execAsync(`WINEPREFIX=${winePrefix} wineboot`);
        yield execAsync(installCommand, { shell: '/bin/bash' })
            .then(() => child_process_1.exec(echoCommand))
            .catch(() => console.log('error when installing DXVK, please try launching the game again'));
    });
}
const writeDefaultconfig = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!graceful_fs_1.existsSync(heroicConfigPath)) {
        const { account_id } = exports.getUserInfo();
        const userName = os_1.userInfo().username;
        const [defaultWine] = yield getAlternativeWine();
        const config = {
            defaultSettings: {
                defaultInstallPath: heroicInstallPath,
                wineVersion: defaultWine,
                winePrefix: `${home}/.wine`,
                otherOptions: '',
                useGameMode: false,
                showFps: false,
                maxWorkers: 0,
                language: 'en',
                userInfo: {
                    name: userName,
                    epicId: account_id,
                },
            },
        };
        graceful_fs_1.writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2));
    }
    if (!graceful_fs_1.existsSync(heroicGamesConfigPath)) {
        graceful_fs_1.mkdir(heroicGamesConfigPath, () => {
            return 'done';
        });
    }
});
exports.writeDefaultconfig = writeDefaultconfig;
const writeGameconfig = (game) => __awaiter(void 0, void 0, void 0, function* () {
    if (!graceful_fs_1.existsSync(`${heroicGamesConfigPath}${game}.json`)) {
        const { wineVersion, winePrefix, otherOptions, useGameMode, showFps, userInfo, } = yield getSettings('default');
        const config = {
            [game]: {
                wineVersion,
                winePrefix,
                otherOptions,
                useGameMode,
                showFps,
                userInfo,
            },
        };
        graceful_fs_1.writeFileSync(`${heroicGamesConfigPath}${game}.json`, JSON.stringify(config, null, 2), null);
    }
});
exports.writeGameconfig = writeGameconfig;
function checkForUpdates() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: { tag_name }, } = yield axios.default.get('https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest');
        const newVersion = tag_name.replace('v', '').replaceAll('.', '');
        const currentVersion = electron_1.app.getVersion().replaceAll('.', '');
        return newVersion > currentVersion;
    });
}
exports.checkForUpdates = checkForUpdates;
const showAboutWindow = () => {
    electron_1.app.setAboutPanelOptions({
        applicationName: 'Heroic Games Launcher',
        copyright: 'GPL V3',
        applicationVersion: `${electron_1.app.getVersion()} Magelan`,
        website: 'https://github.com/flavioislima/HeroicGamesLauncher',
        iconPath: icon,
    });
    return electron_1.app.showAboutPanel();
};
exports.showAboutWindow = showAboutWindow;
const checkGameUpdates = () => __awaiter(void 0, void 0, void 0, function* () {
    const command = `${legendaryBin} list-installed --check-updates --tsv | grep True | awk '{print $1}'`;
    const { stdout } = yield execAsync(command);
    const result = stdout.split('\n');
    return result;
});
exports.checkGameUpdates = checkGameUpdates;
const handleExit = () => __awaiter(void 0, void 0, void 0, function* () {
    const isLocked = graceful_fs_1.existsSync(`${heroicGamesConfigPath}/lock`);
    if (isLocked) {
        const { response } = yield showMessageBox({
            title: i18next_1.default.t('box.quit.title', 'Exit'),
            message: i18next_1.default.t('box.quit.message', 'There are pending operations, are you sure?'),
            buttons: [i18next_1.default.t('box.no'), i18next_1.default.t('box.yes')],
        });
        if (response === 0) {
            return;
        }
        return electron_1.app.exit();
    }
    electron_1.app.exit();
});
exports.handleExit = handleExit;
