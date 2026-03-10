import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { FiSearch, FiPlay, FiPlusCircle } from "react-icons/fi";
import { playSongByVideoIdInPlayback, getPlaybackWebview, addToQueue } from "../utils/ytMusicAPI";
import "./Search.css";

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ songs: [], albums: [] });
  const [showResults, setShowResults] = useState(false);
  const [queuedIds, setQueuedIds] = useState(new Set()); // track which songs were queued

  const handleAddToQueue = async (e, result) => {
    e.stopPropagation();
    if (!result.videoId) return;
    const res = await addToQueue(result.videoId);
    if (res?.success !== false) {
      setQueuedIds(prev => new Set([...prev, result.videoId]));
      setTimeout(() => setQueuedIds(prev => { const n = new Set(prev); n.delete(result.videoId); return n; }), 2000);
    }
  };

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

    const wv = window.ytBrowseWebview || window.ytWebview;
    if (!wv) { setLoading(false); return; }

    try {
      const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
      await wv.loadURL(searchUrl);

      setTimeout(async () => {
        const rawResults = await wv.executeJavaScript(`
          (function() {
            const items = [];
            const elements = document.querySelectorAll('ytmusic-responsive-list-item-renderer');

            elements.forEach((el, idx) => {
              if (idx >= 24) return;

              const titleEl = el.querySelector('.title');
              if (!titleEl) return;

              const title = titleEl.textContent?.trim() || '';
              if (!title) return;

              // Thumbnail
              let thumbnail = '';
              if (el.data?.thumbnail) {
                const thumbs = el.data.thumbnail.musicThumbnailRenderer?.thumbnail?.thumbnails;
                if (thumbs?.length) thumbnail = thumbs[thumbs.length-1].url;
              }
              if (!thumbnail || thumbnail.includes('data:image')) {
                const img = el.querySelector('img');
                if (img && !img.src.includes('data:image')) thumbnail = img.src;
              }
              if (thumbnail && !thumbnail.includes('data:image')) {
                thumbnail = thumbnail.replace(/=w\\d+-h\\d+/g, '=w300-h300');
              }

              // Artists / subtitle
              const artistEls = el.querySelectorAll('.secondary-flex-columns a');
              const artist = artistEls[0]?.textContent?.trim() || '';

              // Detect type: song vs album/playlist
              const link = el.querySelector('a.yt-simple-endpoint');
              const href = link?.href || link?.getAttribute('href') || '';

              // videoId => song
              let videoId = '';
              const vidMatch = href.match(/[?&]v=([^&]+)/);
              if (vidMatch) videoId = vidMatch[1];
              if (!videoId && el.data?.videoId) videoId = el.data.videoId;

              // browseId => album or playlist
              let browseId = '';
              const browseMatch = href.match(/browse\\/(MPREb_[^?&]+|MPLA[^?&]+|PL[^?&]+)/);
              if (browseMatch) browseId = browseMatch[1];
              if (!browseId && el.data?.browseId) browseId = el.data.browseId;

              // Type label shown in subtitles (Album, Single, Playlist, EP...)
              const subtitleSpan = el.querySelector('.secondary-flex-columns span');
              const typeLabel = subtitleSpan?.textContent?.trim()?.toLowerCase() || '';

              const isAlbum = !videoId && browseId && (
                browseId.startsWith('MPREb_') ||
                typeLabel === 'album' || typeLabel === 'single' || typeLabel === 'ep'
              );

              items.push({ idx, title, artist, thumbnail, videoId, browseId, isAlbum, typeLabel });
            });

            return items;
          })();
        `);

        const songs  = (rawResults || []).filter(r => r.videoId && !r.isAlbum);
        const albums = (rawResults || []).filter(r => r.isAlbum && r.browseId);

        setSearchResults({ songs, albums });
        setLoading(false);
      }, 4000);
    } catch (error) {
      console.error("Search error:", error);
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


  const songs  = searchResults.songs  || [];
  const albums = searchResults.albums || [];
  const hasResults = songs.length > 0 || albums.length > 0;

  return (
    <div className="search-page">
      {loading ? (
        <div className="search-loading">
          <div className="loading-spinner-green" />
          <p>Searching YouTube Music…</p>
        </div>
      ) : !hasResults && showResults ? (
        <div className="no-results">
          <h2 className="no-results-title">No results found</h2>
          <p className="no-results-text">Try searching with different keywords</p>
        </div>
      ) : hasResults ? (
        <div className="search-results-container">

          {/* ── Top Result + Songs ── */}
          {songs.length > 0 && (
            <div className="top-result-section">
              {/* Top result card */}
              <div
                className="top-result-card"
                onClick={() => handleResultClick(songs[0])}
              >
                <img
                  src={songs[0].thumbnail || ''}
                  alt={songs[0].title}
                  className="top-result-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <h2 className="top-result-title">{songs[0].title}</h2>
                <p className="top-result-artist">{songs[0].artist}</p>
                <span className="top-result-type">Song</span>
                <div className="top-result-play">
                  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                {songs[0].videoId && (
                  <button
                    className={`add-queue-btn ${queuedIds.has(songs[0].videoId) ? 'queued' : ''}`}
                    title="Add to queue"
                    onClick={(e) => handleAddToQueue(e, songs[0])}
                  >
                    {queuedIds.has(songs[0].videoId) ? '✓' : '+'}
                  </button>
                )}
              </div>

              {/* Songs list */}
              <div className="songs-section">
                <h2 className="section-title">Songs</h2>
                <div className="songs-list">
                  {songs.slice(0, 4).map((result, idx) => (
                    <div
                      key={idx}
                      className="song-item"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="song-item-number">{idx + 1}</div>
                      <img
                        src={result.thumbnail || ''}
                        alt={result.title}
                        className="song-item-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="song-item-info">
                        <div className="song-item-title">{result.title}</div>
                        <div className="song-item-artist">{result.artist}</div>
                      </div>
                      {result.videoId && (
                        <button
                          className={`add-queue-btn ${queuedIds.has(result.videoId) ? 'queued' : ''}`}
                          title="Add to queue"
                          onClick={(e) => handleAddToQueue(e, result)}
                        >
                          {queuedIds.has(result.videoId) ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Albums section ── */}
          {albums.length > 0 && (
            <>
              <h2 className="section-title">Albums</h2>
              <div className="results-grid">
                {albums.map((album, idx) => (
                  <div
                    key={idx}
                    className="result-card album-card"
                    onClick={() => navigate(
                      `/album/${encodeURIComponent(album.browseId)}?name=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}&cover=${encodeURIComponent(album.thumbnail)}`
                    )}
                  >
                    <img
                      src={album.thumbnail || ''}
                      alt={album.title}
                      className="result-card-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="result-card-title">{album.title}</div>
                    <div className="result-card-artist">
                      {album.typeLabel || 'Album'} • {album.artist}
                    </div>
                    <div className="result-card-play">
                      <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── More songs grid ── */}
          {songs.length > 4 && (
            <>
              <h2 className="section-title">More Songs</h2>
              <div className="results-grid">
                {songs.slice(4).map((result, idx) => (
                  <div
                    key={idx + 4}
                    className="result-card"
                    onClick={() => handleResultClick(result)}
                  >
                    <img
                      src={result.thumbnail || ''}
                      alt={result.title}
                      className="result-card-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="result-card-title">{result.title}</div>
                    <div className="result-card-artist">{result.artist}</div>
                    <div className="result-card-play">
                      <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    {result.videoId && (
                      <button
                        className={`add-queue-btn ${queuedIds.has(result.videoId) ? 'queued' : ''}`}
                        title="Add to queue"
                        onClick={(e) => handleAddToQueue(e, result)}
                      >
                        {queuedIds.has(result.videoId) ? '✓' : '+'}
                      </button>
                    )}
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
