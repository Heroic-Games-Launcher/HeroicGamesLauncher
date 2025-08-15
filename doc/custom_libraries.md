# Custom Game Libraries for Heroic Games Launcher

## Overview

This feature adds support for custom JSON-based game libraries to Heroic Games Launcher. You can now add games from any source by providing JSON configuration files that describe your games, their installation tasks, and launch information.

## How It Works

Custom libraries are JSON files that contain metadata about your games. Heroic loads these configurations through URLs or direct JSON input in the settings, and adds the games to your library alongside Epic, GOG, Amazon, and sideloaded games.

## Setup

Custom libraries are configured through Heroic's settings interface:

1. **Open Settings**: Go to Settings → General → Custom Libraries
2. **Add Library URLs**: Add HTTP/HTTPS URLs pointing to JSON files OR **Add Direct JSON**: Paste JSON configurations directly into the settings
3. **Save Settings**: Libraries will automatically load after saving (make sure to click the + sign).

## JSON Schema

### Library Structure

```json
{
  "name": "Library Name",
  "description": "Optional description of this library",
  "games": [
    // Array of game objects
  ]
}
```

### Game Object Properties

| Property              | Type                | Required | Description                                                          |
| --------------------- | ------------------- | -------- | -------------------------------------------------------------------- |
| `app_name`            | string              | ✅       | Unique identifier for the game (will be prefixed with `custom_`)     |
| `title`               | string              | ✅       | Display name of the game                                             |
| `executable`          | string              | ✅       | Path to the executable or URL for browser games                      |
| `art_cover`           | string              | ❌       | URL or file path to cover art image                                  |
| `art_square`          | string              | ❌       | URL or file path to square icon (fallback to cover art)              |
| `description`         | string              | ❌       | Game description                                                     |
| `version`             | string              | ❌       | Game version                                                         |
| `developer`           | string              | ❌       | Developer name                                                       |
| `release_date`        | string              | ❌       | Release date (ISO format recommended)                                |
| `platform`            | string              | ❌       | Platform: `"Windows"`, `"Mac"`, `"Linux"`, or `"Browser"`            |
| `install_tasks`       | CustomLibraryTask[] | ✅       | Array of tasks to execute during installation                        |
| `uninstall_tasks`     | CustomLibraryTask[] | ✅       | Array of tasks to execute during uninstallation                      |
| `gamesdb_credentials` | object              | ❌       | Overwrite fetched metadata with custom info from GamesDB (see below) |
| `genres`              | string[]            | ❌       | Array of game genres                                                 |
| `launch_options`      | LaunchOption[]      | ❌       | Array of launch options for the game                                 |
| `launch_from_cmd`     | boolean             | ❌       | Whether to launch the game from command line                         |

### Custom Library Tasks

Custom libraries use tasks to handle installation and uninstallation processes. Each task has a specific type and purpose.

#### Task Types

##### Download Task

Downloads files from a URL during installation.

| Property      | Type   | Required | Description                                     |
| ------------- | ------ | -------- | ----------------------------------------------- |
| `type`        | string | ✅       | Must be `"download"`                            |
| `url`         | string | ✅       | URL to download from                            |
| `filename`    | string | ❌       | Custom filename (auto-detected if not provided) |
| `destination` | string | ❌       | Destination path within game folder             |

**Example:**

```json
{
  "type": "download",
  "url": "https://some.com/installer.zip",
  "filename": "installer.zip",
  "destination": "downloads"
}
```

##### Extract Task

Extracts compressed files (ZIP, TAR, etc.).

| Property      | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `type`        | string | ✅       | Must be `"extract"`                           |
| `source`      | string | ✅       | Path to archive file within game folder       |
| `destination` | string | ❌       | Extraction destination (game folder if empty) |

**Example:**

```json
{
  "type": "extract",
  "source": "downloads/installer.zip",
  "destination": "game_files"
}
```

##### Run Task

Executes commands or installers.

| Property     | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| `type`       | string   | ✅       | Must be `"run"`                 |
| `executable` | string   | ✅       | Path to executable or command   |
| `args`       | string[] | ❌       | Array of command line arguments |

**Example:**

```json
{
  "type": "run",
  "executable": "game_files/setup.exe",
  "args": ["/SILENT", "/NORESTART"]
}
```

##### Move Task

Moves or copies files and folders.

| Property      | Type   | Required | Description                         |
| ------------- | ------ | -------- | ----------------------------------- |
| `type`        | string | ✅       | Must be `"move"`                    |
| `source`      | string | ✅       | Source path within game folder      |
| `destination` | string | ✅       | Destination path within game folder |

**Example:**

```json
{
  "type": "move",
  "source": "temp/extracted_files",
  "destination": "final_location"
}
```

### Launch Options

Launch options provide different ways to start the game. Each option can be one of three types:

#### Basic Launch Option

Adds extra parameters to the default launch command.

| Property     | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| `type`       | string | ❌       | `"basic"` (default if omitted) |
| `name`       | string | ✅       | Display name for the option    |
| `parameters` | string | ✅       | Command line parameters        |

#### Alternative Executable Launch Option

Launches a different executable instead of the default one.

| Property     | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| `type`       | string | ✅       | Must be `"altExe"`             |
| `executable` | string | ✅       | Path to alternative executable |

### GamesDB Integration

The `gamesdb_credentials` property allows you to specify a particular store and game ID to fetch metadata from GamesDB. When provided, this will override any automatically discovered metadata, ensuring you get the exact game information from the specified store listing.

#### GamesDB Credentials Object

| Property | Type   | Required | Description                    |
| -------- | ------ | -------- | ------------------------------ |
| `store`  | string | ✅       | The store platform identifier  |
| `id`     | string | ✅       | The game's ID on that platform |

#### Supported Stores

- **`"steam"`** - Steam Store (use Steam App ID)
- **`"gog"`** - GOG.com (use GOG Game ID)
- **`"epic"`** - Epic Games Store (use Epic namespace/catalog ID)
- **`"itch"`** - itch.io (use itch.io game ID)
- **`"humble"`** - Humble Bundle (use Humble game ID)
- **`"uplay"`** - Ubisoft Connect/Uplay (use Uplay ID)

#### What GamesDB Provides

When `gamesdb_credentials` is specified, Heroic will fetch and use:

✅ **Cover Art** - High-quality game logo/header images  
✅ **Square Icons** - Vertical cover art for grid view  
✅ **Descriptions** - Game summaries and descriptions  
✅ **Genres** - Game category information

**Note**: Manually specified properties (`art_cover`, `description`, etc.) take precedence over GamesDB data.

### Platform Support

- **Windows**: `.exe` files and Windows applications
- **Mac**: `.app` bundles and macOS applications
- **Linux**: Executable files and shell scripts

## Example

### Real example

The following (real) example demonstrates adding the freeware version of Cave Story:

```json
{
  "name": "Your first custom library",
  "games": [
    {
      "app_name": "cave_story",
      "title": "Cave Story",
      "executable": "CaveStory/Doukutsu.exe",
      "platform": "Windows",
      "version": "1.0.0",
      "install_tasks": [
        {
          "type": "download",
          "url": "https://www.cavestory.org/downloads/cavestoryen.zip"
        },
        { "type": "extract", "source": "cavestoryen.zip" }
      ],
      "launch_options": [
        {
          "type": "altExe",
          "name": "Org View",
          "executable": "CaveStory/OrgView.exe"
        },
        {
          "type": "altExe",
          "name": "Configuration Tool",
          "executable": "CaveStory/DoConfig.exe"
        }
      ]
    }
  ]
}
```

### Fake example with more options

The following (fake) example demonstrates:

**Install Tasks:**

1. **Download**: Downloads the game installer ZIP from a URL to a `downloads` subfolder
2. **Extract**: Extracts the downloaded ZIP file to a `temp` subfolder
3. **Run**: Executes the installer with silent installation arguments
4. **Move**: Moves additional game assets to their final location

**Uninstall Tasks:**

1. **Run**: Executes the game's uninstaller silently
2. **Run**: Runs a cleanup script to remove any remaining files

The tasks are executed in order during installation/uninstallation. All file paths are relative to the game's folder that Heroic creates.

```json
{
  "name": "Installed Windows Games",
  "games": [
    {
      "app_name": "my_game",
      "title": "My Game",
      "executable": "/My Game/game.exe",
      "platform": "Windows",
      "install_tasks": [
        {
          "type": "download",
          "url": "https://example.com/releases/my-game-v1.2.3-installer.zip",
          "filename": "my-game-installer.zip",
          "destination": "downloads"
        },
        {
          "type": "extract",
          "source": "downloads/my-game-installer.zip",
          "destination": "temp"
        },
        {
          "type": "run",
          "executable": "temp/setup.exe",
          "args": ["/SILENT", "/NORESTART", "/DIR=C:\\Games\\MyGame"]
        },
        {
          "type": "move",
          "source": "temp/game_assets",
          "destination": "assets"
        }
      ],
      "uninstall_tasks": [
        { "type": "run", "executable": "uninstall.exe", "args": ["/SILENT"] },
        { "type": "run", "executable": "cleanup.bat" }
      ]
    }
  ]
}
```

## Troubleshooting

When games are not appearing:

- Check JSON syntax is valid
- Verify file is in correct custom libraries directory
- Ensure `executable` path exists
- Restart Heroic after adding new files

## Running installers without user interaction and in the background.

It can be quite tricky to get an installer to run without user interaction. But usually it's possible. You'll often need to determine the correct installation parameters. (Parameters like `silent` and `destination`).

### Installer Docs

Some installers have documentation that makes it a little easier.

- **NSIS Installers**: https://nsis.sourceforge.io/Docs/Chapter3.html#installerusagecommon

### Installer Manuals

Most Windows installers support an arg to show all installer options. (IMPORTANT: NOT ALL have. Sometimes you have to guess the args.)

Manual flag examples:

```bash
wine installer.exe /?
wine installer.exe --help
wine installer.exe /help
wine installer.exe -h
wine installer.exe /h
wine installer.exe /H
wine installer.exe /HELP
wine installer.exe /CMDHELP
```

### Install destination

It's usually possible to set the destination.

- **NSIS Installers**: `/D=/your/destination`
- **Inno Setup**: `/DIR=/your/destination`
- **7z self extracting archive**: `-o/your/destination`

Destination flag examples:

```bash
wine installer.exe /DIR=/your/destination
wine installer.exe /D=/your/destination
wine installer.exe -o/your/destination
```

### Run silently

Most Windows installers support silent or unattended installation modes. Common silent flags include:

- **NSIS Installers**: `/S` (capital S)
- **InstallShield**: `/s` or `/silent`
- **MSI Packages**: `/quiet` or `/qn`
- **Inno Setup**: `/SILENT` or `/VERYSILENT`
- **Nullsoft**: `/S`

Silent flag examples:

```bash
wine installer.exe /S
wine installer.exe /silent
wine installer.exe /SILENT
wine installer.exe /VERYSILENT
```

## Finding Game IDs for GamesDB

### Steam IDs

1. Visit the game's Steam store page
2. Look at the URL: `https://store.steampowered.com/app/[ID]/`
3. Use the number as the `id` value

**Example**: Portal → `https://store.steampowered.com/app/220/` → ID: `"220"`

### GOG IDs

1. Visit the game's GOG store page
2. Look at the URL: `https://www.gog.com/game/[game-name]`
3. Use browser developer tools to inspect the page source
4. Search for `"product":{"id":` to find the numeric ID

### Epic Games IDs

1. Use Epic's GraphQL API or community databases
2. Look for the catalog item ID or namespace/catalog combination

### Finding Other Store IDs

- **itch.io**: Game ID from the URL or API
- **Humble**: Game identifier from Humble Bundle
- **Uplay**: Ubisoft's internal game ID
