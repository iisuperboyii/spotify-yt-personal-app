import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiSearch, FiHeart, FiMusic, FiSettings, FiMoreVertical } from "react-icons/fi";
import { BiLibrary } from "react-icons/bi";
import { searchYouTubeMusic, getPlaylists, goToLibrary } from "../utils/ytMusicAPI";
import { getSidebarPlaylists, removeFromSidebar } from "../utils/sidebarPlaylists";
import { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState(getSidebarPlaylists());
  const [showMenu, setShowMenu] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Add/remove body class when collapsed state changes
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  const handleLikedSongsClick = () => {
    // Navigate to Liked Songs playlist view
    navigate('/playlist/LM?name=Liked Songs&creator=You');
  };

  const handleRemovePlaylist = (playlistId) => {
    removeFromSidebar(playlistId);
    setPlaylists(getSidebarPlaylists());
    setShowMenu(null);
  };

  // Fetch real playlists from YouTube Music
  useEffect(() => {
    const fetchRealPlaylists = async () => {
      try {
        console.log('Sidebar: Starting playlist fetch...');
        // Navigate to library first
        await goToLibrary();
        console.log('Sidebar: Navigated to library');

        // Wait for page to load
        setTimeout(async () => {
          try {
            console.log('Sidebar: Fetching playlists from DOM...');
            const realPlaylists = await getPlaylists();
            console.log('Sidebar: Playlists received:', realPlaylists?.length || 0);

            if (realPlaylists && Array.isArray(realPlaylists) && realPlaylists.length > 0) {
              // Map real playlists to our format with safety checks
              const mappedPlaylists = realPlaylists.slice(0, 10).map((playlist) => {
                // Extract creator from description
                let creator = "Playlist";
                if (playlist.description) {
                  const desc = String(playlist.description).toLowerCase();
                  if (desc.includes("you") || desc.includes("your")) {
                    creator = "You";
                  } else {
                    // Try to extract creator name from description
                    creator = playlist.description.split("•")[0]?.trim() || "Playlist";
                  }
                }

                return {
                  name: playlist.title || "Untitled Playlist",
                  thumbnail: playlist.thumbnail || "",
                  query: playlist.title || "playlist",
                  id: playlist.id || "",
                  creator: creator
                };
              });

              setPlaylists(mappedPlaylists);
            }
          } catch (error) {
            console.error("Error fetching playlists:", error);
            // Keep default playlists on error
          }
        }, 5000); // Increased wait time
      } catch (error) {
        console.error("Error navigating to library:", error);
      }
    };

    // Fetch playlists after component mounts
    const timer = setTimeout(fetchRealPlaylists, 3000); // Wait for webview

    return () => clearTimeout(timer);
  }, []);

  const handlePlaylistClick = async (playlist) => {
    if (playlist && playlist.id) {
      // Navigate to playlist view page
      navigate(`/playlist/${playlist.id}?name=${encodeURIComponent(playlist.name)}&creator=${encodeURIComponent(playlist.creator)}`);
    } else {
      // Fallback to search if no ID
      await searchYouTubeMusic(playlist.query);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Toggle Button + Library Link */}
      <div className="sidebar-header-row">
        <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? "Expand your library" : "Collapse your library"}>
          <svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.134A1 1 0 0 0 14 3v18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.464a1 1 0 0 0-.5-.866l-6-3.464zM9 2a1 1 0 0 0-1 1v18a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1z"></path>
          </svg>
        </button>
        {!isCollapsed && (
          <span className="toggle-text" onClick={() => navigate('/library')} style={{ cursor: 'pointer' }}>
            Your Library
          </span>
        )}
      </div>

      {/* Library Section */}
      <div className="sidebar-library">
        {!isCollapsed && (
          <div className="sidebar-library-header">
            <div className="sidebar-item" style={{ cursor: "pointer" }} onClick={handleLikedSongsClick}>
              <FiHeart size={20} />
              <span>Liked Songs</span>
            </div>
          </div>
        )}

        {/* Playlists */}
        <div className="sidebar-playlists">
          {playlists.map((playlist, idx) => (
            <div
              key={idx}
              className="sidebar-playlist-item"
              style={{ position: 'relative' }}
            >
              <div
                className="playlist-item-content"
                onClick={() => handlePlaylistClick(playlist)}
                title={isCollapsed ? playlist.name : ''}
              >
                <div className="playlist-cover">
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name || "Playlist"}
                      onError={(e) => {
                        // Hide image on error and show placeholder
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="playlist-cover-placeholder"
                    style={{ display: playlist.thumbnail ? 'none' : 'flex' }}
                  >
                    <FiMusic size={20} />
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="playlist-info">
                    <span className="playlist-name">{playlist.name || "Untitled"}</span>
                    <span className="playlist-creator">{playlist.creator || "Playlist"}</span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <>
                  {/* 3-dot menu button */}
                  <button
                    className="playlist-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === playlist.id ? null : playlist.id);
                    }}
                  >
                    <FiMoreVertical size={16} />
                  </button>

                  {/* Menu dropdown */}
                  {showMenu === playlist.id && (
                    <div className="playlist-menu-dropdown">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlaylist(playlist.id);
                        }}
                      >
                        Remove from sidebar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings at bottom */}

    </div >
  );
}
