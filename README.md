# Heroic Games Launcher

Heroic is an Open Source Game Launcher for Linux.
Right now it supports launching game from the Epic Games Store using [Legendary](https://github.com/derrod/legendary), a Linux CLI alternative to launch epic games.
Heroic is built with Web Technologies like: TypeScript, React, NodeJS and Electron.

### [Discord Server](https://discord.gg/rHJ2uqdquK)

### [Design based on the UI/UX Research by Biliane Moreira ](https://bilianemoreira.com/heroic-game-launcher-for-linux)

## Current Version Screenshots

![image](https://user-images.githubusercontent.com/26871415/108600496-bcd0f980-7397-11eb-86d0-95e4f9aa6125.png)
![image](https://user-images.githubusercontent.com/26871415/108600444-898e6a80-7397-11eb-961e-b8ee5ad5e3a3.png)
![image](https://user-images.githubusercontent.com/26871415/108600533-f6096980-7397-11eb-8272-5105f75d92c8.png)
![image](https://user-images.githubusercontent.com/26871415/108600451-8eebb500-7397-11eb-966a-70849a589902.png)
![image](https://user-images.githubusercontent.com/26871415/108600462-a460df00-7397-11eb-8a42-cde5b9b2744c.png)
![image](https://user-images.githubusercontent.com/26871415/108600516-e2f69980-7397-11eb-8b96-513729859b86.png)

## How to use it:

- Download and install the package for your distro or the universal AppImage file on the Releases Page;
- If you used Legendary before, it loads your library and installed games. If not, it will ask you to login first. Just follow the instructions.

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

## Language Support

- English
- German
- Portuguese
- French
- Russian
- Polish
- Turkish
- Dutch
- Spanish
- Hungarian

## Binaries supported right now

- DEB, RPM and AppImage
- Recommended AUR version: https://aur.archlinux.org/packages/heroic-games-launcher-bin/
- Fedora (COPR): https://copr.fedorainfracloud.org/coprs/atim/heroic-games-launcher/
- Might think about Flatpak And/Or SNAP in the future as well

## How to build and run locally

To be able to run you will need to have NodeJS installed locally and follow the instructions below:

### Steps:

- Clone the Repository.
- On the project folder run `yarn install`.
- Run `yarn build` to build the React Assets.
- Run `yarn start`.
- To build the binaries run `yarn dist {package to create}`.
