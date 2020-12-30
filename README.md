# Heroic Games Launcher

This app is a native alternative to the Epic Games Launcher for Linux.
It uses the features implemented on [Legendary](https://github.com/derrod/legendary) but providing a GUI for it.

## Dependencies:
- [Legendary](https://github.com/derrod/legendary)

## Feature availables right now
- Login with an existing Epic Games account
- See the whole library
- Check basic information about your Games
- Install/Uninstall Games
- Play games using the default wine and default prefix
- Sync saves with the cloud (kind of bugged)
- Open game page on Epic Store
- Search for the game on ProtonDB


## Planned features
- Customized instalation options
- Play game with custom wine (Proton maybe but can be bugs)
- Sync installed games with an existing Epic Games instalation folder
- Get the Free game of the week
- Logout (why not?)
- Put the Legendary binnary along with the Heroic one (Not 100% sure about this one)

## Binaries supported right now
- AppImage
- Will release DEBs, RPMs and put on AUR as well as soon as possible.

## How to build and run locally

This app uses web technologies like Electron, React and Typescript.
To be able to run you will need to have nodeJs installed locally.

### Steps:
  - Clone the Repository
  - On the project folder run `npm install`
  - Run `npm start`
  - To build the binaries run `npm run dist`
