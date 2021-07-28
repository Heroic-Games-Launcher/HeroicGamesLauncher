## 1.9.0

### General
- Improved Heroic performance by caching library information and making requests in background. Making Heroic opening almost instantly and navigation more responsive.
- Added Play time tracker, nice to know how long you've been playing a game :P
- Remade Login Screen according to new design.
- When clicking install from the library, Heroic will show a window with the options to install or import the game.
- Added better quality Tray Icons.
- Added option to start Heroic minimized.
- Changed main theme to shades of blue.
- Changed sevel UI elements like the Gamecard that now always shows the title, install, settings and play buttons.
- Changed the filter to be a list since it was growing in size.
- Changed the position of the search bar to the header instead of the navbar.
- Its not necessary to restart Heroic anymore after changing the Tray Icon color.
- Several functions were refactored to improve Heroics performance and stability.
- Running Heroic from terminal should have even more logs now, great to debug.
- Removed the ability to downloads several games at the same time since this was causing some of them to appear as not installed (will evolve to a Queue at some point).
- Moved some settings from General to Other.
- **Linux**: Added FSR Hack toggle and Sharpness strength to Wine settings (needs support in wine).
- **Linux**: Added resizable bar toggle to Wine settings (needs support in wine and NVIDIA RTX to work).
- **Linux/OSX**: Added Wine and Prefix information on the game page.

### Bugfixes
- Fixed a small bug where the search bar was not keeping the correct state.
- Fixed some game info caching that wasn't working.
- Fixed a bug where the game information cache wasn't being updated after changing Heroic's language.
- Windows: Fixed major bug that caused Heroic to not open on some configurations.
- Windows: Fixed clicking on the settings icon when using list view going to the Wine settings.
- Windows: Fixed default install path using wrong slashes.

### New Translations:
- Portuguese (Brazil)
- Catalã
- Tamil

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