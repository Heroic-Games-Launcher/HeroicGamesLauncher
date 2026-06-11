/**
 * Credentials collected by Heroic's Steam login form and handed to
 * `aurelia login`. `guard` is an optional Steam Guard code.
 */
export interface SteamLoginData {
  username: string
  password: string
  guard?: string
}

/**
 * A Steam account the user is signed into via Aurelia. Kept as an array
 * elsewhere to match Heroic's multi-account shape, though Aurelia is
 * single-session.
 */
export interface SteamAccount {
  steamId: string
  username: string
}

/**
 * A DLC for a Steam game, with whether the user owns it and whether its files
 * are currently installed. License-only DLC (no downloadable depot) is reported
 * as installed once owned, since there is nothing separate to download.
 *
 * `disabled` mirrors Steam's `DisabledDLC` flag in the base game's appmanifest:
 * an owned DLC the user has turned off. It can be toggled with `aurelia
 * enable`/`disable` (see {@link SteamPendingDlcChange}).
 */
export interface SteamDLCInfo {
  appId: string
  title: string
  owned: boolean
  installed: boolean
  disabled: boolean
}

/**
 * A DLC enable/disable the user requested in Heroic but which hasn't been made
 * permanent yet. Steam overwrites `DisabledDLC` from memory when it exits, so
 * the change is re-applied with `aurelia ... --restart-steam` on the next Steam
 * game launch to make it stick.
 */
export interface SteamPendingDlcChange {
  appId: string
  enable: boolean
}
