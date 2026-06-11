// Base URL for Steam's public CDN game art. Appending `/<appId>/<file>` yields
// the various artwork images (header, capsule, hero, logo) for a given game.
// Aurelia's `info`/`list` don't return artwork, so Heroic builds these CDN URLs
// itself for the library cards and game pages.
export const steamCdnImageBase =
  'https://cdn.cloudflare.steamstatic.com/steam/apps'

// Store page for a given Steam app id.
export const steamStoreAppUrl = 'https://store.steampowered.com/app'
