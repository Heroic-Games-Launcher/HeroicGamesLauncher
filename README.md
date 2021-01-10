# Heroic Games Launcher

This app is a Linux GUI for the tool [Legendary](https://github.com/derrod/legendary), a Linux native alternative to the Epic Games Launcher.

### [Design based on the UI/UX Research by Biliane Moreira ](https://bilianemoreira.com/heroic-game-launcher-for-linux)

## Current Version Screenshots
![login](https://user-images.githubusercontent.com/26871415/104103415-49b96b00-52a2-11eb-83bf-ac6aaab2ff55.png)
![library](https://user-images.githubusercontent.com/26871415/104103422-4cb45b80-52a2-11eb-922e-b708279e9abf.png)
![game-options](https://user-images.githubusercontent.com/26871415/104103431-5ccc3b00-52a2-11eb-9342-67adfd1a7f2c.png)
![settings](https://user-images.githubusercontent.com/26871415/104103433-5dfd6800-52a2-11eb-8f31-12841f2cd527.png)

## How to use it:
- Download and install the package for your distro or the universal AppImage file on the Releases Page;
- If you used Legendary before, it load your library and installed games. If not, it will ask you for Login First. Just follow the instructions.

## Feature availables right now
- Login with an existing Epic Games account
- Logout
- See the your personal Game library
- Install/Uninstall Games
- Import a already installed game
- Multiple installations at the same time
- Play games using the default wine and default prefix
- Play game with custom wine (Lutris Wine/Proton maybe but can lead to bugs)
- Run games on custom wine prefix
- Check basic information about your Games
- Open game page on Epic Store
- Search for the game on ProtonDB

## Planned features
- Sync installed games with an existing Epic Games instalation folder
- Sync saves with the cloud
- Get the Free game of the week
- Add Games outside Epic Games
- Integration with other stores

## Binaries supported right now
- DEB, RPM, Pacman, AppImage and TAR.XZ (with the heroic binary and all dependecies)
- Might think about Flatpak in the future as well
- There is a AUR version right now: https://aur.archlinux.org/packages/heroic-games-launcher-bin/

## How to build and run locally

This app uses web technologies like Electron, React and Typescript.
To be able to run you will need to have NodeJs installed locally and follow the instructions below:

### Steps:
  - Since version 1.0 a account on [IGDB](https://api-docs.igdb.com/?javascript#account-creation) is necessary since we are using its API, and add a secrets.js file on the public folder with your client-id and secret.
  - Clone the Repository.
  - Install foreman with `npm i -g foreman`.
  - On the project folder run `npm install`.
  - Run `npm run build` to build the React Assets.
  - Run `npm start`.
  - To build the binaries run `npm run dist`.
