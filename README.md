# Heroic Games Launcher

Heroic is an Open Source Game Launcher for Linux.
Right now it supports launching game from the Epic Games Store using [Legendary](https://github.com/derrod/legendary), a Linux CLI alternative to launch epic games.
Heroic is built with Web Technologies like: Typescrypt, React, NodeJS and Electron.

### [Design based on the UI/UX Research by Biliane Moreira ](https://bilianemoreira.com/heroic-game-launcher-for-linux)

## Current Version Screenshots

![login](https://user-images.githubusercontent.com/26871415/104823821-49dedb00-584d-11eb-9e89-0972f5515e96.png)
![library](https://user-images.githubusercontent.com/26871415/106364733-8f150980-6331-11eb-8680-b8128ea0fb5a.png)
![gamepage](https://user-images.githubusercontent.com/26871415/106364522-f7fb8200-632f-11eb-941d-32ff55d16782.png)
![image](https://user-images.githubusercontent.com/26871415/106364750-b7046d00-6331-11eb-968a-5f63007cbb3d.png)
![settings-other](https://user-images.githubusercontent.com/26871415/106364722-760c5880-6331-11eb-8542-1423e6637b49.png)

## How to use it:

- Download and install the package for your distro or the universal AppImage file on the Releases Page;
- If you used Legendary before, it load your library and installed games. If not, it will ask you for Login First. Just follow the instructions.

## Feature availables right now

- Login with an existing Epic Games account
- Install/Uninstall Games
- Import an already installed game
- Play online (EAC not supported)
- Update installed Games
- Repair installed Games
- Move installed games to different folders
- Multiple downloads at the same time
- Play games using the default wine and default prefix
- Play game with custom wine (Lutris Wine/Proton maybe but can lead to bugs)
- Run games on custom wine prefix
- Check basic information about your Games
- Open game page on Epic Store
- Search for the game on ProtonDB
- Sync installed games with an existing Epic Games instalation folder
- Sync saves with the cloud

## Planned features

- Better Login System
- Get the Free game of the week
- Add Games outside Epic Games
- Integration with other stores (GOG, ITCH.IO, Humble Bundle)

## Binaries supported right now

- DEB, RPM and AppImage
- Recommended AUR version: https://aur.archlinux.org/packages/heroic-games-launcher-bin/
- Fedora (COPR): https://copr.fedorainfracloud.org/coprs/atim/heroic-games-launcher/
- Might think about Flatpak And/Or SNAP in the future as well

## How to build and run locally

To be able to run you will need to have NodeJs installed locally and follow the instructions below:

### Steps:

- Clone the Repository.
- Install foreman with `npm i -g foreman`.
- On the project folder run `npm install`.
- Run `npm run build` to build the React Assets.
- Run `npm start`.
- To build the binaries run `npm run dist {package to create}`.
