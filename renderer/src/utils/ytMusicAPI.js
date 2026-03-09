/**
 * YouTube Music API Integration
 * This module provides functions to interact with YouTube Music through the webview
 * 
 * TWO-WEBVIEW ARCHITECTURE:
 * - Browse Webview (window.ytBrowseWebview / window.ytWebview): For navigation and browsing
 * - Playback Webview (window.ytPlaybackWebview): For audio playback, never navigates
 */

/**
 * Get the browsing webview element (for navigation)
 */
export const getWebview = () => {
  return window.ytBrowseWebview || window.ytWebview;
};

/**
 * Get the playback webview element (for audio)
 */
export const getPlaybackWebview = () => {
  return window.ytPlaybackWebview;
};

/**
 * Execute JavaScript in the browsing webview
 */
export const executeInYT = async (code) => {
  const wv = getWebview();
  if (!wv) {
    console.error("YouTube Music webview not found");
    return null;
  }
  try {
    return await wv.executeJavaScript(code);
  } catch (error) {
    console.error("Error executing in YouTube Music:", error);
    return null;
  }
};

/**
 * Execute JavaScript in the playback webview
 */
export const executeInPlayback = async (code) => {
  const wv = getPlaybackWebview();
  if (!wv) {
    console.error("Playback webview not found");
    return null;
  }
  try {
    return await wv.executeJavaScript(code);
  } catch (error) {
    console.error("Error executing in playback webview:", error);
    return null;
  }
};

// Track current playback playlist to avoid reloading
let currentPlaybackPlaylistId = null;

/**
 * Play a song using the PLAYBACK webview
 * This ensures music continues playing even when browsing/navigating
 * 
 * @param {string} playlistId - The playlist ID to load
 * @param {number} songIndex - Index of the song to play (0-based)
 */
export const playSongInPlayback = async (playlistId, songIndex) => {
  const wv = getPlaybackWebview();
  if (!wv) {
    console.error('[playSongInPlayback] Playback webview not found');
    return { success: false, error: 'Playback webview not available' };
  }

  console.log('[playSongInPlayback] Playing:', { playlistId, songIndex });

  // Load playlist if different from current
  if (currentPlaybackPlaylistId !== playlistId) {
    console.log('[playSongInPlayback] Loading new playlist:', playlistId);
    const playlistUrl = `https://music.youtube.com/playlist?list=${playlistId}`;

    await wv.loadURL(playlistUrl);

    // Wait for page to load
    await new Promise((resolve) => {
      const onLoad = () => {
        wv.removeEventListener('did-finish-load', onLoad);
        resolve();
      };
      wv.addEventListener('did-finish-load', onLoad);
      setTimeout(resolve, 5000); // Timeout after 5 seconds
    });

    // Wait extra for content to render
    await new Promise(r => setTimeout(r, 2000));
    currentPlaybackPlaylistId = playlistId;
  }

  // Click the song to play
  const result = await executeInPlayback(`
    (function() {
      try {
        const songIndex = ${songIndex};
        console.log('[Playback] Looking for song at index:', songIndex);
        
        const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
        console.log('[Playback] Found', songs.length, 'songs');
        
        if (songs.length > songIndex) {
          const song = songs[songIndex];
          
          // Try multiple click methods
          song.click();
          
          // Also try clicking the play button or overlay
          setTimeout(() => {
            const playBtn = song.querySelector('[aria-label*="Play"]');
            if (playBtn) playBtn.click();
          }, 300);
          
          console.log('[Playback] Clicked song at index', songIndex);
          return { success: true, index: songIndex };
        }
        
        return { success: false, error: 'Song not found at index ' + songIndex };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })();
  `);

  console.log('[playSongInPlayback] Result:', result);
  return result || { success: false, error: 'Unknown error' };
};

/**
 * Play a song by video ID using the playback webview
 */
export const playSongByVideoIdInPlayback = async (videoId) => {
  const wv = getPlaybackWebview();
  if (!wv) {
    console.error('[playSongByVideoIdInPlayback] Playback webview not found');
    return { success: false };
  }

  console.log('[playSongByVideoIdInPlayback] Playing video:', videoId);

  await wv.loadURL(`https://music.youtube.com/watch?v=${videoId}`);

  // Wait for load
  await new Promise((resolve) => {
    const onLoad = () => {
      wv.removeEventListener('did-finish-load', onLoad);
      resolve();
    };
    wv.addEventListener('did-finish-load', onLoad);
    setTimeout(resolve, 5000);
  });

  currentPlaybackPlaylistId = null; // Not on a playlist
  return { success: true, videoId };
};

// Cache for playlist data to avoid unnecessary reloads
const playlistCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search for music on YouTube Music
 * Uses in-page navigation to avoid stopping playback
 */
export const searchYouTubeMusic = async (query) => {
  const wv = getWebview();
  if (!wv || !query.trim()) return;

  // Check if we're already on YouTube Music
  const currentUrl = await executeInYT('window.location.href');

  if (!currentUrl || !currentUrl.includes('music.youtube.com')) {
    // Only use loadURL if we're not on YouTube Music yet
    const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
    await wv.loadURL(searchUrl);
  } else {
    // Navigate within the page to avoid stopping playback
    await executeInYT(`
      (function() {
        const searchUrl = '/search?q=${encodeURIComponent(query).replace(/'/g, "\\'")}';
        // Use YouTube Music's internal navigation
        if (window.location.pathname + window.location.search !== searchUrl) {
          window.history.pushState({}, '', searchUrl);
          // Trigger YouTube Music's router
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      })();
    `);
  }

  return { success: true, query };
};

/**
 * Get current song metadata from PLAYBACK webview
 */
export const getCurrentSong = async () => {
  // Try playback webview first
  let result = await executeInPlayback(`
    (function () {
      const md = navigator.mediaSession?.metadata;
      if (!md) return null;

      return {
        title: md.title || "",
        artist: md.artist || "",
        album: md.album || "",
        artwork: md.artwork?.[0]?.src || ""
      };
    })();
  `);

  // Fallback to browse webview if playback not ready
  if (!result) {
    result = await executeInYT(`
      (function () {
        const md = navigator.mediaSession?.metadata;
        if (!md) return null;

        return {
          title: md.title || "",
          artist: md.artist || "",
          album: md.album || "",
          artwork: md.artwork?.[0]?.src || ""
        };
      })();
    `);
  }

  return result;
};

/**
 * Check if music is currently playing (from PLAYBACK webview)
 */
export const isPlaying = async () => {
  let result = await executeInPlayback(`
    !!document.querySelector('button[aria-label="Pause"]')
  `);

  // Fallback to browse webview
  if (result === null) {
    result = await executeInYT(`
      !!document.querySelector('button[aria-label="Pause"]')
    `);
  }

  return result;
};



/**
 * Play/Pause toggle on PLAYBACK webview
 * Uses keyboard event for maximum reliability
 */
export const togglePlayPause = async () => {
  // Try playback webview first
  let result = await executeInPlayback(`
    (function () {
      console.log('togglePlayPause called on playback webview');
      
      // Primary strategy: Use spacebar (most reliable)
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: ' ',
          code: 'Space',
          keyCode: 32,
          which: 32,
          bubbles: true,
          cancelable: true
        }));
        
        console.log('Sent spacebar event');
        return { action: 'spacebar' };
      } catch (e) {
        console.error('Spacebar failed, trying buttons:', e);
      }
      
      // Fallback: Try clicking buttons
      const pauseBtn = document.querySelector('.play-pause-button[aria-label="Pause"]');
      if (pauseBtn) {
        console.log('Found pause button, clicking...');
        pauseBtn.click();
        return { action: 'paused' };
      }

      const playBtn = document.querySelector('.play-pause-button[aria-label="Play"]');
      if (playBtn) {
        console.log('Found play button, clicking...');
        playBtn.click();
        return { action: 'playing' };
      }
      
      const standardPlay = document.querySelector('button[aria-label="Play"]');
      if (standardPlay) { 
        standardPlay.click(); 
        return { action: 'played' }; 
      }

      return { action: 'none' };
    })();
  `);

  return result;
};

/**
 * Seek to a specific progress percentage (0-100)
 */
export const seekTo = async (percentage) => {
  // Use playback webview where music is playing
  return await executeInPlayback(`
    (function() {
      const progressBar = document.querySelector('tp-yt-paper-progress');
      if (progressBar) {
        // Calculate click position
        const rect = progressBar.getBoundingClientRect();
        const x = rect.left + (rect.width * (${percentage} / 100));
        const y = rect.top + (rect.height / 2);
        
        // Dispatch click
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y
        });
        progressBar.dispatchEvent(clickEvent);
      }
      
      // Fallback: Try setting video current time directly
      const video = document.querySelector('video');
      if (video && isFinite(video.duration)) {
        video.currentTime = video.duration * (${percentage} / 100);
      }
    })();
  `);
};

/**
 * Set Volume (0-100)
 */
export const setVolume = async (volume) => {
  // Use playback webview where music is playing
  return await executeInPlayback(`
    (function() {
      const video = document.querySelector('video');
      if (video) {
        video.volume = ${volume} / 100;
        return true;
      }
      return false;
    })();
  `);
};

/**
 * Get Volume (0-100)
 */
export const getVolume = async () => {
  // Use playback webview where music is playing
  return await executeInPlayback(`
    (function() {
      const video = document.querySelector('video');
      if (video) {
        return Math.round(video.volume * 100);
      }
      return 50; // Default
    })();
  `);
};

/**
 * Get Lyrics with preserved formatting - Improved
 */
export const fetchLyrics = async () => {
  // Use playback webview for lyrics (that's where the song is playing)
  return await executeInPlayback(`
      (function() {
        // Selector 1: Standard Description Shelf
        const lyricsContainer = document.querySelector('ytmusic-description-shelf-renderer');
        if (lyricsContainer) {
          const text = lyricsContainer.innerText || lyricsContainer.textContent;
          return text ? text.trim() : null;
        }

        // Selector 2: Message Renderer (sometimes used for "Lyrics not available")
        const message = document.querySelector('ytmusic-message-renderer');
        if (message) {
           return message.innerText || message.textContent;
        }

        return null;
      })();
   `);
};

/**
 * Play next track
 */
export const nextTrack = async () => {
  // Use playback webview
  return await executeInPlayback(`
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "N",
        shiftKey: true,
        bubbles: true,
      })
    );
  `);
};

/**
 * Play previous track
 */
export const previousTrack = async () => {
  // Use playback webview
  return await executeInPlayback(`
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "P",
        shiftKey: true,
        bubbles: true,
      })
    );
  `);
};

/**
 * Get Player State (Shuffle, Repeat, Like)
 */
export const getPlayerState = async () => {
  // Use playback webview where music is playing
  return await executeInPlayback(`
    (function() {
      try {
        // Selectors are often verified via browser devtools
        const likeBtn = document.querySelector('tp-yt-paper-icon-button.like') || document.querySelector('.like');
        const isLiked = likeBtn ? likeBtn.getAttribute('aria-pressed') === 'true' : false;

        const shuffleBtn = document.querySelector('.shuffle') || document.querySelector('button.shuffle');
        const isShuffle = shuffleBtn ? shuffleBtn.getAttribute('aria-pressed') === 'true' : false;

        const repeatBtn = document.querySelector('.repeat') || document.querySelector('button.repeat');
        let repeatMode = 'NONE';
        if (repeatBtn) {
           const title = (repeatBtn.getAttribute('title') || repeatBtn.getAttribute('aria-label') || '').toLowerCase();
           if (title.includes('one')) repeatMode = 'ONE';
           else if (title.includes('all')) repeatMode = 'ALL';
        }

        return { isLiked, isShuffle, repeatMode };
      } catch(e) {
        return { isLiked: false, isShuffle: false, repeatMode: 'NONE' };
      }
    })();
  `);
};

/**
 * Toggle Like
 */
export const toggleLike = async () => {
  // Use playback webview
  return await executeInPlayback(`
    (function() {
      const likeBtn = document.querySelector('tp-yt-paper-icon-button.like') || document.querySelector('.like');
      if (likeBtn) likeBtn.click();
    })();
  `);
};

/**
 * Toggle Shuffle
 */
export const toggleShuffle = async () => {
  // Use playback webview
  return await executeInPlayback(`
    (function() {
      const shuffleBtn = document.querySelector('.shuffle') || document.querySelector('button.shuffle');
      if (shuffleBtn) shuffleBtn.click();
    })();
  `);
};

/**
 * Toggle Repeat
 */
export const toggleRepeat = async () => {
  // Use playback webview
  return await executeInPlayback(`
    (function() {
      const repeatBtn = document.querySelector('.repeat') || document.querySelector('button.repeat');
      if (repeatBtn) repeatBtn.click();
    })();
  `);
};

/**
 * Get current playback progress
 */
/**
 * Get current playback progress
 */
export const getProgress = async () => {
  // Use playback webview where music is playing
  return await executeInPlayback(`
    (function() {
      try {
        // Strategy 1: Try the progress bar element with multiple selectors
        let progressBar = document.querySelector('#progress-bar');
        
        if (!progressBar) {
          progressBar = document.querySelector('ytmusic-player-bar #progress-bar');
        }
        
        if (!progressBar) {
          progressBar = document.querySelector('.progress-bar-slider');
        }
        
        if (progressBar) {
          const value = parseFloat(progressBar.value || progressBar.getAttribute('value') || 0);
          const max = parseFloat(progressBar.max || progressBar.getAttribute('max') || 100);
          
          if (max > 0) {
            return {
              current: value,
              total: max,
              percentage: (value / max) * 100
            };
          }
        }
        
        // Strategy 2: Try to get from time display
        const timeInfo = document.querySelector('.time-info');
        if (timeInfo) {
          const text = timeInfo.textContent;
          const match = text.match(/(\\d+):(\\d+)\\s*\\/\\s*(\\d+):(\\d+)/);
          if (match) {
            const currentSec = parseInt(match[1]) * 60 + parseInt(match[2]);
            const totalSec = parseInt(match[3]) * 60 + parseInt(match[4]);
            return {
              current: currentSec,
              total: totalSec,
              percentage: totalSec > 0 ? (currentSec / totalSec) * 100 : 0
            };
          }
        }
        
        return { current: 0, total: 0, percentage: 0 };
      } catch (e) {
        return { current: 0, total: 0, percentage: 0 };
      }
    })();
  `);
};

/**
 * Ensure the Lyrics tab is selected in the player page
 */
export const ensureLyricsTabSelected = async () => {
  // Use playback webview where the song is playing
  return await executeInPlayback(`
    (function() {
      try {
        // 1. Ensure Player Page is open
        const playerPage = document.querySelector('ytmusic-player-page');
        if (!playerPage) {
            // Try to open it by clicking the song info in player bar if visible
            const playerBarTitle = document.querySelector('ytmusic-player-bar .title');
            if (playerBarTitle) playerBarTitle.click();
            return false; // Will need to wait for transition
        }
        
        // 2. Find Tabs
        const tabs = document.querySelectorAll('tp-yt-paper-tab, dt-paper-tab, ytmusic-tab-renderer');
        
        for (const tab of tabs) {
          const text = (tab.innerText || tab.textContent).toLowerCase();
          if (text.includes('lyrics')) {
             if (tab.getAttribute('aria-selected') !== 'true' && !tab.selected) {
                console.log("Clicking Lyrics tab...");
                tab.click();
                return true;
             }
             return true; // Already selected
          }
        }
        
        return false;
      } catch(e) {
        console.error("Error ensuring lyrics tab:", e);
        return false;
      }
    })();
  `);
};

/**
 * Navigate to a specific URL in YouTube Music
 */
export const navigateToURL = async (url) => {
  const wv = getWebview();
  if (!wv) return;

  await wv.loadURL(url);
  return { success: true, url };
};

/**
 * Get playlists from YouTube Music Library
 */
export const getPlaylists = async () => {
  console.log('ytMusicAPI: getPlaylists called');
  const result = await executeInYT(`
    (function () {
      console.log('Inside getPlaylists executeInYT');
      const playlists = [];
      
      // Try to find playlist elements in the library
      const playlistElements = document.querySelectorAll('ytmusic-two-row-item-renderer');
      console.log('Found playlist elements:', playlistElements.length);
      
      playlistElements.forEach((element, index) => {
        const titleEl = element.querySelector('.title');
        const subtitleEl = element.querySelector('.subtitle');
        const thumbnailEl = element.querySelector('img');
        const linkEl = element.querySelector('a');
        
        if (titleEl) {
          // Extract playlist ID from href
          let playlistId = '';
          if (linkEl && linkEl.href) {
            const match = linkEl.href.match(/list=([^&]+)/);
            if (match) {
              playlistId = match[1];
            }
          }
          
          // If no ID found, generate one from index
          if (!playlistId) {
            playlistId = 'playlist_' + index;
          }
          
          // Get thumbnail and upgrade to high quality
          let thumbnail = thumbnailEl?.src || '';
          if (thumbnail) {
            thumbnail = thumbnail.replace(/w\\d+-h\\d+/, 'w544-h544').replace(/s\\d+/, 's544');
          }
          
          playlists.push({
            id: playlistId,
            title: titleEl.textContent?.trim() || '',
            description: subtitleEl?.textContent?.trim() || '',
            thumbnail: thumbnail,
            type: 'playlist'
          });
        }
      });
      
      console.log('Playlists found:', playlists.length);
      return playlists.length > 0 ? playlists : null;
    })();
  `);
  console.log('ytMusicAPI: getPlaylists result:', result);
  return result;
};

/**
 * Helper to click navbar items
 */
const clickNavbarItem = async (tabName) => {
  return await executeInYT(`
    (function() {
      console.log("Attempting to click navbar item:", '${tabName}');

      // Helper to check if we need to close player first
      const closePlayerIfNeeded = () => {
        try {
          const playerPage = document.querySelector('ytmusic-player-page');
          if (playerPage) {
            // Check if player is arguably open (has content, y > 0 usually means it's up)
            // But relying on attributes is safer if known
            // Try to find the close button regardless
            const closeBtn = document.querySelector('.ytmusic-player-page .down-button') 
                          || document.querySelector('[aria-label="Close player page"]')
                          || document.querySelector('[aria-label="Close"]');
            
            if (closeBtn && closeBtn.offsetParent !== null) { // if visible
              console.log("Found close player button, clicking...");
              closeBtn.click();
              return true; // We performed an action
            }
          }
        } catch (e) {
          console.error("Error closing player:", e);
        }
        return false;
      };

      // Try closing player first if it's open (it might cover nav)
      closePlayerIfNeeded();

      // Look for pivot bar items (Bottom nav or sidebar)
      const items = document.querySelectorAll('ytmusic-pivot-bar-item-renderer, ytmusic-navigation-list-item-renderer');
      for (const item of items) {
        // text content might be "Home", "Library", etc.
        // check both text and aria-label
        const text = item.textContent?.toLowerCase() || "";
        const label = item.getAttribute('aria-label')?.toLowerCase() || "";
        
        if (text.includes('${tabName}') || label.includes('${tabName}')) {
          console.log("Found navbar item for ${tabName}, clicking...");
          item.click();
          return true;
        }
      }
      
      // Fallback for Home - click Logo
      if ('${tabName}' === 'home') {
        const logo = document.querySelector('a.ytmusic-logo');
        if (logo) {
          console.log("Found logo for Home, clicking...");
          logo.click();
          return true;
        }
      }

      // Fallback for different layouts (e.g. tablet/mobile web)
      const link = document.querySelector('a[href*="${tabName}"]');
      if (link) {
         console.log("Found link for ${tabName}, clicking...");
        link.click();
        return true;
      }
      
      console.warn("Could not find navbar item for:", '${tabName}');
      return false;
    })();
  `);
};

/**
 * Navigate to Library
 */
export const goToLibrary = async () => {
  console.log("Navigating to Library...");
  const success = await clickNavbarItem('library');
  if (!success) {
    // Fallback if click fails (should rarely happen)
    await navigateToURL('https://music.youtube.com/library/playlists');
  }
};

/**
 * Navigate to Home
 */
export const goToHome = async () => {
  console.log("Navigating to Home...");
  const success = await clickNavbarItem('home');
  if (!success) {
    await navigateToURL('https://music.youtube.com');
  }
};

/**
 * Navigate to Search
 */
export const goToSearch = async () => {
  console.log("Navigating to Search...");
  // Search doesn't have a simple nav button usually, it has a search icon
  const success = await executeInYT(`
    (function() {
      const btn = document.querySelector('ytmusic-search-box');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })();
  `);

  if (!success) {
    await navigateToURL('https://music.youtube.com/search');
  }
};

/**
 * Get current playback time and duration
 */
export const getPlaybackProgress = async () => {
  return await executeInYT(`
    (function () {
      const timeInfo = document.querySelector('.time-info');
      if (!timeInfo) return null;
      
      const currentTime = timeInfo.querySelector('.time-info.ytmusic-player-bar')?.textContent || '0:00';
      const duration = timeInfo.querySelector('.time-info.ytmusic-player-bar:last-child')?.textContent || '0:00';
      
      return {
        currentTime,
        duration
      };
    })();
  `);
};

/**
 * Click on a specific element (for playing playlists, albums, etc.)
 */
export const clickElement = async (selector) => {
  return await executeInYT(`
    (function () {
      const element = document.querySelector('${selector}');
      if (element) {
        element.click();
        return { success: true };
      }
      return { success: false };
    })();
  `);
};

/**
 * Get search results
 */
export const getSearchResults = async () => {
  return await executeInYT(`
    (function () {
      const results = {
        songs: [],
        albums: [],
        playlists: [],
        artists: []
      };
      
      // Get all search result items
      const items = document.querySelectorAll('ytmusic-shelf-renderer');
      
      items.forEach(shelf => {
        const shelfTitle = shelf.querySelector('.title')?.textContent?.toLowerCase() || '';
        const contents = shelf.querySelectorAll('ytmusic-responsive-list-item-renderer');
        
        contents.forEach((item, index) => {
          const title = item.querySelector('.title')?.textContent?.trim() || '';
          const subtitle = item.querySelector('.subtitle')?.textContent?.trim() || '';
          const thumbnail = item.querySelector('img')?.src || '';
          
          const resultItem = {
            id: 'result_' + index,
            title,
            subtitle,
            thumbnail
          };
          
          if (shelfTitle.includes('song')) {
            results.songs.push(resultItem);
          } else if (shelfTitle.includes('album')) {
            results.albums.push(resultItem);
          } else if (shelfTitle.includes('playlist')) {
            results.playlists.push(resultItem);
          } else if (shelfTitle.includes('artist')) {
            results.artists.push(resultItem);
          }
        });
      });
      
      return results;
    })();
  `);
};

/**
 * Play a specific playlist by navigating to it
 */
export const playPlaylist = async (playlistId) => {
  const url = `https://music.youtube.com/playlist?list=${playlistId}`;
  await navigateToURL(url);

  // Wait a bit for the page to load, then click play
  setTimeout(async () => {
    await executeInYT(`
      (function () {
        const playButton = document.querySelector('button[aria-label*="Play"]');
        if (playButton) {
          playButton.click();
        }
      })();
    `);
  }, 1500);

  return { success: true, playlistId };
};

/**
 * Get songs from a specific playlist
 */
export const getPlaylistSongs = async (playlistId) => {
  const wv = getWebview();
  if (!wv) return null;

  // Check cache first
  const cached = playlistCache.get(playlistId);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log('Using cached playlist data for:', playlistId);
    return cached.songs;
  }

  // Check if we're already on this playlist page
  const currentURL = wv.getURL();
  const targetURL = `https://music.youtube.com/playlist?list=${playlistId}`;
  const isAlreadyOnPlaylist = currentURL && currentURL.includes(`list=${playlistId}`);

  console.log('getPlaylistSongs - Current URL:', currentURL);
  console.log('getPlaylistSongs - Target playlist:', playlistId);
  console.log('getPlaylistSongs - Already on playlist:', isAlreadyOnPlaylist);

  // Only navigate if we're not already on this playlist
  if (!isAlreadyOnPlaylist) {
    console.log('Navigating to playlist...');
    await navigateToURL(targetURL);
  } else {
    console.log('Already on playlist, skipping navigation');
  }

  const songs = await executeInYT(`
    (function () {
      return new Promise(async (resolve) => {
        try {
          // Wait longer for initial content to load
          await new Promise(r => setTimeout(r, 3000));

          // Scroll down to trigger lazy loading of images
          for (let i = 0; i < 5; i++) {
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 500));
          }
          
          // Scroll back to top
          window.scrollTo(0, 0);
          
          // Wait longer for images to finish loading
          await new Promise(r => setTimeout(r, 2000));
          
          const songs = [];
          
          // IMPORTANT: Only get songs from the actual playlist, not recommendations
          // The playlist songs are inside ytmusic-playlist-shelf-renderer
          const playlistShelf = document.querySelector('ytmusic-playlist-shelf-renderer');
          
          if (!playlistShelf) {
            console.error('Playlist shelf not found');
            resolve(null);
            return;
          }
          
          // Get song items ONLY from the playlist shelf (excludes recommendations)
          const songElements = playlistShelf.querySelectorAll('ytmusic-responsive-list-item-renderer');
          
          console.log('Found', songElements.length, 'songs in playlist');
          
          songElements.forEach((element, index) => {
            const titleEl = element.querySelector('.title');
            const artistEls = element.querySelectorAll('.secondary-flex-columns a');
            const durationEl = element.querySelector('.fixed-column');
            
            if (titleEl) {
              let artist = '';
              if (artistEls && artistEls.length > 0) {
                artist = artistEls[0].textContent?.trim() || '';
              }
              
              // Better thumbnail extraction
              let thumbnail = '';
              const imgElement = element.querySelector('img');
              
              if (imgElement) {
                thumbnail = imgElement.src;
                
                // If placeholder, try other attributes
                if (thumbnail.includes('data:image') || thumbnail.includes('1x1')) {
                  const dataSrc = imgElement.getAttribute('data-src');
                  const srcset = imgElement.getAttribute('srcset');
                  
                  if (dataSrc && !dataSrc.includes('data:image')) {
                    thumbnail = dataSrc;
                  } else if (srcset) {
                    const srcsetUrl = srcset.split(',').pop()?.trim().split(' ')[0];
                    if (srcsetUrl && !srcsetUrl.includes('data:image')) {
                      thumbnail = srcsetUrl;
                    }
                  }
                }
                
                // Only use if it's a real URL
                if (!thumbnail.startsWith('http') || thumbnail.includes('data:image')) {
                  thumbnail = '';
                }
              }
              
              songs.push({
                id: 'song_' + index,
                title: titleEl.textContent?.trim() || '',
                artist: artist,
                duration: durationEl?.textContent?.trim() || '',
                thumbnail: thumbnail || '',
                index: index
              });
            }
          });
          
          console.log('Scraped', songs.length, 'songs with thumbnails');
          
          resolve(songs.length > 0 ? songs : null);
        } catch (e) {
          console.error("Error collecting songs:", e);
          resolve(null);
        }
      });
    })();
  `);

  // Cache the results
  if (songs && songs.length > 0) {
    playlistCache.set(playlistId, {
      songs: songs,
      timestamp: Date.now()
    });
    console.log('Cached playlist data for:', playlistId);
  }

  return songs;
};

/**
 * Play a specific song by index in current view
 */
export const playSongByIndex = async (index) => {
  console.log('playSongByIndex called with index:', index);

  const result = await executeInYT(`
    (function () {
      try {
        const songIndex = ${index};
        console.log('Looking for song at index', songIndex);
        const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
        console.log('Found songs:', songs.length);
        
        if (songs[songIndex]) {
          console.log('Clicking song at index', songIndex);
          
          // Method 1: Click the song element
          songs[songIndex].click();
          
          // Method 2: Try to find and click play button within the song
          setTimeout(function() {
            // Try play button in the song row
            const playButton = songs[songIndex].querySelector('button[aria-label*="Play"]');
            if (playButton) {
              console.log('Found play button, clicking it');
              playButton.click();
            }
            
            // Method 3: Try clicking the title/link
            const titleLink = songs[songIndex].querySelector('a.yt-simple-endpoint');
            if (titleLink) {
              console.log('Found title link, clicking it');
              titleLink.click();
            }
            
            // Method 4: Force play by finding the main play button
            setTimeout(function() {
              const mainPlayButton = document.querySelector('button[aria-label="Play"]');
              if (mainPlayButton) {
                console.log('Found main play button, clicking it');
                mainPlayButton.click();
              }
            }, 200);
          }, 100);
          
          return { success: true, index: songIndex };
        } else {
          console.error('Song at index', songIndex, 'not found');
          return { success: false, error: 'Song not found' };
        }
      } catch (error) {
        console.error('Error in playSongByIndex:', error.message);
        return { success: false, error: error.message };
      }
    })();
  `);
  console.log('playSongByIndex result:', result);
  return result;
};

/**
 * Get current queue
 */
export const getQueue = async () => {
  return await executeInYT(`
    (function () {
      const queue = [];
      // Try to get queue items
      const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
      
      queueItems.forEach((item, index) => {
        const title = item.querySelector('.title')?.textContent?.trim();
        const artist = item.querySelector('.byline')?.textContent?.trim();
        
        if (title) {
          queue.push({
            id: 'queue_' + index,
            title,
            artist: artist || '',
            index
          });
        }
      });
      
      return queue.length > 0 ? queue : null;
    })();
  `);
};




export default {
  getWebview,
  executeInYT,
  searchYouTubeMusic,
  getCurrentSong,
  isPlaying,
  togglePlayPause,
  nextTrack,
  previousTrack,
  navigateToURL,
  getPlaylists,
  goToLibrary,
  goToHome,
  goToSearch,
  getPlaybackProgress,
  clickElement,
  getSearchResults,
  playPlaylist,
  getPlaylistSongs,
  playSongByIndex,
  getQueue,
  getProgress,
  seekTo
};
