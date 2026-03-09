import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiSearch, FiX } from "react-icons/fi";
import { searchYouTubeMusic, goToHome } from "../utils/ytMusicAPI";
import "./TopNav.css";

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownResults, setDropdownResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  const handleHomeClick = async () => {
    navigate('/');
    await goToHome();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform live search as user types
  const performLiveSearch = async (query) => {
    if (!query.trim()) {
      setDropdownResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const wv = window.ytWebview;
    if (!wv) {
      setIsSearching(false);
      return;
    }

    try {
      // Navigate within page to avoid stopping playback
      const currentUrl = await wv.executeJavaScript('window.location.href');

      if (!currentUrl || !currentUrl.includes('music.youtube.com')) {
        // Initial load
        await wv.loadURL(`https://music.youtube.com/search?q=${encodeURIComponent(query)}`);
      } else {
        // In-page navigation
        await wv.executeJavaScript(`
          (function() {
            const searchUrl = '/search?q=${encodeURIComponent(query).replace(/'/g, "\\'")}';
            if (window.location.pathname + window.location.search !== searchUrl) {
              window.history.pushState({}, '', searchUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          })();
        `);
      }


      // Wait and scrape results
      setTimeout(async () => {
        // Scroll to trigger lazy loading
        await wv.executeJavaScript(`
          (async function() {
            window.scrollTo(0, 500);
            await new Promise(resolve => setTimeout(resolve, 300));
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 300));
          })();
        `);

        const results = await wv.executeJavaScript(`
          (function() {
            const songs = [];
            const songElements = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
            
            songElements.forEach((element, idx) => {
              if (idx >= 5) return; // Limit to 5 for dropdown
              
              const titleEl = element.querySelector('.title');
              const artistEls = element.querySelectorAll('.secondary-flex-columns a');
              
              // Get thumbnail - improved method
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
                    const srcsetUrl = srcset.split(',')[0].trim().split(' ')[0];
                    if (srcsetUrl && !srcsetUrl.includes('data:image')) {
                      thumbnail = srcsetUrl;
                    }
                  }
                }
                
                // Upgrade quality
                if (thumbnail && !thumbnail.includes('data:image')) {
                  thumbnail = thumbnail.replace(/=w\d+-h\d+/g, '=w300-h300');
                }
              }
              
              if (titleEl) {
                let artist = '';
                if (artistEls && artistEls.length > 0) {
                  artist = artistEls[0].textContent?.trim() || '';
                }
                
                songs.push({
                  id: 'search_' + idx,
                  title: titleEl.textContent?.trim() || '',
                  artist: artist,
                  thumbnail: thumbnail,
                  index: idx
                });
              }
            });
            
            return songs;
          })();
        `);

        setDropdownResults(results || []);
        setShowDropdown(true);
        setIsSearching(false);
      }, 3000);
    } catch (error) {
      console.error("Error in live search:", error);
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce the search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performLiveSearch(value);
    }, 500);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleResultClick = async (result) => {
    setShowDropdown(false);
    setSearchQuery("");

    const wv = window.ytWebview;
    if (!wv) return;

    try {
      console.log('=== DROPDOWN CLICK ===');
      console.log('Title:', result.title);
      console.log('Index:', result.index);

      // Navigate to the song page and start playback (same as search results)
      const success = await wv.executeJavaScript(`
        (async function() {
          const index = ${result.index};
          const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
          
          console.log('Dropdown: Total songs:', songs.length);
          console.log('Dropdown: Clicking index:', index);
          
          if (!songs[index]) {
            console.error('Dropdown: Song not found at index', index);
            return false;
          }
          
          const song = songs[index];
          const title = song.querySelector('.title')?.textContent?.trim();
          console.log('Dropdown: Found song:', title);
          
          // Find and click the title link to navigate to song page
          const titleLink = song.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string');
          if (titleLink) {
            console.log('Dropdown: Clicking title link to navigate to song...');
            titleLink.click();
            
            // Wait longer for navigation and page load
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // On the song page, find and click the big play button
            const playButtons = [
              document.querySelector('ytmusic-player-bar tp-yt-paper-icon-button[aria-label*="Play"]'),
              document.querySelector('ytmusic-player-bar button[aria-label*="Play"]'),
              document.querySelector('#play-pause-button'),
              document.querySelector('button[aria-label="Play"]'),
              document.querySelector('.play-pause-button')
            ];
            
            for (const btn of playButtons) {
              if (btn) {
                console.log('Dropdown: Found play button, clicking...');
                btn.click();
                
                // Click it again after a short delay to ensure it sticks
                await new Promise(resolve => setTimeout(resolve, 500));
                if (btn.getAttribute('aria-label')?.includes('Play')) {
                  btn.click();
                  console.log('Dropdown: Clicked play button again to ensure playback');
                }
                break;
              }
            }
            
            return true;
          } else {
            console.error('Dropdown: Title link not found');
            return false;
          }
        })();
      `);

      console.log('Dropdown: Click result:', success);
    } catch (error) {
      console.error("Dropdown: Error:", error);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDropdownResults([]);
    setShowDropdown(false);
  };

  // Hide TopNav on Now Playing screen
  if (location.pathname === '/now-playing') {
    return null;
  }

  return (
    <div className="top-nav">
      <button
        className={`nav-home-btn ${location.pathname === '/' ? 'active' : ''}`}
        onClick={handleHomeClick}
        title="Home"
      >
        <FiHome size={28} />
      </button>

      <div className="nav-search-container" ref={searchRef}>
        <form className="nav-search-form" onSubmit={handleSearch}>
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            className="nav-search-input"
            placeholder="What do you want to play?"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery && setShowDropdown(true)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={clearSearch}
            >
              <FiX size={20} />
            </button>
          )}
        </form>

        {showDropdown && dropdownResults.length > 0 && (
          <div className="search-dropdown">
            <div className="dropdown-header">
              <span className="dropdown-tab active">Songs</span>
            </div>
            <div className="dropdown-results">
              {dropdownResults.map((result, index) => (
                <div
                  key={index}
                  className="dropdown-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <img
                    src={result.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%231a1a1a" width="40" height="40"/%3E%3C/svg%3E'}
                    alt={result.title}
                    className="dropdown-result-image"
                  />
                  <div className="dropdown-result-info">
                    <div className="dropdown-result-title">{result.title}</div>
                    <div className="dropdown-result-artist">{result.artist}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dropdown-footer">
              <button
                className="dropdown-search-all"
                onClick={() => {
                  setShowDropdown(false);
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                }}
              >
                Search for "{searchQuery}"
              </button>
            </div>
          </div>
        )}

        {isSearching && showDropdown && (
          <div className="search-dropdown">
            <div className="dropdown-loading">Searching...</div>
          </div>
        )}
      </div>
    </div>
  );
}
