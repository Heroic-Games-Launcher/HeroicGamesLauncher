# Mock REST Store

A simple Express.js mock server that implements the REST store API format for Heroic Games Launcher testing.

## Features

- ✅ Plugin manifest endpoint (`/manifest.json`)
- ✅ Library endpoint (`/library`) - Returns list of games
- ✅ Game details endpoint (`/game/:id`)
- ✅ Download info endpoint (`/game/:id/downloads`)
- ✅ Optional auth endpoints (`/login`, `/logout`, `/user`)
- ✅ CORS enabled for local development

## Installation

```bash
cd mock-rest-store
npm install
```

## Usage

### Start the server

```bash
npm start
```

Or with auto-reload (requires nodemon):

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

### Add to Heroic

1. Open Heroic Games Launcher
2. Go to **Settings** → **General Settings**
3. Scroll to **REST API Plugins**
4. Enter: `http://localhost:3000`
5. Click **Add Plugin**
6. Click **Refresh Library**

## Mock Games

The server includes 4 placeholder games:

1. **Epic Adventure Game** (Windows)
2. **Space Explorer** (Linux)
3. **Racing Legends** (Mac)
4. **Puzzle Master** (Browser)

## API Endpoints

### `GET /manifest.json`
Returns the plugin manifest with metadata and endpoint definitions.

### `GET /library`
Returns a list of all available games.

### `GET /game/:id`
Returns detailed information about a specific game, including:
- Game metadata
- System requirements
- Changelog
- DLC list

### `GET /game/:id/downloads?platform=Windows&path=/tmp/games`
Returns download information including:
- Download URL
- File size
- Checksum
- Installation steps

### `POST /login` (optional)
Mock authentication endpoint.

### `POST /logout` (optional)
Mock logout endpoint.

### `GET /user` (optional)
Returns mock user information.

### `GET /health`
Health check endpoint.

## Customization

Edit `server.js` to:
- Add more mock games in the `mockGames` array
- Change the port (set `PORT` environment variable)
- Modify game data structure
- Add authentication logic
- Implement actual file downloads

## Development

This is a minimal mock server for testing purposes. In a production REST store plugin, you would:

- Implement actual file downloads
- Add proper authentication
- Connect to a real database
- Handle errors more gracefully
- Add rate limiting
- Implement caching
- Add logging

