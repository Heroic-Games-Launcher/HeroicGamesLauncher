# Heroic Games Launcher

This app is GUI for the tool [Legendary](https://github.com/derrod/legendary), a native alternative to the Epic Games Launcher for Linux.

![heroic-library](https://user-images.githubusercontent.com/26871415/103409170-c68f6b00-4b65-11eb-8d79-ba5ae1a58e74.png)
![heroic-game](https://user-images.githubusercontent.com/26871415/103409190-e3c43980-4b65-11eb-8980-dd675420e867.png)

## Dependencies:
- [Legendary](https://github.com/derrod/legendary)
- Xterm (installed in most distros. I'll check the default terminal in the future)

## How to use it:
- Download the AppImage on the Releases Page
- Install legendary
- install xterm
- chmod +x heroic-xxx.AppImage
- ./heroic-xxx.AppImage
- If you neved used Legendary before, it will ask you to login first. So, two windows will be opened, a browser window will be opened on Epic Games Store for you to login there and get the SID code, and also a Xterm window will be opened and there you will paste the SID code.
- After the login, the app will refresh the game list and should relaunch showing your library. Sometime it won't then just close it and open it again.
- If you think is easier, before launching the app, run `legendary auth` on a terminal and after login run `legendary list-games`. Then the app will identify the configuration and will open your library.

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
To be able to run you will need to have NodeJs installed locally and follow the instructions below:

### Steps:
  - Clone the Repository.
  - Install foreman with `npm i -g foreman`.
  - On the project folder run `npm install`.
  - Run `npm run build` to build the React Assets.
  - Run `npm start`.
  - To build the binaries run `npm run dist`.
