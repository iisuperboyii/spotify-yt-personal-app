import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { FiSearch, FiPlay } from "react-icons/fi";
import { playSongByVideoIdInPlayback, getPlaybackWebview } from "../utils/ytMusicAPI";
import "./Search.css";

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Auto-search when URL has query parameter
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setShowResults(true);

    // Use browse webview for search navigation
    const wv = window.ytBrowseWebview || window.ytWebview;
    if (!wv) {
      setLoading(false);
      return;
    }

    try {
      console.log('Searching:', searchQuery);

      // Always use loadURL for reliable search navigation
      const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
      console.log('Navigating browse webview to:', searchUrl);
      await wv.loadURL(searchUrl);

      // Wait for results to load
      setTimeout(async () => {
        // Try to get thumbnails from YouTube Music's internal data
        const results = await wv.executeJavaScript(`
      (function () {
        const songs = [];
        const songElements = document.querySelectorAll('ytmusic-responsive-list-item-renderer');

        songElements.forEach((element, idx) => {
          if (idx >= 20) return;

          const titleEl = element.querySelector('.title');
          const artistEls = element.querySelectorAll('.secondary-flex-columns a');

          // Get thumbnail - try to extract from element's data
          let thumbnail = '';

          // Method 1: Check if element has thumbnail data in its properties
          if (element.data && element.data.thumbnail) {
            const thumbs = element.data.thumbnail.musicThumbnailRenderer?.thumbnail?.thumbnails;
            if (thumbs && thumbs.length > 0) {
              thumbnail = thumbs[thumbs.length - 1].url; // Get highest quality
            }
          }

          // Method 2: Look for yt-img-shadow component
          if (!thumbnail || thumbnail.includes('data:image')) {
            const ytImg = element.querySelector('yt-img-shadow img');
            if (ytImg) {
              // Try to get from various attributes
              thumbnail = ytImg.src;

              if (thumbnail.includes('data:image') || thumbnail.includes('1x1')) {
                thumbnail = ytImg.getAttribute('data-src') ||
                  ytImg.getAttribute('srcset')?.split(',').pop()?.trim().split(' ')[0] ||
                  '';
              }
            }
          }

          // Method 3: Fallback to any img in the thumbnail area
          if (!thumbnail || thumbnail.includes('data:image')) {
            const musicThumbnail = element.querySelector('ytmusic-thumbnail-renderer img, #img img');
            if (musicThumbnail && musicThumbnail.src && !musicThumbnail.src.includes('data:image')) {
              thumbnail = musicThumbnail.src;
            }
          }

          // Upgrade quality if we have a real URL
          if (thumbnail && !thumbnail.includes('data:image')) {
            thumbnail = thumbnail.replace(/=w\d+-h\d+/g, '=w300-h300');
          }

          if (titleEl) {
            let artist = '';
            if (artistEls && artistEls.length > 0) {
              artist = artistEls[0].textContent?.trim() || '';
            }

            // Extract video ID from the title link href (handles both full and relative URLs)
            const titleLink = element.querySelector('a.yt-simple-endpoint');
            let videoId = '';
            if (titleLink) {
              const href = titleLink.href || titleLink.getAttribute('href') || '';
              // Try multiple patterns for video ID
              let match = href.match(/[?&]v=([^&]+)/);
              if (!match) match = href.match(/watch\?v=([^&]+)/);
              if (!match) match = href.match(/v=([a-zA-Z0-9_-]{11})/);
              if (match) videoId = match[1];
              console.log('Search result href:', href, 'videoId:', videoId);
            }

            songs.push({
              id: 'search_' + idx,
              videoId: videoId,
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

        console.log('Search results:', results);
        console.log('First result thumbnail:', results[0]?.thumbnail);
        setSearchResults(results || []);
        setLoading(false);
      }, 4000);
    } catch (error) {
      console.error("Error searching:", error);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    performSearch(query);
  };

  const handleResultClick = async (result) => {
    console.log('=== CLICKING SEARCH RESULT ===');
    console.log('Title:', result.title);
    console.log('VideoId:', result.videoId);
    console.log('Index:', result.index);

    // Use playback webview for persistent playback
    if (result.videoId) {
      const success = await playSongByVideoIdInPlayback(result.videoId);
      console.log('playSongByVideoIdInPlayback result:', success);
      return;
    }

    // Fallback: Extract video ID from browse webview, then play in playback webview
    const wv = window.ytBrowseWebview || window.ytWebview;
    if (!wv) return;

    try {
      // Extract video ID from the song element in browse webview
      const videoId = await wv.executeJavaScript(`
      (function () {
        const index = ${ result.index };
        const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
        if (songs[index]) {
          const titleLink = songs[index].querySelector('a.yt-simple-endpoint');
          if (titleLink) {
            const href = titleLink.href || titleLink.getAttribute('href') || '';
            let match = href.match(/[?&]v=([^&]+)/);
            if (!match) match = href.match(/watch\\?v=([^&]+)/);
            if (match) return match[1];
          }
        }
        return null;
      })();
    `);

      if (videoId) {
        console.log('Extracted videoId from browse webview:', videoId);
        const success = await playSongByVideoIdInPlayback(videoId);
        console.log('playSongByVideoIdInPlayback result:', success);
      } else {
        // Last resort: click in browse webview (will stop current playback)
        console.warn('Could not extract videoId, clicking in browse webview');
        await wv.executeJavaScript(`
      (function () {
        const index = ${ result.index };
        const songs = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
        if (songs[index]) {
          const titleLink = songs[index].querySelector('a.yt-simple-endpoint');
          if (titleLink) titleLink.click();
        }
      })();
    `);
      }
    } catch (error) {
      console.error("Error clicking song:", error);
    }
  };




  return (
    <div className="search-page">
      {/* Category Tabs */}
      <div className="search-tabs">
        <button className="search-tab active">All</button>
        <button className="search-tab">Artists</button>
        <button className="search-tab">Albums</button>
        <button className="search-tab">Songs</button>
        <button className="search-tab">Playlists</button>
      </div>

      {loading ? (
        <div className="search-loading">
          <p>Searching YouTube Music...</p>
        </div>
      ) : searchResults.length === 0 && showResults ? (
        <div className="no-results">
          <h2 className="no-results-title">No results found</h2>
          <p className="no-results-text">Try searching with different keywords</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="search-results-container">
          {/* Top Result + Songs Section */}
          <div className="top-result-section">
            {/* Top Result */}
            <div
              className="top-result-card"
              onClick={() => handleResultClick(searchResults[0])}
            >
              <img
                src={searchResults[0].thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="92" height="92"%3E%3Crect fill="%23333" width="92" height="92"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'}
                alt={searchResults[0].title}
                className="top-result-image"
                onError={(e) => {
                  console.error('Top result image failed to load:', searchResults[0].thumbnail);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="92" height="92"%3E%3Crect fill="%23333" width="92" height="92"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
              <h2 className="top-result-title">{searchResults[0].title}</h2>
              <p className="top-result-artist">{searchResults[0].artist}</p>
              <span className="top-result-type">Song</span>
              <div className="top-result-play">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Songs List */}
            <div className="songs-section">
              <h2 className="section-title">Songs</h2>
              <div className="songs-list">
                {searchResults.slice(0, 4).map((result, idx) => (
                  <div
                    key={idx}
                    className="song-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="song-item-number">{idx + 1}</div>
                    <img
                      src={result.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23333" width="40" height="40"/%3E%3C/svg%3E'}
                      alt={result.title}
                      className="song-item-image"
                    />
                    <div className="song-item-info">
                      <div className="song-item-title">{result.title}</div>
                      <div className="song-item-artist">{result.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* All Results Grid */}
          {searchResults.length > 4 && (
            <>
              <h2 className="section-title">All Results</h2>
              <div className="results-grid">
                {searchResults.slice(4).map((result, idx) => (
                  <div
                    key={idx + 4}
                    className="result-card"
                    onClick={() => handleResultClick(result)}
                  >
                    <img
                      src={result.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="180"%3E%3Crect fill="%23333" width="180" height="180"/%3E%3C/svg%3E'}
                      alt={result.title}
                      className="result-card-image"
                    />
                    <div className="result-card-title">{result.title}</div>
                    <div className="result-card-artist">{result.artist}</div>
                    <div className="result-card-play">
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
