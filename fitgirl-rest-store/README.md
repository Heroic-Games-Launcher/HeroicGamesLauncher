# FitGirl Repacks REST Store

A REST API store plugin for Heroic Games Launcher that scrapes games from FitGirl Repacks website.

## Features

- ✅ Scrapes popular repacks from FitGirl Repacks website
- ✅ Caches results for 1 hour to reduce load
- ✅ Plugin manifest endpoint (`/manifest.json`)
- ✅ Library endpoint (`/library`) - Returns scraped games
- ✅ Game details endpoint (`/game/:id`)
- ✅ Download info endpoint (`/game/:id/downloads`)
- ✅ Automatic scraping on startup

## Installation

```bash
cd fitgirl-rest-store
npm install
```

## Configuration

### Torbox API Token (Optional but Recommended)

To enable magnet link downloads via Torbox API:

1. Get your API token from [Torbox API](https://api.torbox.app) or your Torbox account settings
2. Create a `.env` file in the project root:
```bash
TORBOX_API_TOKEN=your_torbox_api_token_here
```

3. Copy `.env.example` to `.env` and fill in your token:
```bash
cp .env.example .env
# Edit .env and add your token
```

Without the token, the plugin will still work but won't provide magnet links for downloads.

## Usage

### Start the server

```bash
npm start
```

Or with auto-reload (requires nodemon):

```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Add to Heroic

1. Open Heroic Games Launcher
2. Go to **Settings** → **General Settings**
3. Scroll to **REST API Plugins**
4. Enter: `http://localhost:3001`
5. Click **Add Plugin**
6. Click **Refresh Library**

## How It Works

The server scrapes the FitGirl Repacks "Popular Repacks" page to extract:
- Game titles
- Game URLs
- Images (when available)
- Descriptions
- Release dates

**Torbox Integration:**
- When a game is requested for download, the server searches Torbox API for matching torrents
- Prefers FitGirl repacks when available
- Returns magnet links for direct torrent downloads
- Magnet links are cached to avoid repeated API calls

Games are cached for 1 hour to avoid excessive scraping. You can clear the cache by calling `POST /clear-cache`.

## API Endpoints

### `GET /manifest.json`
Returns the plugin manifest with metadata and endpoint definitions.

### `GET /library`
Returns a list of all scraped games from FitGirl Repacks.

### `GET /game/:id`
Returns detailed information about a specific game, including:
- Full description (scraped from game page if available)
- System requirements
- Download information

### `GET /game/:id/downloads?platform=Windows&path=/tmp/games`
Returns download information including:
- Download URL (links to FitGirl page)
- File size (placeholder)
- Installation steps

### `GET /health`
Health check endpoint showing cache status.

### `POST /clear-cache`
Clears the games cache (useful for testing).

## Notes

- The scraper uses Cheerio to parse HTML
- Games are cached for 1 hour to reduce server load
- If scraping fails, the server will return cached games if available
- Images fall back to Unsplash placeholders if not found
- All FitGirl repacks are marked as Windows platform

## Development

This is a web scraping implementation. The selectors may need adjustment if FitGirl changes their website structure. Check the console logs for scraping errors.

## Disclaimer

This plugin scrapes publicly available information from FitGirl Repacks. Make sure you comply with FitGirl's terms of service and robots.txt when using this plugin.

