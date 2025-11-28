const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Cache for scraped games
let gamesCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Cache for magnet links (gameId -> magnet link)
let magnetCache = new Map();
// Cache for Torbox torrent info (gameId -> { hash, torrent_id, auth_id })
let torboxCache = new Map();

// Base URLs
const FITGIRL_BASE_URL = 'https://fitgirl-repacks.site';
const TORBOX_API_URL = 'https://api.torbox.app';

// Torbox API token (set via TORBOX_API_TOKEN environment variable)
const TORBOX_API_TOKEN = process.env.TORBOX_API_TOKEN || '';

// Extract magnet link from FitGirl game page
async function extractMagnetLinkFromFitGirl(gameUrl) {
  try {
    const response = await axios.get(gameUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Find magnet links - check actual HTML structure
    const magnetLinks = [];
    $('a[href*="magnet:"]').each((i, el) => {
      let href = $(el).attr('href');
      if (href) {
        // Decode HTML entities (like &#038; -> &)
        href = href.replace(/&#038;/g, '&').replace(/&#[0-9]+;/g, (match) => {
          const code = parseInt(match.replace(/[&#;]/g, ''));
          return String.fromCharCode(code);
        });
        
        if (href.startsWith('magnet:')) {
          magnetLinks.push(href);
        }
      }
    });

    // Log what we found
    console.log(`Found ${magnetLinks.length} magnet links on FitGirl page: ${gameUrl}`);
    if (magnetLinks.length > 0) {
      console.log(`First magnet link (first 100 chars): ${magnetLinks[0].substring(0, 100)}...`);
    }

    return magnetLinks.length > 0 ? magnetLinks[0] : null;
  } catch (error) {
    console.error(`Error extracting magnet link from ${gameUrl}:`, error.message);
    return null;
  }
}

// Create torrent in Torbox using magnet link
async function createTorboxTorrent(magnetLink, gameTitle) {
  if (!TORBOX_API_TOKEN) {
    console.warn('TORBOX_API_TOKEN not set, cannot create Torbox torrent');
    return null;
  }

  try {
    // Use the actual Torbox API endpoint to create torrent from magnet
    // API expects multipart/form-data, not JSON
    const formData = new FormData();
    formData.append('magnet', magnetLink);
    formData.append('name', gameTitle);
    
    const response = await axios.post(`${TORBOX_API_URL}/v1/api/torrents/createtorrent`, formData, {
      headers: {
        'Authorization': `Bearer ${TORBOX_API_TOKEN}`,
        ...formData.getHeaders()
      },
      timeout: 10000
    });

    // Log the actual response structure
    console.log(`Torbox create torrent response:`, JSON.stringify(response.data, null, 2));

    // Return the Torbox response data (hash, torrent_id, auth_id) for later use
    if (response.data && response.data.success && response.data.data) {
      return response.data.data; // { hash, torrent_id, auth_id }
    }
    
    return null;
  } catch (error) {
    console.error(`Error creating Torbox torrent:`, error.message);
    if (error.response) {
      console.error(`Torbox API response status: ${error.response.status}`);
      console.error(`Torbox API response data:`, JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Get download URL from Torbox using torrent_id
async function getTorboxDownloadUrl(torrentId) {
  if (!TORBOX_API_TOKEN || !torrentId) {
    return null;
  }

  try {
    // Request download URL from Torbox - it's a GET request with query params
    // According to Postman collection: use zip_link=true to get the entire torrent as a zip
    // zip_link takes precedence over file_id if both are given
    const response = await axios.get(`${TORBOX_API_URL}/v1/api/torrents/requestdl`, {
      params: {
        token: TORBOX_API_TOKEN, // API key as query parameter (required)
        torrent_id: torrentId, // Required
        zip_link: true // Get entire torrent as zip (takes precedence over file_id)
      },
      timeout: 30000
    });

    console.log(`Torbox requestdl response:`, JSON.stringify(response.data, null, 2));
    
    // Response format: { success: true, data: "https://..." } - data is directly the URL string
    if (response.data && response.data.success && response.data.data) {
      // data is directly the download URL string
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting Torbox download URL:`, error.message);
    if (error.response) {
      console.error(`Torbox API response status: ${error.response.status}`);
      console.error(`Torbox API response data:`, JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Helper function to convert URL slug to readable title
function slugToTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV')
    .replace(/\bV\b/g, 'V')
    .replace(/\bVi\b/g, 'VI');
}

// Helper function to fetch game details from individual page
async function fetchGameDetails(gameUrl, gameId) {
  try {
    const response = await axios.get(gameUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Extract title from page
    let title = $('h1.entry-title, h1.post-title, h1, .entry-title, .post-title').first().text().trim();
    if (!title || title.length < 3) {
      title = slugToTitle(gameId);
    }

    // Extract main image
    let coverImage = $('img.wp-post-image, img.attachment-post-thumbnail, .post-thumbnail img, article img').first().attr('src') ||
                     $('img.wp-post-image, img.attachment-post-thumbnail, .post-thumbnail img, article img').first().attr('data-src') ||
                     $('img.wp-post-image, img.attachment-post-thumbnail, .post-thumbnail img, article img').first().attr('data-lazy-src');
    
    if (coverImage && !coverImage.startsWith('http')) {
      coverImage = new URL(coverImage, FITGIRL_BASE_URL).href;
    }

    // Extract description
    const description = $('.entry-content p, .post-content p, article p').first().text().trim().substring(0, 500) ||
                       $('.entry-summary, .post-excerpt').first().text().trim().substring(0, 500);

    // Extract release date
    const dateText = $('time.published, .published time, time[datetime]').first().attr('datetime') ||
                    $('.date, .post-date').first().text().trim() ||
                    '';

    return {
      title,
      coverImage,
      description,
      dateText
    };
  } catch (error) {
    console.error(`Error fetching details for ${gameUrl}:`, error.message);
    return null;
  }
}

// Scrape games from FitGirl Repacks using WordPress REST API
async function scrapeFitGirlGames() {
  try {
    console.log('Fetching games from FitGirl Repacks via WordPress REST API (Category 5: Lossless Repacks)...');
    const games = [];
    const FITGIRL_ICON = 'https://fitgirl-repacks.site/wp-content/uploads/2016/08/cropped-icon.jpg';

    // Fetch only 50 games from category 5 (Lossless Repacks), ordered by date descending
    const response = await axios.get(`${FITGIRL_BASE_URL}/wp-json/wp/v2/posts`, {
      params: {
        categories: 5, // Lossless Repacks category
        per_page: 50,
        _embed: true, // Include embedded media data
        orderby: 'date',
        order: 'desc'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const posts = response.data;
    console.log(`Fetched ${posts.length} posts from category 5`);

    for (const post of posts) {
      const slug = post.slug;

      // Decode HTML entities from WordPress API title
      const titleRaw = post.title?.rendered || '';
      const title = titleRaw
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&hellip;/g, '...')
        .replace(/&[^;]+;/g, ' ');

      // Extract cover image from post content HTML - images are in the content, not featured media
      let coverImage = null;
      if (post.content && post.content.rendered) {
        const $ = cheerio.load(post.content.rendered);
        // Find the first image in the post content
        const firstImg = $('img').first();
        if (firstImg.length) {
          coverImage = firstImg.attr('src') || firstImg.attr('data-src');
          // Decode HTML entities in URL
          if (coverImage) {
            coverImage = coverImage.replace(/&#038;/g, '&').replace(/&amp;/g, '&');
          }
        }
      }

      // Fallback: try featured media if no image in content
      if (!coverImage && post._embedded && post._embedded['wp:featuredmedia'] && Array.isArray(post._embedded['wp:featuredmedia']) && post._embedded['wp:featuredmedia'].length > 0) {
        const media = post._embedded['wp:featuredmedia'][0];
        if (media.source_url) {
          coverImage = media.source_url;
        } else if (media.media_details && media.media_details.sizes) {
          const sizes = media.media_details.sizes;
          coverImage = sizes.full?.source_url || sizes.large?.source_url || sizes.medium_large?.source_url || sizes.medium?.source_url;
        }
      }

      // Extract description from excerpt - use ACTUAL WordPress API structure
      let description = '';
      if (post.excerpt && post.excerpt.rendered) {
        description = post.excerpt.rendered
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&#8211;/g, '-')
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&hellip;/g, '...')
          .replace(/&[^;]+;/g, ' ')
          .trim()
          .substring(0, 500);
      }

      // Extract release date
      const releaseDate = post.date ? post.date.split('T')[0] : new Date().toISOString().split('T')[0];

      games.push({
        id: slug,
        title: title,
        art_cover: coverImage || FITGIRL_ICON,
        art_square: coverImage || FITGIRL_ICON,
        art_logo: coverImage || FITGIRL_ICON,
        art_background: coverImage || FITGIRL_ICON,
        developer: 'FitGirl Repacks',
        description: description || `Compressed repack of ${title} by FitGirl`,
        platform: 'Windows',
        version: '1.0',
        installable: true,
        is_installed: false,
        canRunOffline: true,
        store_url: post.link || `${FITGIRL_BASE_URL}/${slug}/`,
        releaseDate: releaseDate,
        genres: ['Repack', 'Compressed']
      });
    }

    console.log(`Scraped ${games.length} games from FitGirl Repacks (Category 5: Lossless Repacks)`);
    return games;
  } catch (error) {
    console.error('Error scraping FitGirl Repacks:', error.message);
    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
    throw error;
  }
}

// Get games (with caching)
async function getGames() {
  const now = Date.now();
  if (gamesCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return gamesCache;
  }

  gamesCache = await scrapeFitGirlGames();
  cacheTimestamp = now;
  return gamesCache;
}

// GET /manifest.json - Plugin manifest
app.get('/manifest.json', (req, res) => {
  res.json({
    id: 'fitgirl-rest-store',
    name: 'FitGirl Repacks',
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
app.get('/library', async (req, res) => {
  try {
    const games = await getGames();
    res.json({
      games: games
    });
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// GET /game/:id - Get game details
app.get('/game/:id', async (req, res) => {
  try {
    const games = await getGames();
    const game = games.find(g => g.id === req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Try to scrape more details from the game page
    let detailedInfo = { ...game };
    
    try {
      if (game.store_url) {
        const gamePageResponse = await axios.get(game.store_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(gamePageResponse.data);
        
        // Try to extract more detailed description
        const fullDescription = $('.entry-content, .post-content, article p').text().trim();
        if (fullDescription) {
          detailedInfo.description = fullDescription.substring(0, 1000);
        }
      }
    } catch (err) {
      console.error(`Error fetching game details for ${game.id}:`, err.message);
      // Continue with basic info if detailed scraping fails
    }

    res.json({
      ...detailedInfo,
      install: {
        platform: detailedInfo.platform,
        install_path: undefined,
        executable: undefined,
        size: 1024 * 1024 * 1024 * 10 // 10 GB placeholder
      },
      extra: {
        about: {
          description: detailedInfo.description,
          shortDescription: detailedInfo.description.substring(0, 150) + '...'
        },
        reqs: [], // FitGirl pages don't have structured system requirements
        changelog: `FitGirl Repack - Compressed version of ${detailedInfo.title}`
      },
      dlcList: []
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ error: 'Failed to fetch game details', message: error.message });
  }
});

// GET /game/:id/downloads - Get download information
app.get('/game/:id/downloads', async (req, res) => {
  const games = gamesCache;
  const game = games.find(g => g.id === req.params.id);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const platform = req.query.platform || game.platform;
  const installPath = req.query.path || '/tmp/games';

  // Extract magnet link from FitGirl page
  let magnetLink = magnetCache.get(game.id);
  let torboxInfo = torboxCache.get(game.id);
  let downloadUrl = null;

  if (!magnetLink && game.store_url) {
    console.log(`Extracting magnet link from FitGirl page: ${game.store_url}`);
    magnetLink = await extractMagnetLinkFromFitGirl(game.store_url);
    
    if (magnetLink) {
      magnetCache.set(game.id, magnetLink);
      console.log(`Found magnet link for ${game.title}`);
      
      // Create torrent in Torbox using the magnet link
      if (TORBOX_API_TOKEN) {
        console.log(`Creating Torbox torrent from magnet link...`);
        torboxInfo = await createTorboxTorrent(magnetLink, game.title);
        if (torboxInfo) {
          torboxCache.set(game.id, torboxInfo);
        }
      }
    }
  } else if (magnetLink && !torboxInfo && TORBOX_API_TOKEN) {
    // Magnet link exists but no Torbox info - try to create it
    console.log(`Creating Torbox torrent from cached magnet link...`);
    torboxInfo = await createTorboxTorrent(magnetLink, game.title);
    if (torboxInfo) {
      torboxCache.set(game.id, torboxInfo);
    }
  }

  // Try to get download URL from Torbox if we have torrent_id
  if (torboxInfo && torboxInfo.torrent_id) {
    console.log(`Getting download URL from Torbox for torrent_id: ${torboxInfo.torrent_id}`);
    downloadUrl = await getTorboxDownloadUrl(torboxInfo.torrent_id);
    if (downloadUrl) {
      console.log(`Got Torbox download URL: ${downloadUrl.substring(0, 100)}...`);
    } else {
      console.log(`Failed to get Torbox download URL, will use fallback`);
    }
  }

  // No fallback - if we can't get a Torbox download URL, return an error
  if (!downloadUrl) {
    console.error(`❌ Cannot provide download URL for ${game.title} - Torbox download URL unavailable`);
    return res.status(503).json({ 
      error: 'Download unavailable', 
      message: 'Unable to retrieve download URL from Torbox. Please try again later.' 
    });
  }
  
  console.log(`✅ Final download URL for "${game.title}": ${downloadUrl.substring(0, 150)}...`);

  // Determine the downloaded file name (zip from Torbox)
  const urlParts = downloadUrl.split('/');
  let filename = urlParts[urlParts.length - 1].split('?')[0] || `${game.id}.zip`; // Remove query params
  // Ensure filename has .zip extension (Heroic adds .zip if missing, so we need to match)
  if (!filename.endsWith('.zip')) {
    filename = `${filename}.zip`;
  }
  const downloadedFilePath = `${installPath}/${filename}`;
  const extractedPath = `${installPath}/${game.id}`;

  res.json({
    url: downloadUrl,
    method: 'GET',
    headers: {},
    size: 1024 * 1024 * 1024 * 10, // 10 GB placeholder
    checksum: {
      type: 'sha256',
      value: 'placeholder-checksum'
    },
    steps: downloadUrl && downloadUrl.startsWith('http') ? [
      {
        type: 'download',
        url: downloadUrl
      },
      {
        type: 'extract',
        source: downloadedFilePath,
        destination: extractedPath
      },
      {
        type: 'execute',
        command: 'setup.exe',
        args: []
      }
    ] : [
      {
        type: 'download',
        url: game.store_url || `${FITGIRL_BASE_URL}/repacks/${game.id}`
      },
      {
        type: 'extract',
        source: `${installPath}/${game.id}/repack.zip`,
        destination: `${installPath}/${game.id}`
      },
      {
        type: 'execute',
        command: 'chmod',
        args: ['+x', `${installPath}/${game.id}/setup.exe`]
      }
    ]
  });
});

// POST /login - Login endpoint (not needed for FitGirl)
app.post('/login', (req, res) => {
  res.json({
    status: 'success',
    message: 'No authentication required for FitGirl Repacks'
  });
});

// POST /logout - Logout endpoint
app.post('/logout', (req, res) => {
  res.json({ status: 'success' });
});

// GET /user - Get user info
app.get('/user', (req, res) => {
  res.json({
    username: 'guest',
    message: 'FitGirl Repacks does not require authentication'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    gamesCached: gamesCache.length
  });
});

// Debug endpoint to inspect HTML structure
app.get('/debug/html', async (req, res) => {
  try {
    const response = await axios.get(`${FITGIRL_BASE_URL}/popular-repacks/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    
    // Find common article/entry selectors
    const selectors = [
      'article',
      '.entry',
      '.post',
      'article.post',
      'article.entry',
      '.entry-content article',
      'li.entry',
      'a[href*="/repacks/"]',
      'a[href*="fitgirl-repacks.site"]',
      'a[href^="/"]'
    ];

    const results = {};
    selectors.forEach(selector => {
      const elements = $(selector);
      results[selector] = {
        count: elements.length,
        sample: elements.slice(0, 5).map((i, el) => {
          const $el = $(el);
          const href = $el.attr('href') || $el.find('a').first().attr('href');
          return {
            html: $el.html()?.substring(0, 300),
            text: $el.text()?.substring(0, 150),
            classes: $el.attr('class'),
            href: href,
            tagName: $el.prop('tagName')
          };
        }).get()
      };
    });

    // Get all links
    const allLinks = $('a[href]');
    const linkHrefs = [];
    allLinks.each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('repacks') || href.includes('fitgirl-repacks.site'))) {
        linkHrefs.push({
          href: href,
          text: $(el).text().trim().substring(0, 100),
          parent: $(el).parent().prop('tagName'),
          parentClass: $(el).parent().attr('class')
        });
      }
    });

    res.json({
      url: `${FITGIRL_BASE_URL}/popular-repacks/`,
      selectors: results,
      title: $('title').text(),
      bodyClasses: $('body').attr('class'),
      repackLinks: linkHrefs.slice(0, 20), // First 20 repack links
      totalRepackLinks: linkHrefs.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Clear cache endpoint (for testing)
app.post('/clear-cache', (req, res) => {
  gamesCache = [];
  cacheTimestamp = 0;
  magnetCache.clear();
  torboxCache.clear();
  res.json({ status: 'success', message: 'Cache cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FitGirl REST Store server running on http://localhost:${PORT}`);
  console.log(`📋 Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`📚 Library: http://localhost:${PORT}/library`);
  console.log(`\n💡 Add this URL in Heroic Settings: http://localhost:${PORT}`);
  
  if (TORBOX_API_TOKEN) {
    console.log(`✅ Torbox API token configured - magnet links will be available`);
  } else {
    console.log(`⚠️  TORBOX_API_TOKEN not set - set it in .env file to enable magnet links`);
    console.log(`   Create .env file with: TORBOX_API_TOKEN=your_token_here`);
  }
  
  console.log(`\n🔄 Scraping FitGirl Repacks on startup...`);
  
  // Pre-scrape games on startup
  getGames().catch(err => {
    console.error('Failed to scrape games on startup:', err.message);
  });
});

