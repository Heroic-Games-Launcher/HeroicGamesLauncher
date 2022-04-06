# Changelog

## 2.2.6 Oden - Hotfix 5

### What's Changed

- [Bugfix] fix an issue on Linux and Mac where the Login is not working for the Epic Games

## 2.2.5 Oden - Hotfix 4

### What's Changed

- [Bugfix] Issues with Epic Login and refresh Library by @flavioislima in #1073
- [i18n] Translations update from Hosted Weblate by @weblate in #1075

## 2.2.4 Oden - Flatpak and other fixes

### What's Changed

- [General] Fixes Games Logs and Games settings path since they were pointing to the wrong folder on v.2.2.3.
- [General] Handle 404 errors from GOGDB.
- [Linux] Disable check for updates by default on Flatpak.
- [Linux] Fixes Default wine prefix for Flatpak

## 2.2.3 Oden - Windows and MacOS fixes

### What's Changed

- [Bugfix | Windows / MacOS] Fixes Config Path on Windows and Mac and add minimize to tray on launch setting by @flavioislima in #1059

## 2.2.2 Oden - General improvements

### What's Changed

- [General] Several improvements and fixes for GOGDL by @imLinguin in #1046
- [General] Improve navigation on touchscreen and gamepad and revert some colors by @wiryfuture in #964
- [General] Added missing alternate exe parameter for GOG Linux by @redromnon in #1024
- [General] UI improvements and additions by @8Bitz0 in #1041
- [Linux] Improve Wine version handling by @CommandMC in #1008
- [Linux] Wine-GE-Proton Compatibility by @nezd5553 in #1040
- [Linux] Flatpak preparations by @flavioislima in #515
- [Bugfix] Fixup protocol handling when Heroic is already running by @CommandMC in #1019
- [i18n] Translations update from Hosted Weblate by @weblate in #1035

## 2.2.1 Oden - Hotfix 1

### What's Changed

- [Bugfix] Library not loading, games not installing by @imLinguin in #1001
- [Bugfix] Quotes on default install path making installation fail.
- [Bugfix | Linux] Trying to run the native game through wine by @imLinguin in #1006

## 2.2.0 Oden - GOG is Here! 🎉

### Features for GOG games

- Downloading games using Galaxy API (Windows and macOS)
- Downloading games using offline installers (Linux)
- Ability to pick a game language for games that support it
- Downloading game DLCs (might not work properly with old V1 Depots)
- Ability to run native Linux games using Steam Runtime Scout (fixes issues with Baldur's Gate libssl not found error) Requires Steam

### Other changes and Fixes:

- [General] Beta-Feature: GOG implementation by @imLinguin in #872
- [General] Fix Reset Heroic + Update Electron by @flavioislima in #995
- [General] Add GOG store link on Sidebar by @flavioislima in #997
- [General] Offline mode only toggleable if allowed by @Nocccer in #970
- [General] Enable useUnknownInCatchVariables to forbid log calls with catch variables of none type string by @Nocccer in #998
- [General] Fix option check for update on startup by @Nocccer in #980
- [General] Updated Electron to v17.0.1
- [General] From now on at least one account is required (you don't have to use GOG or Epic if you don't want to 😃 )
- [General] Added "runner" (game store) indicator on GamePage
- [Windows] Fix creation of log file by @Nocccer in #979
- [Windows] Fixed manifest-path creation for EGS sync by @Nocccer in #983
- [Mac] Better Mac Installer by @olek-arsee in #960
- [Bugfix] External URLs not opening by @imLinguin in #994
- [i18n] Translations update from Hosted Weblate by @weblate in #988

## 2.1.1 Rayleigh - Improvements and Fixes

### What's Changed

- [General] Update settings section by @wiryfuture in #896
- [General] Show log output in Settings --> Log by @Nocccer in #929
- [General] Add timestamp and relined logs by @Nocccer in #939
- [Linux] Added checkbox to uninstall-modal to remove prefix as well by @Nocccer in #940
- [Linux] Wine manager minor update by @Nocccer in #938
- [Linux] Removed python check. by @Nocccer in #925
- [Linux] Fix DXVK/VKD3D installation by @flavioislima in #950
- [Bugfix] Fixed epic service status check. by @Nocccer in #932
- [i18n] Translations update from Hosted Weblate by @weblate in #923

Important: Heroic now depends on ZSTD to be installed for it to properly extract VKD3D on linux. We will try to remove that dependency on next release somehow.

## 2.1.0 Rayleigh

### What's Changed

- [General] It's now possible to navigate Heroic using a Gamepad. Support Xbox One, Playstation controllers, and a few generic ones for now. You can also use a virtual keyboard for the search input by @arielj
- [General] Heroic now will remember Window Size and position by @Nocccer
- [General] Support Ctrl+F and CMD+F shortcut to focus search bar by @arielj
- [General] Check Epic servers status and show warning messages on Install, update, launch, etc. by @flavioislima
- [General] Heroic now will store a log for every session under a folder named Logs on the Heroic config folder by @Nocccer
- [General] Add clear button (x) to search bar by @TabulateJarl8
- [General] Add more Warnings and Error Dialogs by @flavioislima
- [General] Webview improvements and fixes by @wiryfuture in #836
- [General] UI updates and fixes and other optimizations.
- [General] Translations updates by @weblate
- [General] Updated legendary to v0.20.25
- [Linux] Added Wine Downloader feature to make it easy to download new Wine-GE and Proton-GE versions (Beta) by @Nocccer and @flavioislima
- [Bugfix] Fixes login with Epic when using epic credentials #906
- [Bugfix] Fixes DLC list that was too long and was hiding the install button #891
- [Bugfix] Other small fixes.

## 2.0.2 Zoro - Hotfix 2

### What's Changed

- [Bugfix | Linux] Fix Wrong settings path (config folder that was changed from heroic to Heroic under $HOME/.config).

## 2.0.1 Zoro - Hotfix 1

### What's Changed

- [General] Add cancel button for exiting install modal by @Artumira96 in #835
- [General] Refactor and enable spatial navigation (Keyboard Navigation) by @arielj in #869
- [General] Add Login with SID as an alternative to Login with Epic by @flavioislima in #875
- [General] On Log out Heroic now will delete Epic Store credentials, list of recent games, total playing time.
- [General] Heroic now will ignore the 'The' article when sorting games.
- [Linux] Add default Wineprefix setting by @flavioislima in #866
- [Bugfix] Fix going to the library when clicking on anything on the Tools Tab
- [Bugfix] Fix game shortcuts not being created
- [Bugfix] Fixed typo with Discord RPC indicating macOS is "MacOS" when it should be "macOS" by @andylin2004 in #837
- [Bugfix] Fix RTL Languages by @flavioislima in #868
- [Bugfix] Fix Install dialog backdrop not covering the whole screen
- [Bugfix] Fix issue with some game pages breaking when the system requirements were empty (eg. Chicory: A Colorful Tale)
- [Bugfix | Linux] Fix wine prefixes not being created by @imLinguin in #845
- [i18n] Add Galego Language and several translations update from Hosted Weblate by @weblate in #823

## 2.0.0 Zoro

### What's Changed

- [General] New Layout with a Sidebar instead of a Navbar
- [General] New Game Page design
- [General] New Login system, no more need of using a SID. Login directly from the Epic Store inside Heroic.
- [General] The Store will auto-login if you use the new login system (won't do it if you already logged in on Heroic. Also, if you want to log out from Heroic, log out of the Store first, otherwise Heroic will log in again using your credentials on the store since both pages use the same cookies.
- [General] Changed how games are installed. Now both the Game page and the game card will open the same Installation Dialog with the path to choose where to install or a button to import a game.
- [General] Unreal marketplace is hidden by default now, there is a toggle in the settings to show it. (don't do that if you have a big selection of assets, right now Heroic freezes if you have 2000 assets or more, if this happens, edit the config file manually and set the option to false then restart Heroic.
- [General] Game Logs now will contain system information (hardware, SO, etc) and the game settings.
- [General] Added buttons to Clear Heroic Cache and Reset Heroic completely.
- [General] Adds Estonian, Finnish, Bulgarian and Farsi languages.
- [Windows] Support for Game Shortcuts
- [Linux] Added Wine prefix selection on game install
- [General] Improved accessibility to navigate the interface with only a keyboard
- [General] Legendary updated to v0.20.22
- [General] Several refactors, improvements, and optimizations lead Heroic to consume fewer resources like CPU and RAM. On Linux, Heroic consumes around 100MB or ram while on Windows it uses around 200MB.
- [General] Changed the way Heroic install DXVK/VKD3D completely now removing the DLLs when toggling the feature off.
- [General] The Navbar is now visible on the Login Page as well, this makes changing the settings and debugging errors easier.
- [General] Added Window menu + keyboard shortcuts to Quit, Reload and Open the Developer tools.
- [General] Added Support links on the Navbar.
- [General] Added discord and wiki links on the login screen.
- [General] Updated Legendary to version 0.20.18
- [General] Updated Electron to version 15.3
- [Windows] Implementend Desktop and Start Menu shortcuts.
- [MacOS] Support for Native games installation. With a new platform filter.
- [Bugfix] Fix Heroic coming to the front everytime a game was stopped.
- [Bugfix] Fix Desktop shortcuts not being created when the DE had language different from English.
- [Bugfix] Fix some games showing false update information.
- [Bugfix | Linux] DXVK wasn't being uninstalled when toggling the DXVK install setting off.
- [Bugfix | Linux] Winecfg, winetricks, and 'run exe' weren't using the correct wine binary when using Proton.
- [Bugfix | Windows] Icon on the Heroic windows won't be shown correctly
- [Bugfix | Windows] Move install now working

## 1.10.3

### What's Changed

- [General] Added controls to reload, go back and forward on the Store and Wiki webviews;
- [Linux / MacOS] Improved Wine, Proton and Crossover Searching;
- [MacOS] Some unused settings were removed
- [Bugfix] Other small UI fixes;
- [Bugfix | MacOS] Fixed an issue on BigSur that was causing Heroic screen to become blank;

## 1.10.2

### What's Changed

- [General] Heroic will show Launch options for games that supports it. Eg: Ark.
- [General] Heroic will try to launch to launch the game even if offline and will also show an information if the game can run offline or not on the Game Page.
- [General] It's possible to provide an alternative legendary binary for Heroic to use.
- [Bugfix] Fixed an issue with games that have Selective Download not downloading the whole game.
- [Bugfix] Fixed an issue where the integrated store wasn't opening the login popup.
- [Bugfix] Other small fixes and translations update.

## 1.10.1

### What's Changed

- [General] Heroic now can install components from games that have selective download. (Fortnite, CyberPunk, etc).
- [General] Now is possible to run the game using an alternative executable.
- [General] Heroic will list available DLCs and add a toggle to install/import all of them or no.
- [General] Heroic now will open the Epic Store and the Wiki on the main window instead of a separate one.
- [General] It's possible to check the download size and install size before installing the game.
- [General] Some visual fixes and improvements.
- [General] Updated Electron to version 15.1.
- [General] Updated Legendary to version 0.20.14.
- [Linux] Added Options to enable or disable Esync/Fsync.
- [Linux / MacOS] Heroic will now check for available Crossover bottle and select the right wine binary.
- [Bugfix] Fix Heroic not checking available space before installing a game.
- [Bugfix] Fix Heroic not launching a game when skipping an update available.
- [Bugfix] Fix Save folder on Windows missing a `backslash`
- [Bugfix] Fixed card image with wrong size.
- [Bugfix] Fix the Return button that was not clickable sometimes.
- [Bugfix] Other minor fixes and improvements.
- [i18n] Added Japanese Language.
- [i18n] Other translations updates and fixes.

## 1.9.3

### What's Changed

- [Bugfix] Fixed Update game from context menu not working.
- [Bugfix] Fixed Update icon misplaced on game card.
- [Bugfix] Fixed (probably) rare issue that could cause a Heroic to show only a blank screen when trying to load games from cache.
- [i18n] Added Korean, Croatian and Traditional Chinese languages.
- [i18n] Other translations updates and fixes.

## 1.9.2

### What's Changed

- [Bugfix] Fixes a bug where a game wasn't shown as installed after finishing the installation.
- [Bugfix] Changes default and minimal Heroic window size to acomodate lower resolutions.
- [Bugfix] Fixed a small bug where the return button on settings were leading to the Game page instead of the Library when coming from there.

## 1.9.1

### What's Changed

- [General] Added a Context Menu to the Gamecard on right click with common functions like Install, Launch, Update, Uninstall, etc.
- [General] Changed the Gamecard UI again to the old style with hidden buttons.
- [Bugfix] Fixed a bug that the cached library would not load correctly leading to a Blank Screen.
- [Bugfix] Other small UI fixes and inconsistencies.
- [Bugfix | MacOS] Fixed Big Icon tray.

## 1.9.0

### What's Changed

- [General] Improved Heroic performance by caching library information and making requests in background. Making Heroic opening almost instantly and navigation more responsive.
- [General] Added Play time tracker, nice to know how long you've been playing a game :P
- [General] Remade Login Screen according to new design.
- [General] When clicking install from the library, Heroic will show a window with the options to install or import the game.
- [General] Added better quality Tray Icons.
- [General] Added option to start Heroic minimized.
- [General] Changed main theme to shades of blue.
- [General] Changed sevel UI elements like the Gamecard that now always shows the title, install, settings and play buttons.
- [General] Changed the filter to be a list since it was growing in size.
- [General] Changed the position of the search bar to the header instead of the navbar.
- [General] Its not necessary to restart Heroic anymore after changing the Tray Icon color.
- [General] Several functions were refactored to improve Heroics performance and stability.
- [General] Running Heroic from terminal should have even more logs now, great to debug.
- [General] Removed the ability to downloads several games at the same time since this was causing some of them to appear as not installed (will evolve to a Queue at some point).
- [General] Moved some settings from General to Other.
- [Linux] Added FSR Hack toggle and Sharpness strength to Wine settings (needs support in wine).
- [Linux] Added resizable bar toggle to Wine settings (needs support in wine and NVIDIA RTX to work).
- [Linux / MacOS]: Added Wine and Prefix information on the game page.
- [Bugfix] Fixed a small bug where the search bar was not keeping the correct state.
- [Bugfix] Fixed some game info caching that wasn't working.
- [Bugfix] Fixed a bug where the game information cache wasn't being updated after changing Heroic's language.
- [Bugfix | Windows] Fixed major bug that caused Heroic to not open on some configurations.
- [Bugfix | Windows] Fixed clicking on the settings icon when using list view going to the Wine settings.
- [Bugfix | Windows] Fixed default install path using wrong slashes.
- [i18n] Added Portuguese (Brazil), Català and Tamil

## 1.8.0

### What's Changed

- [Bugfix] Fix Shortcuts always being created on Linux despite the setting being on or off
- [Bugfix] Fix 'The Spectrun Retreat' game wasn't opening the game page.
- [Bugfix] Fix some shortcuts being created without proper icon.
- [Bugfix] Fix Sync Save folder with wrong slashes on Linux.
- [Bugfix] Fix Offline option not working.

## 1.8.0-rc2

### What's Changed

- [General] Added recent games on the tray icon and a filter on the library.
- [General] Added Discord RPC support (except Linux AppImages) thanks @TabulateJarl8
- [General] Submenu now is always visible on Game Page.
- [General] It's possible to update a game from the game page now by clicking on the update information instead of opening the settings like before.
- [General] Downloading Fortnite and Cyberpunk2077 still not possible but they now can be imported.
- [Linux] Added shortcuts on Desktop and Applications menu. By default, it will always create after installing a new game and removing it when uninstalling.
- [Linux] Added button to create shortcuts from the Game Page.
- [Linux] Improved Winetricks and Winecfg handlers and they should work now with proton 6.3+
- [Linux] Added `STEAM_COMPAT_CLIENT_INSTALL_PATH` variable when launching a game with proton since its needed from Proton versions 6.3+.
- [Linux] Improved Logging when running from the terminal. Thanks @dragonDScript and @Nocccer
- [Windows] It's now possible to choose the install folder.
- [Windows] Simplified Sync with Epic Games Store setting.
- [MacOS] Started officially distributing the binary as a DMG file.
- [MacOS] Hidden unnecessary settings.
- [MacOS] Heroic downloads ONLY WINDOWS GAMES, so it's recommended to have Crossover installer otherwise the games won't work.
- [Bugfix] Fixed a bug when a game needed repair before updating and the information got messed up.
- [Bugfix] Other minor Bugfixes and performance improvements.
- [Bugfix | Linux] Fixed save-sync folder when using Proton
- [Bugfix | Windows] Fixed the stop install button.
- [Bugfix | Windows] Fixed Verify and Repair function
- [i18n] Added Simplified Chinese language

## 1.8.0-rc1

### What's Changed

- [General] Initial Windows support with a few limitations compared with the Linux version
- [General] Better interface for Unreal Marketplace
- [General] Added error message if Python version is lower than 3.8 on Linux since Legendary won't work with it.
- [General] Added a warning message when the credentials have expired.
- [General] Better interface for Unreal Marketplace
- [General] Added error message if Python version is lower than 3.8 on Linux since Legendary won't work with it.
- [General] Added a warning message when the credentials have expired.
- [General] Updated Electron to version 13.1.0
- [General] Refactored several Backend and Frontend functions
- [General] A great part of the frontend now contains unit and integration tests, improving the code quality overall.
- [Bugfix] Fixed an error where the files weren't removing when canceling the install from gamecard.
- [Bugfix] Fixed installing on the wrong directory when not choosing a proper folder for install.
- [Bugfix] Fixed some cover resolution for some games Thanks @StefanLobbenmeier
- [i18n] Added Greek Language

## 1.7.0

### What's Changed

- [General] Heroic now will continue the download status from where it stopped instead of getting back from 0% everytime.
- [General] Added option to enable Nvidia Prime Render Offload on settings
- [General] Added a Wiki button to NavBar
- [General] Updated Electron to version 12, making it use less resources. In some cases almost 15% less RAM (from around 140MB to 115MB sometimes)
- [General] Removed some other dependencies that might give some better performance overall as well.
- [Bugfix] Fixed an old bug where big installations could be interrupted #195
- [Bugfix] Fixed another old bug where Heroic wasn't finding Steam Proton on Ubuntu and derivatives #359
- [Bugfix] Fixed missing Unreal Marketplace Assets introduced on 1.6.1 #367
