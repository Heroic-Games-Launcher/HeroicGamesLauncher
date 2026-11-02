# Linux shortcut icons

In **Settings → General**, enable **Use icons from game EXEs for desktop and application menu shortcuts** to prefer a Windows game's embedded application icon. This setting is off by default and applies when creating Linux desktop and application-menu shortcuts.

Enable automatic shortcut creation to apply it to newly installed or added games. Remove and recreate existing shortcuts from the game menu to update their icons.

Heroic tries the alternative executable configured for the game, GOG's primary executable when available, and the installed executable. It reads their icon resources without running or modifying the executable. PNG icons and uncompressed 1-, 4-, 8-, 24-, and 32-bit icon bitmaps are supported. Unsupported formats use the fallback below.

If extraction fails, Heroic uses available game artwork. Artwork requests have a ten-second timeout and an eight-MiB size limit. Missing artwork, failed requests, corrupt images, or an unwritable icon cache fall back to a persistent copy of Heroic's bundled icon. This avoids sandbox-only Flatpak paths and temporary AppImage mounts. If that resource cannot be read or copied, the shortcut uses the standard `application-x-executable` themed icon. Shortcut write errors are logged.

Extracted icons are cached as PNGs in Heroic's icons directory. Executable path, size, and modification/change times identify the cache entry. Corrupt cache entries are regenerated. Writes are atomic, failed temporary files are cleaned up, and concurrent requests for the same executable share extraction work. PE resource reads and decoded icon dimensions are bounded.
