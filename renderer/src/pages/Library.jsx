import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMusic } from "react-icons/fi";
import { goToLibrary, getPlaylists } from "../utils/ytMusicAPI";
import "./Library.css";

export default function Library() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("playlists");
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigate to YouTube Music library on mount
  useEffect(() => {
    goToLibrary();
  }, []);

  // Fetch playlists
  useEffect(() => {
    const fetchLibraryData = async () => {
      setLoading(true);

      const pollForContent = async (selector, maxAttempts = 10) => {
        const wv = window.ytWebview;
        if (!wv) return [];

        for (let i = 0; i < maxAttempts; i++) {
          const count = await wv.executeJavaScript(`document.querySelectorAll('${selector}').length`);
          if (count > 0) return true; // Content found
          await new Promise(r => setTimeout(r, 500));
        }
        return false; // Timed out
      };

      try {
        const wv = window.ytWebview;
        if (!wv) return;

        if (activeTab === "playlists") {
          await goToLibrary();
          await pollForContent('ytmusic-two-row-item-renderer'); // Wait for content

          const fetchedPlaylists = await getPlaylists();
          if (fetchedPlaylists && fetchedPlaylists.length > 0) {
            setPlaylists(fetchedPlaylists);
          }
          setLoading(false);

        } else if (activeTab === "artists") {
          // Navigate within page to avoid stopping playback
          const currentUrl = await wv.executeJavaScript('window.location.href');
          if (!currentUrl.includes('/library/artists')) {
            await wv.executeJavaScript(`
              (function() {
                const artistsUrl = '/library/artists';
                if (window.location.pathname !== artistsUrl) {
                  window.history.pushState({}, '', artistsUrl);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              })();
            `);
            // Give it a moment to start loading
            await new Promise(r => setTimeout(r, 1000));
          }


          await pollForContent('ytmusic-two-row-item-renderer');

          const fetchedArtists = await wv.executeJavaScript(`
                (function() {
                  const artists = [];
                  const artistElements = document.querySelectorAll('ytmusic-two-row-item-renderer');
                  
                  artistElements.forEach((el, idx) => {
                    const titleEl = el.querySelector('.title');
                    const thumbnailEl = el.querySelector('img');
                    const linkEl = el.querySelector('a');
                    
                    if (titleEl) {
                      let artistId = '';
                      if (linkEl && linkEl.href) {
                        const match = linkEl.href.match(/channel\\/([^?]+)/);
                        if (match) artistId = match[1];
                      }
                      
                      artists.push({
                        id: artistId || 'artist_' + idx,
                        name: titleEl.textContent?.trim() || '',
                        thumbnail: thumbnailEl?.src || ''
                      });
                    }
                  });
                  
                  return artists;
                })();
              `);

          if (fetchedArtists && fetchedArtists.length > 0) {
            setArtists(fetchedArtists);
          }
          setLoading(false);

        } else if (activeTab === "albums") {
          const currentUrl = await wv.executeJavaScript('window.location.href');
          if (!currentUrl.includes('/library/albums')) {
            await wv.executeJavaScript(`
              (function() {
                const albumsUrl = '/library/albums';
                if (window.location.pathname !== albumsUrl) {
                  window.history.pushState({}, '', albumsUrl);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              })();
            `);
            await new Promise(r => setTimeout(r, 1000));
          }


          await pollForContent('ytmusic-two-row-item-renderer');

          const fetchedAlbums = await wv.executeJavaScript(`
                (function() {
                  const albums = [];
                  const albumElements = document.querySelectorAll('ytmusic-two-row-item-renderer');
                  
                  albumElements.forEach((el, idx) => {
                    const titleEl = el.querySelector('.title');
                    const subtitleEl = el.querySelector('.subtitle');
                    const thumbnailEl = el.querySelector('img');
                    const linkEl = el.querySelector('a');
                    
                    if (titleEl) {
                      let albumId = '';
                      if (linkEl && linkEl.href) {
                        const match = linkEl.href.match(/browse\\/([^?]+)/);
                        if (match) albumId = match[1];
                      }
                      
                      albums.push({
                        id: albumId || 'album_' + idx,
                        title: titleEl.textContent?.trim() || '',
                        artist: subtitleEl?.textContent?.trim() || '',
                        thumbnail: thumbnailEl?.src || ''
                      });
                    }
                  });
                  
                  return albums;
                })();
              `);

          if (fetchedAlbums && fetchedAlbums.length > 0) {
            setAlbums(fetchedAlbums);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching library data:", error);
        setLoading(false);
      }
    };

    fetchLibraryData();
  }, [activeTab]);

  const handleItemClick = (item) => {
    if (activeTab === "playlists" && item.id) {
      navigate(`/playlist/${item.id}?name=${encodeURIComponent(item.title)}&creator=${encodeURIComponent(item.description || 'You')}`);
    } else if (activeTab === "artists" && item.id) {
      // Navigate to artist page using in-page navigation
      const wv = window.ytWebview;
      if (wv) {
        wv.executeJavaScript(`
          (function() {
            const channelUrl = '/channel/${item.id}';
            if (window.location.pathname !== channelUrl) {
              window.history.pushState({}, '', channelUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          })();
        `);
      }
    } else if (activeTab === "albums" && item.id) {
      // Navigate to album page using in-page navigation
      const wv = window.ytWebview;
      if (wv) {
        wv.executeJavaScript(`
          (function() {
            const browseUrl = '/browse/${item.id}';
            if (window.location.pathname !== browseUrl) {
              window.history.pushState({}, '', browseUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          })();
        `);
      }
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="library-loading">
          <div className="loading-spinner">🎵</div>
          <p>Loading {activeTab}...</p>
        </div>
      );
    }

    const items = activeTab === "playlists" ? playlists : activeTab === "artists" ? artists : albums;

    if (items.length === 0) {
      return (
        <div className="library-empty">
          <FiMusic size={64} color="#666" />
          <h3>No {activeTab} found</h3>
          <p>Your {activeTab} will appear here once you add them in YouTube Music</p>
        </div>
      );
    }

    return (
      <div className="library-grid">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="library-card"
            onClick={() => handleItemClick(item)}
          >
            <div className="library-card-cover">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title || item.name} />
              ) : (
                <div className="cover-placeholder">
                  <FiMusic size={48} />
                </div>
              )}
            </div>
            <div className="library-card-info">
              <h4>{item.title || item.name}</h4>
              {activeTab === "playlists" && <p>{item.description || "Playlist"}</p>}
              {activeTab === "albums" && <p>{item.artist}</p>}
              {activeTab === "artists" && <p>Artist</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-title">Your Library</h1>
        <div className="library-filters">
          <button
            className={`filter-btn ${activeTab === "playlists" ? "active" : ""}`}
            onClick={() => setActiveTab("playlists")}
          >
            Playlists
          </button>
          <button
            className={`filter-btn ${activeTab === "artists" ? "active" : ""}`}
            onClick={() => setActiveTab("artists")}
          >
            Artists
          </button>
          <button
            className={`filter-btn ${activeTab === "albums" ? "active" : ""}`}
            onClick={() => setActiveTab("albums")}
          >
            Albums
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
