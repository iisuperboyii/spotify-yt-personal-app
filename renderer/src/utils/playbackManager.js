/**
 * Playback Manager - Controls the hidden playback webview
 * 
 * This module provides a centralized way to control music playback
 * through a dedicated webview that never navigates away from the current song.
 */

// Track current playback state
let currentPlaylistId = null;
let isPlaybackReady = false;

/**
 * Get the playback webview element
 */
const getPlaybackWebview = () => window.ytPlaybackWebview;

/**
 * Get the browsing webview element
 */
const getBrowseWebview = () => window.ytBrowseWebview || window.ytWebview;

/**
 * Execute JavaScript in the playback webview
 */
const executeInPlayback = async (script) => {
  const wv = getPlaybackWebview();
  if (!wv) {
    console.warn('[PlaybackManager] Playback webview not ready');
    return null;
  }
  try {
    return await wv.executeJavaScript(script);
  } catch (error) {
    console.error('[PlaybackManager] Execute error:', error);
    return null;
  }
};

/**
 * Initialize the playback webview with a playlist
 * This loads the playlist page and prepares for playback
 */
export const initPlayback = async (playlistId) => {
  const wv = getPlaybackWebview();
  if (!wv) {
    console.error('[PlaybackManager] Playback webview not available');
    return false;
  }

  // Don't reload if already on this playlist
  if (currentPlaylistId === playlistId && isPlaybackReady) {
    console.log('[PlaybackManager] Already on playlist:', playlistId);
    return true;
  }

  console.log('[PlaybackManager] Loading playlist:', playlistId);

  try {
    const playlistUrl = `https://music.youtube.com/playlist?list=${playlistId}`;
    await wv.loadURL(playlistUrl);

    // Wait for page to load
    await new Promise(resolve => {
      const onReady = () => {
        wv.removeEventListener('did-finish-load', onReady);
        resolve();
      };
      wv.addEventListener('did-finish-load', onReady);
      // Timeout fallback
      setTimeout(resolve, 5000);
    });

    currentPlaylistId = playlistId;
    isPlaybackReady = true;
    console.log('[PlaybackManager] Playlist loaded successfully');
    return true;
  } catch (error) {
    console.error('[PlaybackManager] Failed to load playlist:', error);
    return false;
  }
};

/**
 * Play a specific song from a playlist
 * @param {string} playlistId - The playlist ID
 * @param {number} songIndex - Index of the song in the playlist (0-based)
 */
export const playSong = async (playlistId, songIndex) => {
  console.log('[PlaybackManager] Playing song:', { playlistId, songIndex });

  // Initialize playlist if needed
  if (currentPlaylistId !== playlistId) {
    const loaded = await initPlayback(playlistId);
    if (!loaded) {
      console.error('[PlaybackManager] Failed to load playlist for playback');
      return false;
    }
    // Wait extra time for content to render
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click the song to play it
  const result = await executeInPlayback(`
    (function() {
      try {
        // Wait a moment for DOM
        const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
        console.log('[Playback] Found songs:', songs.length);
        
        if (songs.length > ${songIndex}) {
          const song = songs[${songIndex}];
          // Find and click the play overlay or the song itself
          const playButton = song.querySelector('.play-button') || song.querySelector('.overlay') || song;
          if (playButton) {
            playButton.click();
            console.log('[Playback] Clicked song at index ${songIndex}');
            return { success: true, clicked: true };
          }
        }
        return { success: false, reason: 'Song not found at index ${songIndex}' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })();
  `);

  console.log('[PlaybackManager] Play result:', result);
  return result?.success || false;
};

/**
 * Play a song by video ID (for search results, etc.)
 * @param {string} videoId - YouTube video ID
 */
export const playSongByVideoId = async (videoId) => {
  const wv = getPlaybackWebview();
  if (!wv) return false;

  console.log('[PlaybackManager] Playing by video ID:', videoId);

  try {
    // Navigate to watch page
    await wv.loadURL(`https://music.youtube.com/watch?v=${videoId}`);

    // Wait for load
    await new Promise(resolve => {
      const onReady = () => {
        wv.removeEventListener('did-finish-load', onReady);
        resolve();
      };
      wv.addEventListener('did-finish-load', onReady);
      setTimeout(resolve, 5000);
    });

    currentPlaylistId = null; // Not on a playlist anymore
    isPlaybackReady = true;
    return true;
  } catch (error) {
    console.error('[PlaybackManager] Failed to play video:', error);
    return false;
  }
};

/**
 * Get current playback state from the playback webview
 */
export const getPlaybackState = async () => {
  return await executeInPlayback(`
    (function() {
      const video = document.querySelector('video');
      const md = navigator.mediaSession?.metadata;
      
      return {
        isPlaying: video ? !video.paused : false,
        currentTime: video?.currentTime || 0,
        duration: video?.duration || 0,
        title: md?.title || '',
        artist: md?.artist || '',
        album: md?.album || '',
        artwork: md?.artwork?.[0]?.src || ''
      };
    })();
  `);
};

/**
 * Toggle play/pause
 */
export const togglePlayPause = async () => {
  return await executeInPlayback(`
    (function() {
      // Try spacebar first (most reliable)
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32,
        bubbles: true
      }));
      return { success: true };
    })();
  `);
};

/**
 * Skip to next track
 */
export const nextTrack = async () => {
  return await executeInPlayback(`
    (function() {
      const nextBtn = document.querySelector('.next-button') || 
                      document.querySelector('button[aria-label="Next"]') ||
                      document.querySelector('tp-yt-paper-icon-button.next-button');
      if (nextBtn) {
        nextBtn.click();
        return { success: true };
      }
      // Fallback: keyboard shortcut
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'n',
        code: 'KeyN',
        keyCode: 78,
        shiftKey: true,
        bubbles: true
      }));
      return { success: true, method: 'keyboard' };
    })();
  `);
};

/**
 * Go to previous track
 */
export const prevTrack = async () => {
  return await executeInPlayback(`
    (function() {
      const prevBtn = document.querySelector('.previous-button') || 
                      document.querySelector('button[aria-label="Previous"]') ||
                      document.querySelector('tp-yt-paper-icon-button.previous-button');
      if (prevBtn) {
        prevBtn.click();
        return { success: true };
      }
      // Fallback: keyboard shortcut
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'p',
        code: 'KeyP',
        keyCode: 80,
        shiftKey: true,
        bubbles: true
      }));
      return { success: true, method: 'keyboard' };
    })();
  `);
};

/**
 * Seek to a specific time
 * @param {number} time - Time in seconds
 */
export const seekTo = async (time) => {
  return await executeInPlayback(`
    (function() {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = ${time};
        return { success: true, time: ${time} };
      }
      return { success: false, reason: 'No video element' };
    })();
  `);
};

/**
 * Set volume (0-100)
 */
export const setVolume = async (volume) => {
  const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
  return await executeInPlayback(`
    (function() {
      const video = document.querySelector('video');
      if (video) {
        video.volume = ${normalizedVolume};
        return { success: true, volume: ${normalizedVolume} };
      }
      return { success: false };
    })();
  `);
};

/**
 * Check if playback webview is initialized
 */
export const isPlaybackInitialized = () => {
  return !!getPlaybackWebview() && isPlaybackReady;
};

/**
 * Get current playlist ID
 */
export const getCurrentPlaylistId = () => currentPlaylistId;

export default {
  initPlayback,
  playSong,
  playSongByVideoId,
  getPlaybackState,
  togglePlayPause,
  nextTrack,
  prevTrack,
  seekTo,
  setVolume,
  isPlaybackInitialized,
  getCurrentPlaylistId
};
