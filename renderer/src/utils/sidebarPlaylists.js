// Sidebar playlist management utilities

const SIDEBAR_PLAYLISTS_KEY = 'sidebar_playlists';

/**
 * Get playlists pinned to sidebar
 */
export const getSidebarPlaylists = () => {
  try {
    const stored = localStorage.getItem(SIDEBAR_PLAYLISTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading sidebar playlists:', error);
  }

  // Default playlists
  return [
    { name: "Discover Weekly", thumbnail: "", query: "discover weekly", creator: "Spotify", id: "default_1" },
    { name: "Release Radar", thumbnail: "", query: "release radar", creator: "Spotify", id: "default_2" },
    { name: "Chill Vibes", thumbnail: "", query: "chill vibes", creator: "You", id: "default_3" },
  ];
};

/**
 * Save playlists to sidebar
 */
export const saveSidebarPlaylists = (playlists) => {
  try {
    localStorage.setItem(SIDEBAR_PLAYLISTS_KEY, JSON.stringify(playlists));
    return true;
  } catch (error) {
    console.error('Error saving sidebar playlists:', error);
    return false;
  }
};

/**
 * Add playlist to sidebar
 */
export const addToSidebar = (playlist) => {
  const playlists = getSidebarPlaylists();

  // Check if already exists
  const exists = playlists.some(p => p.id === playlist.id);
  if (exists) {
    return false;
  }

  playlists.push(playlist);
  return saveSidebarPlaylists(playlists);
};

/**
 * Remove playlist from sidebar
 */
export const removeFromSidebar = (playlistId) => {
  const playlists = getSidebarPlaylists();
  const filtered = playlists.filter(p => p.id !== playlistId);
  return saveSidebarPlaylists(filtered);
};

/**
 * Check if playlist is in sidebar
 */
export const isInSidebar = (playlistId) => {
  const playlists = getSidebarPlaylists();
  return playlists.some(p => p.id === playlistId);
};
