const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Mock game data with real Unsplash images
const mockGames = [
  {
    id: 'game-1',
    title: 'Epic Adventure Game',
    art_cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=800&fit=crop&q=80',
    art_square: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=600&fit=crop&q=80',
    art_logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=200&fit=crop&q=80',
    art_background: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&h=1080&fit=crop&q=80',
    developer: 'Mock Game Studios',
    description: 'An epic adventure game with amazing graphics and gameplay. Explore vast worlds, fight enemies, and save the day!',
    platform: 'Windows',
    version: '1.0.0',
    installable: true,
    is_installed: false,
    canRunOffline: true,
    store_url: 'https://example.com/game/epic-adventure',
    releaseDate: '2024-01-15',
    genres: ['Action', 'Adventure', 'RPG']
  },
  {
    id: 'game-2',
    title: 'Space Explorer',
    art_cover: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=800&fit=crop&q=80',
    art_square: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=600&fit=crop&q=80',
    art_logo: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=400&h=200&fit=crop&q=80',
    art_background: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1920&h=1080&fit=crop&q=80',
    developer: 'Cosmic Games Inc',
    description: 'Explore the vast universe in this space exploration game. Build your fleet, discover new planets, and trade resources.',
    platform: 'Linux',
    version: '2.1.3',
    installable: true,
    is_installed: false,
    canRunOffline: false,
    store_url: 'https://example.com/game/space-explorer',
    releaseDate: '2023-11-20',
    genres: ['Simulation', 'Strategy', 'Space']
  },
  {
    id: 'game-3',
    title: 'Racing Legends',
    art_cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=800&fit=crop&q=80',
    art_square: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&q=80',
    art_logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop&q=80',
    art_background: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop&q=80',
    developer: 'Speed Games',
    description: 'The ultimate racing experience! Compete in tournaments, customize your cars, and become a racing legend.',
    platform: 'Mac',
    version: '1.5.0',
    installable: true,
    is_installed: false,
    canRunOffline: true,
    store_url: 'https://example.com/game/racing-legends',
    releaseDate: '2024-02-10',
    genres: ['Racing', 'Sports', 'Multiplayer']
  },
  {
    id: 'game-4',
    title: 'Puzzle Master',
    art_cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=800&fit=crop&q=80',
    art_square: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=600&fit=crop&q=80',
    art_logo: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=200&fit=crop&q=80',
    art_background: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1920&h=1080&fit=crop&q=80',
    developer: 'Brain Teasers Ltd',
    description: 'Challenge your mind with hundreds of puzzles. From simple to mind-bending, become the ultimate Puzzle Master!',
    platform: 'Browser',
    version: '3.2.1',
    installable: true,
    is_installed: false,
    canRunOffline: false,
    store_url: 'https://example.com/game/puzzle-master',
    releaseDate: '2023-09-05',
    genres: ['Puzzle', 'Casual', 'Indie']
  }
];

// GET /manifest.json - Plugin manifest
app.get('/manifest.json', (req, res) => {
  res.json({
    id: 'mock-rest-store',
    name: 'Mock REST Store',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      library: '/library',
      game: '/game/:id',
      downloads: '/game/:id/downloads',
      login: '/login',
      logout: '/logout',
      user: '/user'
    },
    auth: {
      type: 'none'
    }
  });
});

// GET /library - Get all games
app.get('/library', (req, res) => {
  res.json({
    games: mockGames
  });
});

// GET /game/:id - Get game details
app.get('/game/:id', (req, res) => {
  const game = mockGames.find(g => g.id === req.params.id);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Return game with additional install info
  res.json({
    ...game,
    install: {
      platform: game.platform,
      install_path: undefined,
      executable: undefined,
      size: 1024 * 1024 * 1024 * 5 // 5 GB placeholder
    },
    extra: {
      about: {
        description: game.description,
        shortDescription: game.description.substring(0, 150) + '...'
      },
      reqs: [
        {
          name: 'OS',
          minimum: game.platform === 'Windows' ? 'Windows 10' : game.platform === 'Mac' ? 'macOS 12' : 'Linux 5.0',
          recommended: game.platform === 'Windows' ? 'Windows 11' : game.platform === 'Mac' ? 'macOS 14' : 'Linux 6.0'
        },
        {
          name: 'CPU',
          minimum: 'Intel Core i5 or AMD equivalent',
          recommended: 'Intel Core i7 or AMD Ryzen 7'
        },
        {
          name: 'RAM',
          minimum: '8 GB',
          recommended: '16 GB'
        },
        {
          name: 'GPU',
          minimum: 'DirectX 11 compatible',
          recommended: 'DirectX 12 compatible with 4GB VRAM'
        },
        {
          name: 'Storage',
          minimum: '10 GB',
          recommended: '20 GB SSD'
        }
      ],
      changelog: `Version ${game.version} - Latest update includes bug fixes and performance improvements.`
    },
    dlcList: [
      {
        id: `${game.id}-dlc1`,
        title: `${game.title} - Expansion Pack`
      }
    ]
  });
});

// GET /game/:id/downloads - Get download information
app.get('/game/:id/downloads', (req, res) => {
  const game = mockGames.find(g => g.id === req.params.id);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const platform = req.query.platform || game.platform;
  const installPath = req.query.path || '/tmp/games';

  res.json({
    url: `http://localhost:${PORT}/download/${game.id}`,
    method: 'GET',
    headers: {},
    size: 1024 * 1024 * 1024 * 5, // 5 GB
    checksum: {
      type: 'sha256',
      value: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'
    },
    steps: [
      {
        type: 'download',
        url: `http://localhost:${PORT}/download/${game.id}/game.zip`
      },
      {
        type: 'extract',
        source: `${installPath}/${game.id}/game.zip`,
        destination: `${installPath}/${game.id}`
      },
      {
        type: 'execute',
        command: 'chmod',
        args: ['+x', `${installPath}/${game.id}/game.sh`]
      },
      {
        type: 'copy',
        source: `${installPath}/${game.id}/game.sh`,
        destination: `${installPath}/${game.id}/launch.sh`
      }
    ]
  });
});

// POST /login - Login endpoint (optional, not required for this mock)
app.post('/login', (req, res) => {
  res.json({
    status: 'success',
    token: 'mock-auth-token-12345',
    user: {
      username: 'mockuser',
      email: 'mock@example.com'
    }
  });
});

// POST /logout - Logout endpoint (optional)
app.post('/logout', (req, res) => {
  res.json({ status: 'success' });
});

// GET /user - Get user info (optional)
app.get('/user', (req, res) => {
  res.json({
    username: 'mockuser',
    email: 'mock@example.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&q=80'
  });
});

// Mock download endpoint (for testing)
app.get('/download/:id', (req, res) => {
  res.json({
    message: 'This is a mock download endpoint. In a real implementation, this would stream the game files.',
    gameId: req.params.id
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock REST Store server running on http://localhost:${PORT}`);
  console.log(`📋 Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`📚 Library: http://localhost:${PORT}/library`);
  console.log(`🎮 Game details: http://localhost:${PORT}/game/game-1`);
  console.log(`\n💡 Add this URL in Heroic Settings: http://localhost:${PORT}`);
});

