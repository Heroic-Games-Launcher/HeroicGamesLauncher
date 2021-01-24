# Heroic Games Launcher

Heroic is an Open Source Game Launcher for Linux.
Right now it supports launching game from the Epic Games Store using [Legendary](https://github.com/derrod/legendary), a Linux CLI alternative to launch epic games.
Heroic is built with Web Technologies like: Typescrypt, React, NodeJS and Electron.

### [Design based on the UI/UX Research by Biliane Moreira ](https://bilianemoreira.com/heroic-game-launcher-for-linux)

## Current Version Screenshots

![login](https://user-images.githubusercontent.com/26871415/104823821-49dedb00-584d-11eb-9e89-0972f5515e96.png)
![library](https://user-images.githubusercontent.com/26871415/104823772-eb196180-584c-11eb-9302-667e3d3e934e.png)
![gamepage](https://user-images.githubusercontent.com/26871415/104823773-ec4a8e80-584c-11eb-970b-32b83ab88365.png)
![game-installed](https://user-images.githubusercontent.com/26871415/104823774-ec4a8e80-584c-11eb-9b11-6a418bf58329.png)
![settings-other](https://user-images.githubusercontent.com/26871415/104823775-ec4a8e80-584c-11eb-8e9f-4690e8ec21a9.png)

## How to use it:

- Download and install the package for your distro or the universal AppImage file on the Releases Page;
- If you used Legendary before, it load your library and installed games. If not, it will ask you for Login First. Just follow the instructions.

## Feature availables right now

- Login with an existing Epic Games account
- Install/Uninstall Games
- Import an already installed game
- Update installed Games
- Repair installed Games
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

- DEB, RPM, Pacman, AppImage and TAR.XZ (with the heroic binary and all dependecies)
- Recommended AUR version: https://aur.archlinux.org/packages/heroic-games-launcher-bin/
- Might think about Flatpak And/Or SNAP in the future as well

## How to build and run locally

To be able to run you will need to have NodeJs installed locally and follow the instructions below:

### Steps:

- Clone the Repository.
- Install foreman with `npm i -g foreman`.
- On the project folder run `npm install`.
- Run `npm run build` to build the React Assets.
- Run `npm start`.
- To build the binaries run `npm run dist`.
