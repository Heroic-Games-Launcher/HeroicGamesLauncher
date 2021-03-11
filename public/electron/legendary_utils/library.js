"use strict";
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
exports.getLegendaryConfig = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
const util_1 = require("util");
const graceful_fs_1 = require("graceful-fs");
// @ts-ignore
const byte_size_1 = __importDefault(require("byte-size"));
const utils_1 = require("../utils");
const statAsync = util_1.promisify(graceful_fs_1.stat);
const dlcs = [];
const installed = `${utils_1.legendaryConfigPath}/installed.json`;
function getLegendaryConfig(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const loggedIn = utils_1.isLoggedIn();
        if (!utils_1.isLoggedIn) {
            return { user: { displayName: null }, library: [] };
        }
        const files = {
            user: utils_1.getUserInfo(),
            library: `${utils_1.legendaryConfigPath}/metadata/`,
            config: utils_1.heroicConfigPath,
            installed: yield statAsync(installed)
                .then(() => JSON.parse(graceful_fs_1.readFileSync(installed, 'utf-8')))
                .catch(() => []),
        };
        if (file === 'user') {
            if (loggedIn) {
                yield utils_1.writeDefaultconfig();
                return files.user.displayName;
            }
            return null;
        }
        if (file === 'library') {
            const fallBackImage = 'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg';
            if (graceful_fs_1.existsSync(files.library)) {
                return graceful_fs_1.readdirSync(files.library)
                    .map((file) => `${files.library}/${file}`)
                    .map((file) => JSON.parse(graceful_fs_1.readFileSync(file, 'utf-8')))
                    .map(({ app_name, metadata, asset_info }) => {
                    const { description, keyImages, title, developer, dlcItemList, customAttributes: { CloudSaveFolder, FolderName }, } = metadata;
                    const { namespace } = asset_info;
                    if (dlcItemList) {
                        dlcItemList.forEach((v) => {
                            if (v.releaseInfo && v.releaseInfo[0]) {
                                dlcs.push(v.releaseInfo[0].appId);
                            }
                        });
                    }
                    const cloudSaveEnabled = Boolean(CloudSaveFolder);
                    const saveFolder = cloudSaveEnabled ? CloudSaveFolder.value : '';
                    const installFolder = FolderName ? FolderName.value : '';
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
                    const dlc = () => dlcs.some((dlc) => dlc === app_name);
                    const { executable = null, version = null, install_size = null, install_path = null, is_dlc = dlc(), } = info;
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
                        folderName: installFolder,
                        art_cover: art_cover || art_square,
                        art_square: art_square || art_cover,
                        art_logo,
                        is_dlc,
                        namespace
                    };
                })
                    .sort((a, b) => {
                    const gameA = a.title.toUpperCase();
                    const gameB = b.title.toUpperCase();
                    return gameA < gameB ? -1 : 1;
                });
            }
            return { user: null, library: [] };
        }
    });
}
exports.getLegendaryConfig = getLegendaryConfig;
