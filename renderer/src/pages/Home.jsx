import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchYouTubeMusic, goToHome, playSongByVideoIdInPlayback, playSongInPlayback } from "../utils/ytMusicAPI";
import { generateColorFromText } from "../utils/colorExtractor";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [madeForYou, setMadeForYou] = useState([]);

  // Fetch recently played from YouTube Music with better scraping
  useEffect(() => {
    const fetchRecentlyPlayed = async () => {
      const wv = window.ytWebview;
      if (!wv) {
        console.log('No webview available, using fallback');
        fallbackData();
        return;
      }

      try {
        console.log('Fetching recently played...');
        const currentURL = wv.getURL();
        console.log('Current webview URL:', currentURL);

        // Only navigate if we're not on YouTube Music at all
        // Don't navigate if music is playing to avoid stopping it
        if (!currentURL || !currentURL.includes('music.youtube.com')) {
          console.log('Not on YouTube Music, navigating to home...');
          await goToHome();
          // Wait for page to load
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('Already on YouTube Music, scraping current page...');
          // Just wait a bit for any lazy loading
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Extract recently played items from the first carousel
        const items = await wv.executeJavaScript(`
          (function() {
            return new Promise((resolve) => {
              try {
                // Scroll to trigger lazy loading
                window.scrollBy(0, 400);
                
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  
                  setTimeout(() => {
                    // YTM structure: look for the first shelf
                    const shelves = document.querySelectorAll('ytmusic-carousel-shelf-renderer, ytmusic-shelf-renderer');
                    
                    if (shelves.length > 0) {
                      const firstShelf = shelves[0];
                      const items = firstShelf.querySelectorAll('ytmusic-two-row-item-renderer, ytmusic-responsive-list-item-renderer');
                      
                      const results = Array.from(items).slice(0, 8).map((item, index) => {
                        const titleEl = item.querySelector('.title, .text');
                        const subtitleEl = item.querySelector('.subtitle, .secondary-text');
                        
                        let imgUrl = '';
                        const img = item.querySelector('img');
                        if (img && img.src) {
                          const src = img.src;
                          if (src.startsWith('http') && !src.includes('data:image')) {
                            imgUrl = src;
                          }
                        }
                        
                        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
                        const subtitle = subtitleEl ? subtitleEl.textContent.trim() : 'Unknown Artist';
                        
                        const subtitleLower = subtitle.toLowerCase();
                        let itemType = 'song';
                        if (subtitleLower.includes('album')) {
                          itemType = 'album';
                        } else if (subtitleLower.includes('playlist')) {
                          itemType = 'playlist';
                        } else if (subtitleLower.includes('artist')) {
                          itemType = 'artist';
                        }
                        
                        let browseId = '';
                        let playlistId = '';
                        const link = item.querySelector('a');
                        if (link && link.href) {
                          const url = link.href;
                          const playlistMatch = url.match(/[?&]list=([^&]+)/);
                          if (playlistMatch) {
                            playlistId = playlistMatch[1];
                          }
                          const browseMatch = url.match(/browse\\/([^?&]+)/);
                          if (browseMatch) {
                            browseId = browseMatch[1];
                          }
                        }
                        
                        return {
                          title,
                          artist: subtitle,
                          image: imgUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%231a1a1a" width="150" height="150"/%3E%3C/svg%3E',
                          index: index,
                          type: itemType,
                          browseId: browseId,
                          playlistId: playlistId
                        };
                      });
                      
                      resolve(results);
                    } else {
                      resolve([]);
                    }
                  }, 1500);
                }, 1000);
              } catch (e) {
                resolve([]);
              }
            });
          })();
        `);

        console.log('Scraped items:', items);

        if (items && items.length > 0) {
          console.log('Setting recently played with scraped data');
          setRecentlyPlayed(items);
        } else {
          console.log('No items scraped, using fallback');
          fallbackData();
        }
      } catch (error) {
        console.error("Error fetching recently played:", error);
        fallbackData();
      }
    };

    fetchRecentlyPlayed();
  }, []);

  const fallbackData = () => {
    setRecentlyPlayed([
      { title: "Currents", artist: "Tame Impala", image: "https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d79", query: "currents tame impala" },
      { title: "SUMMER BREAK 25", artist: "Playlist", image: "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647", query: "summer break playlist" },
      { title: "Mumblecore", artist: "Playlist", image: "https://i.scdn.co/image/ab67616d0000b2734ae1c4c5c45aabe565499163", query: "mumblecore playlist" },
      { title: "Hiwang hiwang tone Niwa", artist: "Playlist", image: "https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0", query: "hiwang playlist" },
      { title: "LET THE WORLD BURN", artist: "Chris Grey", image: "https://i.scdn.co/image/ab67616d0000b273a935e4689f15953311772cc4", query: "let the world burn chris grey" },
      { title: "Phonk and Play", artist: "Playlist", image: "https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856", query: "phonk playlist" },
      { title: "Heaven Or Hell", artist: "Don Toliver", image: "https://i.scdn.co/image/ab67616d0000b273d6e0da7a49b0e4d96f5d7c1d", query: "heaven or hell don toliver" },
      { title: "Cigarettes After Sex", artist: "Cigarettes After Sex", image: "https://i.scdn.co/image/ab67616d0000b273879e9318cb9f4e05ee552ac9", query: "cigarettes after sex" },
    ]);
  };


  // Fetch Quick Picks for "Made For You" section
  useEffect(() => {
    const fetchQuickPicks = async () => {
      console.log('[Quick Picks] Starting fetch...');
      const wv = window.ytWebview;
      if (!wv) {
        console.log('[Quick Picks] No webview available');
        return;
      }

      try {
        console.log('[Quick Picks] Webview found, waiting 5 seconds for page load...');

        // Wait even longer for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('[Quick Picks] Executing JavaScript in webview...');

        const picks = await wv.executeJavaScript(`
          (function() {
            // IMMEDIATE log to verify script is running
            console.log('[YTM] ===== SCRIPT STARTED =====');
            console.log('[YTM] Current URL:', window.location.href);
            console.log('[YTM] Quick Picks scraper started');
            
            try {
              // Try multiple selectors for shelves
              const shelves = document.querySelectorAll('ytmusic-carousel-shelf-renderer, ytmusic-shelf-renderer');
              console.log('[YTM] Found', shelves.length, 'total shelves');
              
              // Log all shelf headers for debugging
              const allHeaders = [];
              shelves.forEach((shelf, i) => {
                const header = shelf.querySelector('.shelf-title, ytmusic-carousel-shelf-basic-header-renderer, .title');
                const headerText = header ? header.textContent.trim() : 'No header';
                allHeaders.push({index: i, header: headerText});
                console.log('[YTM] Shelf', i, ':', headerText);
              });
              
              let results = [];
              
              // Try to find any shelf with playlist items (two-row items)
              for (let i = 0; i < shelves.length; i++) {
                const shelf = shelves[i];
                const items = shelf.querySelectorAll('ytmusic-two-row-item-renderer');
                
                if (items.length >= 3) { // Need at least 3 items
                  console.log('[YTM] Found shelf with', items.length, 'playlist items at index', i);
                  
                  // Check if these look like playlists (have thumbnails and titles)
                  const firstItem = items[0];
                  const hasImage = firstItem.querySelector('img');
                  const hasTitle = firstItem.querySelector('.title');
                  
                  if (hasImage && hasTitle) {
                    console.log('[YTM] Using shelf', i, 'for Quick Picks');
                    
                    // Extract playlist data
                    results = Array.from(items).slice(0, 5).map((item, index) => {
                      const titleEl = item.querySelector('.title');
                      const subtitleEl = item.querySelector('.subtitle');
                      
                      let imgUrl = '';
                      const img = item.querySelector('img');
                      if (img) {
                        // Try multiple image sources
                        imgUrl = img.src || img.getAttribute('src') || '';
                        if (!imgUrl || imgUrl.includes('data:image')) {
                          imgUrl = img.getAttribute('data-src') || '';
                        }
                      }
                      
                      const link = item.querySelector('a');
                      let playlistId = '';
                      if (link && link.href) {
                        const match = link.href.match(/[?&]list=([^&]+)/);
                        if (match) playlistId = match[1];
                      }
                      
                      const title = titleEl ? titleEl.textContent.trim() : 'Mix ' + (index + 1);
                      const description = subtitleEl ? subtitleEl.textContent.trim() : 'Personalized for you';
                      
                      console.log('[YTM] Item', index, ':', title, '| Image:', imgUrl ? 'Yes' : 'No');
                      
                      return {
                        title,
                        description,
                        image: imgUrl,
                        playlistId,
                        type: 'playlist'
                      };
                    });
                    
                    break;
                  }
                }
              }
              
              if (results.length === 0) {
                console.log('[YTM] No suitable playlists found. Available shelves:', allHeaders);
              } else {
                console.log('[YTM] Successfully scraped', results.length, 'playlists');
              }
              
              console.log('[YTM] ===== SCRIPT COMPLETE =====');
              return results;
            } catch (e) {
              console.error('[YTM] Error:', e);
              return [];
            }
          })();
        `);

        console.log('[Quick Picks] Result:', picks);

        if (picks && picks.length > 0) {
          setMadeForYou(picks);
          console.log('[Quick Picks] Set', picks.length, 'items to state');
        } else {
          console.log('[Quick Picks] No items found. Using Recently Played playlists as fallback.');
          // Fallback: use Recently Played items that are playlists
          setTimeout(() => {
            const playlistItems = recentlyPlayed.filter(item =>
              item.type === 'playlist' ||
              item.artist?.toLowerCase().includes('playlist') ||
              item.playlistId
            ).slice(0, 5).map(item => ({
              title: item.title,
              description: item.artist || 'Playlist',
              image: item.image,
              playlistId: item.playlistId,
              type: 'playlist'
            }));

            if (playlistItems.length > 0) {
              setMadeForYou(playlistItems);
              console.log('[Quick Picks] Using', playlistItems.length, 'Recently Played playlists as fallback');
            }
          }, 1000); // Wait for Recently Played to load
        }
      } catch (error) {
        console.error('[Quick Picks] Error:', error);
      }
    };

    // Delay initial fetch to ensure webview is ready
    const timer = setTimeout(fetchQuickPicks, 3000);
    return () => clearTimeout(timer);
  }, [recentlyPlayed]); // Add dependency on recentlyPlayed


  const handleItemClick = async (item) => {
    const wv = window.ytBrowseWebview || window.ytWebview;

    try {
      // Handle playlists - play first song using playback webview
      if (item.type === 'playlist' && item.playlistId) {
        console.log('[Home] Playing playlist:', item.playlistId);
        // Play first song in playback webview
        await playSongInPlayback(item.playlistId, 0);
        // Navigate to playlist view in UI
        navigate(`/playlist/${item.playlistId}?name=${encodeURIComponent(item.title)}&creator=${encodeURIComponent(item.artist)}`);
        return;
      }

      // Handle albums - navigate to the album in YouTube Music webview
      if (item.type === 'album' && item.browseId && wv) {
        await wv.executeJavaScript(`
          (function() {
            const browseUrl = '/browse/${item.browseId}';
            if (window.location.pathname !== browseUrl) {
              window.history.pushState({}, '', browseUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          })();
        `);
        return;
      }

      // Handle artists - navigate to artist page
      if (item.type === 'artist' && item.browseId && wv) {
        await wv.executeJavaScript(`
          (function() {
            const browseUrl = '/browse/${item.browseId}';
            if (window.location.pathname !== browseUrl) {
              window.history.pushState({}, '', browseUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          })();
        `);
        return;
      }

      // Handle songs - click in browse webview (fallback, as songs should have videoId)
      if (typeof item.index !== 'undefined' && wv) {
        await wv.executeJavaScript(`
          (function() {
            try {
              const shelves = document.querySelectorAll('ytmusic-carousel-shelf-renderer, ytmusic-shelf-renderer');
              if (shelves.length > 0) {
                const firstShelf = shelves[0];
                const items = firstShelf.querySelectorAll('ytmusic-two-row-item-renderer, ytmusic-responsive-list-item-renderer');
                const targetItem = items[${item.index}];
                
                if (targetItem) {
                  // Try to find the overlay play button
                  const playOverlay = targetItem.querySelector('.icon, .play-button, ytmusic-play-button-renderer');
                  if (playOverlay) {
                    playOverlay.click();
                    return true;
                  } else {
                    // Fallback to clicking the item itself
                    targetItem.click();
                    return true;
                  }
                }
              }
              return false;
            } catch(e) { return false; }
          })();
        `);
      } else if (item.query) {
        await searchYouTubeMusic(item.query);
      }
    } catch (error) {
      console.error("Error handling item click:", error);
    }
  };

  const getGradientColor = (title, artist) => {
    const color = generateColorFromText(`${title}-${artist}`);
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  };

  // Get the gradient color for the currently hovered item
  const currentGradient = hoveredIndex !== null && recentlyPlayed[hoveredIndex]
    ? getGradientColor(recentlyPlayed[hoveredIndex].title, recentlyPlayed[hoveredIndex].artist)
    : 'rgb(83, 83, 83)';

  return (
    <div
      className="home-page"
      style={{
        '--gradient-color': currentGradient
      }}
    >
      <div className="home-content">
        {/* Recently Played Section */}
        <section className="recently-played-section">
          <div className="section-header">
            <h2 className="section-title">Recently Played</h2>
          </div>
          <div className="recently-played-grid">
            {recentlyPlayed.map((item, index) => (
              <div
                key={index}
                className="recent-item"
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <img
                  className="recent-item-image"
                  src={item.image}
                  alt={item.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%231a1a1a" width="80" height="80"/%3E%3C/svg%3E';
                  }}
                />
                <div className="recent-item-info">
                  <div className="recent-item-title">{item.title}</div>
                  <div className="recent-item-artist">{item.artist}</div>
                </div>
                <div className="recent-item-play">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* Made For You Section - Only show when loaded */}
        {madeForYou.length > 0 && (
          <section className="made-for-you-section">
            <div className="section-header">
              <h2 className="section-title">Made For You</h2>
              <span className="show-all">Show all</span>
            </div>
            <div className="made-for-you-scroll">
              {madeForYou.map((item, index) => (
                <div
                  key={index}
                  className="made-for-you-card"
                  onClick={() => handleItemClick(item)}
                >
                  <img
                    className="made-for-you-image"
                    src={item.image}
                    alt={item.title}
                  />
                  <div className="made-for-you-title">{item.title}</div>
                  <div className="made-for-you-description">{item.description}</div>
                  <div className="made-for-you-play">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
