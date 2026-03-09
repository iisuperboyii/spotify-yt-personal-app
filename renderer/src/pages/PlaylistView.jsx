import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlay, FiClock } from "react-icons/fi";
import { getPlaylistSongs, playSongInPlayback } from "../utils/ytMusicAPI";
import "./PlaylistView.css";

// Text scramble utility
const scrambleText = (element, finalText, duration = 800) => {
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const steps = 20;
  const stepDuration = duration / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    if (currentStep >= steps) {
      element.textContent = finalText;
      clearInterval(interval);
      return;
    }

    const progress = currentStep / steps;
    let scrambled = '';

    for (let i = 0; i < finalText.length; i++) {
      if (Math.random() < progress) {
        scrambled += finalText[i];
      } else {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    element.textContent = scrambled;
    currentStep++;
  }, stepDuration);

  return interval;
};

export default function PlaylistView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSong, setHoveredSong] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const scrambleIntervals = useRef({});

  // Add/remove body class when hovering to hide sidebar
  useEffect(() => {
    if (hoveredSong !== null) {
      document.body.classList.add('playlist-song-hovered');
    } else {
      document.body.classList.remove('playlist-song-hovered');
    }
    return () => {
      document.body.classList.remove('playlist-song-hovered');
    };
  }, [hoveredSong]);

  useEffect(() => {
    const fetchPlaylistData = async () => {
      setLoading(true);

      try {
        // Get playlist songs
        const playlistSongs = await getPlaylistSongs(id);

        if (playlistSongs && playlistSongs.length > 0) {
          // Upgrade thumbnails to high quality
          const highQualitySongs = playlistSongs.map(song => ({
            ...song,
            thumbnail: song.thumbnail
              ? song.thumbnail.replace(/w\d+-h\d+/, 'w544-h544').replace(/s\d+/, 's544')
              : song.thumbnail
          }));

          setSongs(highQualitySongs);

          // Set playlist info from first song or URL params
          setPlaylist({
            id,
            name: decodeURIComponent(new URLSearchParams(window.location.search).get('name') || 'Playlist'),
            creator: decodeURIComponent(new URLSearchParams(window.location.search).get('creator') || 'Unknown'),
            cover: highQualitySongs[0]?.thumbnail || '',
            songCount: highQualitySongs.length
          });
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlaylistData();
    }
  }, [id]);

  // Preload images for smooth transitions
  useEffect(() => {
    songs.forEach(song => {
      if (song.thumbnail) {
        const img = new Image();
        img.src = song.thumbnail;
      }
    });
  }, [songs]);

  // Cleanup scramble intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(scrambleIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  const handlePlaySong = async (index) => {
    console.log('handlePlaySong called with index:', index, 'playlist:', id);

    // Use the playback webview for persistent playback
    const result = await playSongInPlayback(id, index);
    console.log('playSongInPlayback result:', result);

    // Song will play in player bar - user can open Now Playing manually if desired
  };

  const handlePlayAll = async () => {
    if (songs.length > 0) {
      await handlePlaySong(0);
    }
  };

  const handleSongHover = (song, index) => {
    if (song && song.thumbnail) {
      setHoveredSong(index);
      setBackgroundImage(song.thumbnail);

      // Scramble text effect
      const titleElement = document.querySelector(`[data-song-index="${index}"] .song-title`);
      const artistElement = document.querySelector(`[data-song-index="${index}"] .col-artist`);

      if (titleElement && song.title) {
        // Clear any existing interval
        if (scrambleIntervals.current[`title-${index}`]) {
          clearInterval(scrambleIntervals.current[`title-${index}`]);
        }
        scrambleIntervals.current[`title-${index}`] = scrambleText(titleElement, song.title, 600);
      }

      if (artistElement && song.artist) {
        // Clear any existing interval
        if (scrambleIntervals.current[`artist-${index}`]) {
          clearInterval(scrambleIntervals.current[`artist-${index}`]);
        }
        scrambleIntervals.current[`artist-${index}`] = scrambleText(artistElement, song.artist, 600);
      }
    }
  };

  const handleSongLeave = () => {
    setHoveredSong(null);
    setBackgroundImage('');
  };

  if (loading) {
    return (
      <div className="playlist-view loading">
        <div className="loading-spinner">🎵</div>
        <p>Loading playlist...</p>
      </div>
    );
  }

  if (!playlist || songs.length === 0) {
    return (
      <div className="playlist-view empty">
        <p>No songs found in this playlist</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="playlist-view">
      {/* Dynamic Background */}
      <div
        className="playlist-background"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          opacity: backgroundImage ? 1 : 0
        }}
      />

      {/* Header */}
      <div className="playlist-header">
        <div className="playlist-info-section">
          <div className="playlist-cover-large">
            {playlist.cover ? (
              <img src={playlist.cover} alt={playlist.name} />
            ) : (
              <div className="cover-placeholder">
                <FiPlay size={48} />
              </div>
            )}
          </div>

          <div className="playlist-details">
            <span className="playlist-type-label">PLAYLIST</span>
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">
              <span className="playlist-creator">{playlist.creator}</span>
              <span className="dot">•</span>
              <span className="playlist-song-count">{playlist.songCount} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="playlist-actions">
        <button className="play-all-button" onClick={handlePlayAll}>
          <FiPlay size={20} />
          <span>Play All</span>
        </button>
      </div>

      {/* Songs Table */}
      <div className="songs-table">
        <div className="table-header">
          <div className="col-index">#</div>
          <div className="col-title">TITLE</div>
          <div className="col-artist">ARTIST</div>
          <div className="col-duration">
            <FiClock size={16} />
          </div>
        </div>

        <div className="table-body">
          {songs.map((song, index) => (
            <div
              key={index}
              data-song-index={index}
              className={`song-row ${hoveredSong === index ? 'hovered' : ''} ${hoveredSong !== null && hoveredSong !== index ? 'faded' : ''}`}
              onClick={() => handlePlaySong(index)}
              onMouseEnter={() => handleSongHover(song, index)}
              onMouseLeave={handleSongLeave}
            >
              <div className="col-index">
                <span className="track-number">{index + 1}</span>
                <FiPlay className="play-icon" size={16} />
              </div>

              <div className="col-title">
                <div className="song-thumbnail">
                  {song.thumbnail ? (
                    <img src={song.thumbnail} alt={song.title} />
                  ) : (
                    <div className="thumb-placeholder">🎵</div>
                  )}
                </div>
                <span className="song-title">{song.title}</span>
              </div>

              <div className="col-artist">{song.artist}</div>
              <div className="col-duration">{song.duration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
