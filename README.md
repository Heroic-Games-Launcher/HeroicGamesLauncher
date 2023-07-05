# Heroic Games Launcher

[![GitHub release](https://img.shields.io/github/v/release/Heroic-Games-Launcher/HeroicGamesLauncher?style=for-the-badge)](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest)
[![GitHub all releases](https://img.shields.io/github/downloads/Heroic-Games-Launcher/HeroicGamesLauncher/total?style=for-the-badge&color=00B000)](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/)
[![Flathub](https://img.shields.io/flathub/downloads/com.heroicgameslauncher.hgl?label=flathub&logo=flathub&logoColor=white&style=for-the-badge&color=00B000)](https://flathub.org/apps/details/com.heroicgameslauncher.hgl)
[![GPLv3 license](https://img.shields.io/github/license/Heroic-Games-Launcher/HeroicGamesLauncher?style=for-the-badge&color=blue)](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/blob/main/COPYING)  
[![Discord](https://img.shields.io/discord/812703221789097985?label=Discord%20Server&logo=discord&color=5865F2&style=for-the-badge)](https://discord.gg/rHJ2uqdquK)
[![Patreon](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dheroicgameslauncher%26type%3Dpatrons&style=for-the-badge)](https://patreon.com/heroicgameslauncher)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?style=for-the-badge&logo=paypal)](https://www.paypal.me/heroicgl)
[![kofi](https://img.shields.io/badge/Ko--Fi-Donate-orange?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/heroicgames)

Heroic is an Open Source Game Launcher for Linux, Windows and macOS.  
Right now it supports launching games from the Epic Games Store using [Legendary](https://github.com/derrod/legendary), GOG Games using our custom implementation with [gogdl](https://github.com/Heroic-Games-Launcher/heroic-gogdl) and Amazon Games using [Nile](https://github.com/imLinguin/nile).

Heroic is built with Web Technologies:  
[![Typescript](https://img.shields.io/badge/Typescript-3178c6?style=for-the-badge&logo=typescript&labelColor=gray)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-5fd9fb?style=for-the-badge&logo=react&labelColor=gray)](https://reactjs.org/)
[![MUI](https://img.shields.io/badge/MUI-66b2ff?style=for-the-badge&logo=mui&labelColor=gray&logoColor=66b2ff)](https://mui.com/)
[![NodeJS](https://img.shields.io/badge/NodeJS-689f63?style=for-the-badge&logo=nodedotjs&labelColor=gray)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-4078c0?style=for-the-badge&logo=electron&labelColor=gray)](https://www.electronjs.org/)
[![electron-builder](https://img.shields.io/badge/electron--builder-4078c0?style=for-the-badge&logo=electronbuilder&labelColor=gray&logoColor=4078c0)](https://www.electron.build/)
[![Jest](https://img.shields.io/badge/Jest-18DF16?style=for-the-badge&logo=jest&labelColor=gray&logoColor=18DF16)](https://jestjs.io/)
[![Vite](https://img.shields.io/badge/Vite-BD34FE?style=for-the-badge&logo=vite&labelColor=gray)](https://vitejs.dev/)

## Index

- [Heroic Games Launcher](#heroic-games-launcher)
  - [Index](#index)
  - [Features available right now](#features-available-right-now)
  - [Planned features](#planned-features)
  - [Supported Operating Systems](#supported-operating-systems)
  - [Language Support](#language-support)
    - [Help with Translations Here](#help-with-translations-here)
  - [Installation](#installation)
    - [Linux](#linux)
      - [Flatpak](#flatpak)
      - [Debian, Ubuntu and Derivatives](#debian-ubuntu-and-derivatives)
      - [Arch (AUR)](#arch-aur)
      - [Fedora](#fedora)
      - [Other Distributions (AppImage and TAR.XZ)](#other-distributions-appimage-and-tarxz)
    - [Windows](#windows)
    - [macOS](#macos)
  - [Development environment](#development-environment)
    - [Building Heroic Binaries](#building-heroic-binaries)
    - [Building with VS Code](#building-with-vs-code)
    - [Quickly testing/debugging Heroic on your own system](#quickly-testingdebugging-heroic-on-your-own-system)
    - [Development Using a Container](#development-using-a-container)
    - [Testing with Docker](#testing-with-docker)
  - [Sponsors](#sponsors)
  - [Screenshots](#screenshots)
  - [Credits](#credits)

## Features available right now

- Login with an existing Epic Games, GOG or Amazon account
- Install, uninstall, update, repair and move Games
- Import an already installed game
- Play Epic games online [AntiCheat on macOS and on Linux depends on the game]
- Play games using Wine or Proton [Linux]
- Play games using Crossover [macOS]
- Download custom Wine and Proton versions [Linux]
- Access to Epic and GOG stores directly from Heroic
- Search for the game on ProtonDB for compatibility information [Linux]
- Show ProtonDB and Steam Deck compatibility information [Linux]
- Sync installed games with an existing Epic Games Store installation
- Sync saves with the cloud
- Custom Theming Support
- Download queue
- Add Games and Applications outside GOG, Epic Games and Amazon Games

## Planned features

- Support Other Store (IndieGala, etc)
- Play GOG games online

## Supported Operating Systems

- Linux:
  - Ubuntu 20.04LTS or newer
  - Fedora 33 or newer
  - Arch Linux & derivatives (Manjaro, Garuda, EndeavourOS)
  - Heroic will still _work_ on most distros, but it is up to you to _get_ it to work
    Chances are though that someone on our [Discord](https://discord.gg/rHJ2uqdquK) can help you
- SteamOS (downloading using Discover only)
- Windows 10 & 11
- macOS 12 or newer

## Language Support

<details>
  <summary>Expand</summary>

Thanks to the community, Heroic was translated to almost 40 different languages so far:

- English
- Azerbaijani
- Basque
- Belarussian
- Bosnian
- Bulgarian
- Catalan
- Czech
- Croatian
- Simplified Chinese
- Traditional Chinese
- Dutch
- Estonian
- Finnish
- French
- German
- Greek
- Japanese
- Korean
- Hungarian
- Italian
- Indonesian
- Malayalam
- Norwegian Bokmål
- Persian
- Polish
- Portuguese
- Portuguese (Brazil)
- Romanian
- Russian
- Spanish
- Slovak
- Swedish
- Tamil
- Turkish
- Ukrainian
- Vietnamese

</details>

### Help with Translations [Here](https://hosted.weblate.org/projects/heroic-games-launcher)

## Installation

### Linux

#### Flatpak

[<img src="https://flathub.org/assets/badges/flathub-badge-en.png" alt="Flathub Badge" width="10%" />](https://flathub.org/apps/details/com.heroicgameslauncher.hgl)

Heroic is available on Flathub, so you should be able to easily install it on most distros with Software Centers (Pop!\_Shop, Discover, etc.)

#### Debian, Ubuntu and Derivatives

Download the file ending in .deb from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest).  
Double-click it to open it up in your Software Manager, or run `sudo dpkg -i heroic_*_amd64.deb` to install it directly:

#### Arch (AUR)

We have two AUR packages available:

- [![Stable version badge](https://img.shields.io/aur/version/heroic-games-launcher-bin?style=flat&label=heroic-games-launcher-bin)](https://aur.archlinux.org/packages/heroic-games-launcher-bin)  
  (stable release, recommended)
- [![Beta version badge](https://img.shields.io/aur/version/heroic-games-launcher-beta-bin?style=flat&label=heroic-games-launcher-beta-bin)](https://aur.archlinux.org/packages/heroic-games-launcher-beta-bin)  
  (beta release, contains newer features but might be unstable)

Please see [the Arch Wiki](https://wiki.archlinux.org/title/Arch_User_Repository#Installing_and_upgrading_packages) on how to install them

#### Fedora

##### COPR repo

Heroic for Fedora is available on [this COPR repo](https://copr.fedorainfracloud.org/coprs/atim/heroic-games-launcher/).  
Enable it with `sudo dnf copr enable atim/heroic-games-launcher`, then install Heroic with `sudo dnf install heroic-games-launcher-bin`

##### Binary package from the releases page

You can alternatively download the file ending in .rpm from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest) and install it with `sudo dnf install ./heroic-*.x86_64.rpm`

#### Other Distributions (AppImage and TAR.XZ)

Since these two distribution formats don't have a form of dependency management, make sure the `curl` command is available. You might run into weird issues if it's not.

##### AppImage

- Download the file ending in .AppImage from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest)
- Make it executable (`chmod +x Heroic*.AppImage`)
- Run it (double-click in most file managers, or run `./Heroic*.AppImage`)

##### .tar.xz

- Download the file ending in .tar.xz from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest)
- Extract it anywhere
- Run the `heroic` file in the folder you extracted it to (double-click in most file managers, or run `./heroic`)

### Windows

#### WinGet

If you use WinGet (installed by default on Windows 11 and modern versions of 10), you can run `winget install Heroic` in a terminal to install Heroic.

#### Manual installl

Download the Heroic Installer (`Heroic-x.x.x-Setup.exe`) or the portable version (`Heroic-x.x.x-Portable.exe`) from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest). Run the executable you downloaded to install/run Heroic.  
The Setup will create shortcuts to Heroic on your Desktop and in your Start Menu.

### macOS

If you use Homebrew, you can run `brew install --cask --no-quarantine heroic` to install Heroic.  
Otherwise, download the file ending in .dmg from the [latest release](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest), double-click it to mount it, and drag the "Heroic" application into the "Applications" folder.

## Development environment

This part will walk you through setting up a development environment so you can build Heroic binaries yourself or make changes to the code.

1. Make sure Git, NodeJS, and Yarn are installed
2. Clone the repo and enter the cloned folder, for example with these commands:

   ```bash
   git clone https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher.git --recurse-submodules
   cd HeroicGamesLauncher
   ```

3. Make sure all dependencies are installed by running `yarn`

### Building Heroic Binaries

Run the appropriate command for your OS:

- Build for Linux:

  ```bash
  yarn dist:linux # Optionally specify a package to create (eg: deb, pacman, tar.xz, rpm, AppImage); default: AppImage
  ```

- Build for Windows:

  ```bash
  yarn dist:win
  ```

- Build for Mac:
  ```bash
  yarn dist:mac
  ```

### Building with VS Code

Instead of using the above commands to build Heroic, you can also use the Tasks in VSCode to build.
To do that, open up the command palette (Ctrl + P), type in "task" and press Space. You will then see 3 build tasks, "Build for Linux", "Build for Windows", and "Build for MacOS". Click the one you want to run.

### Quickly testing/debugging Heroic on your own system

If you want to quickly test a change, or you're implementing features that require a lot of restarts, you can use Vite's development server to speed up the process:  
Go to the "Run and Debug" tab of VSCode and start the "Launch Heroic (HMR & HR)" task (alternatively, if you're not using VSCode or just prefer the terminal, run `yarn start`). Heroic will start up after a short while, and once you make any change to the code, it'll reload/restart.

Note: If you do not need the React developer tools while testing changes, you can skip their install by setting the `HEROIC_NO_REACT_DEVTOOLS` environment variable before running `yarn start` (for example with `HEROIC_NO_REACT_DEVTOOLS=1 yarn start`).

### Development Using a Container

<details>
  <summary>Expand</summary>

If you would prefer, we have a docker container defined to develop / build Heroic with (a potential reason being to avoid loading tons of dependencies on your host filesystem). There are two methods, based on whether you use VS Code.

**VS Code**

There is a `.devcontainer` directory containing a definition that VS Code will recognize for automatically opening your local Heroic directory in a container in VS Code.

**NOTE: this requires that you install the 'Remote - Containers' extension.**

1. Open the root of your local Heroic directory in VS Code.
2. You should get a prompt in the bottom right to build and open the project in the dev container.
3. If the above prompt does not occur, on the bottom left, there is a green icon that should be there if the remote extension is installed. Click on it, and select "Reopen in container".
4. The bottom left green icon should now say: "Dev Container: Heroic Games Launcher".

After the container's package manager runs, open a new terminal session and you should be able to run bash commands from within the container. Any yarn dist:linux builds should also now show up on your host filesystem.

**Manually Building the Docker Image**

If you don't use VS Code or don't want it integrated with the container, you can build and run the container manually using either Docker or Podman.

1. From the root of your local Heroic directory, run:

   ```bash
   docker build -t heroicdevcontainer -f Dockerfile .
   ```

2. Assuming all went well, you can now enter the container:

   ```bash
   docker run -it -v ./:/tmp/heroic localhost/heroicdevcontainer:latest
   ```

3. The above command will mount your local Heroic dir to `/tmp/heroic` in the container (unless you used a different path).

   ```
   cd /tmp/heroic
   ```

And you should be good to go, code and build away!

</details>

### Testing with Docker

It is recommended to run end to end tests with Docker so you don't alter your local config files or have your local config files interfere with the tests.

To run e2e tests on the unpackaged app running in dev mode.
From the root of your local Heroic directory, run:

```bash
yarn test:e2e
```

To run e2e tests on the packaged app.
From the root of your local Heroic directory, run:

```bash
yarn test:e2ePackaged
```

## Sponsors

Thanks [Weblate](https://weblate.org/en/) for hosting our translations

![weblate](https://s.weblate.org/cdn/Logo-Darktext-borders.png)

Thanks [Signpath](https://signpath.io/?utm_source=foundation&utm_medium=github&utm_campaign=heroicgameslauncher) for providing free signing of Windows binaries

[![signpath](https://user-images.githubusercontent.com/26871415/182468471-6ef4aac6-a4e2-4ae8-93ef-d638cd01627d.png)](https://signpath.io/?utm_source=foundation&utm_medium=github&utm_campaign=heroicgameslauncher)

## Screenshots

<details>
  <summary>Expand</summary>

![image](https://user-images.githubusercontent.com/26871415/184140182-0b0b92b0-e388-401f-910b-ff95b22db059.png)
![image](https://user-images.githubusercontent.com/26871415/184139791-8666bc1d-a54f-467c-8c30-ea1eb6d24458.png)
![image](https://user-images.githubusercontent.com/26871415/184139827-ff8ae4ef-f5c3-42f4-b789-1b30595ec0b0.png)
![image](https://user-images.githubusercontent.com/26871415/184140036-28ee0d8b-a263-4ed8-a30a-1cd19436f90a.png)
![image](https://user-images.githubusercontent.com/26871415/184141942-937f8cc0-f148-4729-b03e-bfcc8132c233.png)
![image](https://user-images.githubusercontent.com/26871415/184144277-699e1108-52d9-4558-b113-84db5c90922c.png)
![image](https://user-images.githubusercontent.com/26871415/184144417-b3eb0ea5-5433-4273-ad35-15317f22588b.png)

</details>

## Credits

### Weblate: Localization platform

- URL: https://weblate.org/en/

### Those Awesome Guys: Gamepad prompts images

- URL: https://thoseawesomeguys.com/prompts/

[![jump](https://img.shields.io/badge/Back%20to%20top-%20?style=flat&color=grey&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjRweCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZD0iTTAgMGgyNHYyNEgwVjB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQgMTJsMS40MSAxLjQxTDExIDcuODNWMjBoMlY3LjgzbDUuNTggNS41OUwyMCAxMmwtOC04LTggOHoiLz48L3N2Zz4=)](#heroic-games-launcher)
