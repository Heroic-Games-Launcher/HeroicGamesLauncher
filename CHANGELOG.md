## 1.8.0

### Bugfixes
**Fixes bugs found on RC2** like:
- Shortcuts were always being created on Linux despite the setting being on or off.
- 'The Spectrun Retreat' game wasn't opening the game page.
- Some shortcuts were being created without proper icon.
- Fix Sync Save folder with wrong slashes on Linux.
- Offline option wasn't working.

## Version 1.8.0-rc2

### General
- Added Simplified Chinese language
- Added recent games on the tray icon and a filter on the library.
- Added Discord RPC support (except Linux AppImages)  thanks @TabulateJarl8 
- Submenu now is always visible on Game Page. 
- It's possible to update a game from the game page now by clicking on the update information instead of opening the settings like before.
- Downloading Fortnite and Cyberpunk2077 still not possible but they now can be imported.
- Fixed a bug when a game needed repair before updating and the information got messed up.
- Other minor Bugfixes and performance improvements.

### Linux
- Added shortcuts on Desktop and Applications menu. By default, it will always create after installing a new game and removing it when uninstalling. 
- Added button to create shortcuts from the Game Page.
- Improved Winetricks and Winecfg handlers and they should work now with proton 6.3+
- Fixed save-sync folder when using Proton
- Added `STEAM_COMPAT_CLIENT_INSTALL_PATH` variable when launching a game with proton since its needed from Proton versions 6.3+.
- Improved Logging when running from the terminal. Thanks @dragonDScript  and @Nocccer 

### Windows
- It's now possible to choose the install folder.
- Fixed the stop install button. 
- Fixed Verify and Repair function
- Simplified Sync with Epic Games Store setting.

### Mac
- Started officially distributing the binary as a DMG file.
- Hidden unnecessary settings.
- Heroic downloads ONLY WINDOWS GAMES, so it's recommended to have Crossover installer otherwise the games won't work.

## Version 1.8.0-rc1

### New Features
- Initial Windows support with a few limitations compared with the Linux version
- Better interface for Unreal Marketplace
- Added error message if Python version is lower than 3.8 on Linux since Legendary won't work with it.
- Added a warning message when the credentials have expired.

### Bugfixes
- Fixed an error where the files weren't removing when canceling the install from gamecard.
- Fixed installing on the wrong directory when not choosing a proper folder for install.
- Fixed some cover resolution for some games Thanks @StefanLobbenmeier 

### Other Stuff
- Better interface for Unreal Marketplace
- Added error message if Python version is lower than 3.8 on Linux since Legendary won't work with it.
- Added a warning message when the credentials have expired.
- Updated Electron to version 13.1.0
- Refactored several Backend and Frontend functions
- A great part of the frontend now contains unit and integration tests, improving the code quality overall.
- Added Greek Language

## Version 1.7.0

### New Features
- Heroic now will continue the download status from where it stopped instead of getting back from 0% everytime.
- Added option to enable Nvidia Prime Render Offload on settings
- Added a Wiki button to NavBar

### Bugfixes
- Fixed an old bug where big installations could be interrupted #195
- Fixed another old bug where Heroic wasn't finding Steam Proton on Ubuntu and derivatives #359
- Fixed missing Unreal Marketplace Assets introduced on 1.6.1 #367

### Other Stuff
- Updated Electron to version 12, making it use less resources. In some cases almost 15% less RAM (from around 140MB to 115MB sometimes)
- Removed some other dependencies that might give some better performance overall as well.